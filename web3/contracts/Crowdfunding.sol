// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@thirdweb-dev/contracts/extension/Initializable.sol";
import "@thirdweb-dev/contracts/extension/Upgradeable.sol";
import "@thirdweb-dev/contracts/extension/Ownable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./libraries/CrowdfundingUtils.sol";
import "./CommissionManager.sol";

contract Crowdfunding is Initializable, Upgradeable, Ownable {
    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 targetInUSD;
        uint256 deadline;
        uint256 amountCollected;
        string imageIPFSHash;
        address[] donators;
        uint256[] donations;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public numberOfCampaigns;

    ICommissionManager public commissionManager;
    address public priceFeedAddress;

    event CampaignCreated(uint256 id, address owner, string title);
    event CampaignEdited(uint256 id, string newTitle, string newDescription);
    event DonationReceived(
        uint256 campaignId,
        address donator,
        uint256 amount,
        uint256 donatorShare
    );
    event RemainingAmountToRaise(uint256 campaignId, uint256 amount);
    event Withdrawal(uint256 campaignId, address owner, uint256 amount);

    modifier onlyOwnerOfCampaign(uint256 _id) {
        require(msg.sender == campaigns[_id].owner, "Not the campaign owner.");
        _;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function _canSetOwner() internal view virtual override returns (bool) {
        return msg.sender == owner() || owner() == address(0);
    }

    function initialize(
        address payable _commissionManager,
        address _priceFeedAddress
    ) public initializer {
        _setupOwner(msg.sender);
        commissionManager = ICommissionManager(_commissionManager);
        priceFeedAddress = _priceFeedAddress;
        numberOfCampaigns = 0;
    }

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _targetInUSD,
        uint256 _deadline,
        string memory _imageIPFSHash
    ) public returns (uint256) {
        require(_deadline > block.timestamp, "Deadline must be in the future.");

        Campaign storage campaign = campaigns[numberOfCampaigns];
        campaign.owner = _owner;
        campaign.title = _title;
        campaign.description = _description;
        campaign.targetInUSD = _targetInUSD;
        campaign.deadline = _deadline;
        campaign.amountCollected = 0;
        campaign.imageIPFSHash = _imageIPFSHash;

        numberOfCampaigns++;
        emit CampaignCreated(numberOfCampaigns - 1, _owner, _title);
        return numberOfCampaigns - 1;
    }

    function editCampaign(
        uint256 _id,
        string memory _newTitle,
        string memory _newDescription
    ) public onlyOwnerOfCampaign(_id) {
        Campaign storage campaign = campaigns[_id];
        require(
            CrowdfundingUtils.isCampaignActive(campaign.deadline),
            "Campaign is no longer active."
        );
        campaign.title = _newTitle;
        campaign.description = _newDescription;

        emit CampaignEdited(_id, _newTitle, _newDescription);
    }

    function donateToCampaign(uint256 _id) public payable {
        Campaign storage campaign = campaigns[_id];
        require(
            CrowdfundingUtils.isCampaignActive(campaign.deadline),
            "Campaign is no longer active."
        );
        require(
            campaign.amountCollected < convertUSDtoWEI(campaign.targetInUSD),
            "Campaign target already reached."
        );

        uint256 amount = msg.value;
        uint256 commission = CrowdfundingUtils.calculatePercentage(
            amount,
            commissionManager.getCommissionPercentage()
        );
        uint256 remainingDonationAmount = amount - commission;

        campaign.amountCollected += remainingDonationAmount;
        commissionManager.accumulate{value: commission}(commission);

        campaign.donators.push(msg.sender);
        campaign.donations.push(remainingDonationAmount);

        uint256 donatorShare = CrowdfundingUtils.calculateDonatorShare(
            remainingDonationAmount,
            campaign.amountCollected
        );
        emit DonationReceived(
            _id,
            msg.sender,
            remainingDonationAmount,
            donatorShare
        );
        emit RemainingAmountToRaise(
            _id,
            CrowdfundingUtils.calculateRemainingAmountToRaise(
                convertUSDtoWEI(campaign.targetInUSD),
                campaign.amountCollected
            )
        );
    }

    function withdrawFunds(uint256 _id) public onlyOwnerOfCampaign(_id) {
        Campaign storage campaign = campaigns[_id];
        require(
            CrowdfundingUtils.isCampaignActive(campaign.deadline) == false,
            "Campaign is still active."
        );

        uint256 amount = campaign.amountCollected;
        campaign.amountCollected = 0;

        (bool sent, ) = payable(campaign.owner).call{value: amount}("");
        require(sent, "Withdrawal failed.");

        emit Withdrawal(_id, campaign.owner, amount);
    }

    function getDonatorsOfCampaign(
        uint256 _id
    ) public view returns (address[] memory, uint256[] memory) {
        return (campaigns[_id].donators, campaigns[_id].donations);
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](numberOfCampaigns);
        for (uint i = 0; i < numberOfCampaigns; i++) {
            allCampaigns[i] = campaigns[i];
        }
        return allCampaigns;
    }

    function convertUSDtoWEI(uint256 _usdAmount) public view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            priceFeedAddress
        );
        (, int256 ethPrice, , , ) = priceFeed.latestRoundData();
        require(ethPrice > 0, "Invalid ETH price");

        uint256 ethPriceScaled = uint256(ethPrice);
        uint256 weiAmount = (_usdAmount * 1e18 * 10 ** 8) / ethPriceScaled;

        return weiAmount;
    }

    function getPriceFeedAddress() public view returns (address) {
        return priceFeedAddress;
    }

    function testConversion(uint256 usdAmount) public view returns (uint256) {
        return convertUSDtoWEI(usdAmount);
    }
}
