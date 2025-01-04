// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./CommissionManager.sol";

contract Crowdfunding {
    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        address[] donators;
        uint256[] donations;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public numberOfCampaigns = 0;

    CommissionManager public commissionManager;

    constructor(address payable _commissionManager) {
        commissionManager = CommissionManager(_commissionManager);
    }

    event CampaignCreated(uint256 id, address owner, string title);
    event DonationReceived(
        uint256 campaignId,
        address donator,
        uint256 amount,
        uint256 donatorShare
    );
    event RemainingAmountToRaise(uint256 campaignId, uint256 amount);
    event Withdrawal(uint256 campaignId, address owner, uint256 amount);

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _image
    ) public returns (uint256) {
        Campaign storage campaign = campaigns[numberOfCampaigns];

        require(
            _deadline > block.timestamp,
            "The deadline should be a date in the future."
        );

        campaign.owner = _owner;
        campaign.title = _title;
        campaign.description = _description;
        campaign.target = _target;
        campaign.deadline = _deadline;
        campaign.amountCollected = 0;
        campaign.image = _image;

        numberOfCampaigns++;
        emit CampaignCreated(numberOfCampaigns - 1, _owner, _title);
        return numberOfCampaigns - 1;
    }

    function donateToCampaign(uint256 _id) public payable {
        uint256 amount = msg.value;

        Campaign storage campaign = campaigns[_id];
        require(
            isCampaignActive(campaign.deadline),
            "Campaign is no longer active."
        );

        uint256 commission = amount / 100; // 1% comision
        uint256 remainingDonationAmount = amount - commission;

        campaign.amountCollected += remainingDonationAmount;

        campaign.donators.push(msg.sender);
        campaign.donations.push(remainingDonationAmount);

        uint256 donatorShare = calculateDonatorShare(
            remainingDonationAmount,
            campaign.amountCollected
        );

        (bool commissionSent, ) = payable(address(commissionManager)).call{
            value: commission
        }("");
        require(commissionSent, "Commission transfer failed.");

        emit DonationReceived(
            _id,
            msg.sender,
            remainingDonationAmount,
            donatorShare
        );
        emit RemainingAmountToRaise(
            _id,
            calculateRemainingAmountToRaise(
                campaign.target,
                campaign.amountCollected
            )
        );
    }

    function getDonators(
        uint256 _id
    ) public view returns (address[] memory, uint256[] memory) {
        return (campaigns[_id].donators, campaigns[_id].donations);
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](numberOfCampaigns);

        for (uint i = 0; i < numberOfCampaigns; i++) {
            Campaign storage item = campaigns[i];

            allCampaigns[i] = item;
        }

        return allCampaigns;
    }

    modifier onlyOwner(uint256 _id) {
        require(msg.sender == campaigns[_id].owner, "Not the campaign owner.");
        _;
    }

    function withdrawFunds(uint256 _id) public onlyOwner(_id) {
        Campaign storage campaign = campaigns[_id];

        require(
            isCampaignActive(campaign.deadline) == false,
            "Funds can only be withdrawn if the campaign deadline has passed."
        );

        (bool sent, ) = payable(campaign.owner).call{
            value: campaign.amountCollected
        }("");

        if (sent) {
            campaign.amountCollected = 0;
            emit Withdrawal(_id, campaign.owner, campaign.amountCollected);
        }
    }

    function isCampaignActive(uint256 _deadline) public view returns (bool) {
        return block.timestamp < _deadline;
    }

    function calculateRemainingAmountToRaise(
        uint256 _target,
        uint256 _amountCollected
    ) public pure returns (uint256) {
        if (_amountCollected >= _target) {
            return 0;
        }
        return _target - _amountCollected;
    }

    function calculateDonatorShare(
        uint256 _amountDonated,
        uint256 _amountCollected
    ) public pure returns (uint256) {
        require(
            _amountCollected > 0,
            "Total amount collected for a campaign must be greater than zero."
        );
        return (_amountDonated * 100) / _amountCollected;
    }
}
