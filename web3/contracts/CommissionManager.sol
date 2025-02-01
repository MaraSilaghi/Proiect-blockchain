// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./ICommissionManager.sol";
import "./libraries/CrowdfundingUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CommissionManager is ICommissionManager, Ownable, ReentrancyGuard {
    uint256 public commissionPercentage = 1;
    uint256 public currentContractAmount;
    uint256 public totalCollectedAmountEver;

    uint256 public lastWithdrawalTimestamp;
    uint256 public withdrawalCooldown = 1 weeks; // Admin can withdraw at most once a week
    uint256 public withdrawalLimitPercentage = 50; // Admin can withdraw up to 50% of current accumulated commissions at a time

    constructor() Ownable(msg.sender) {
        currentContractAmount = 0;
        totalCollectedAmountEver = 0;
        lastWithdrawalTimestamp = block.timestamp - withdrawalCooldown;
    }

    modifier canWithdraw() {
        require(
            block.timestamp >= lastWithdrawalTimestamp + withdrawalCooldown,
            "Cooldown period not passed."
        );
        _;
    }

    function accumulate(uint256 _amount) external payable override {
        currentContractAmount += _amount;
        totalCollectedAmountEver += _amount;
        emit CommissionReceived(msg.sender, _amount);
    }

    function withdrawAmount(
        address payable _to,
        uint256 _amount
    ) public override onlyOwner canWithdraw nonReentrant {
        require(currentContractAmount > 0, "No commissions to withdraw.");
        CrowdfundingUtils.validateWithdrawalLimit(
            currentContractAmount,
            _amount,
            withdrawalLimitPercentage
        );
        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "Withdrawal failed.");
        lastWithdrawalTimestamp = block.timestamp;
        emit CommissionWithdrawn(_to, _amount);
    }

    function withdrawAll(
        address payable _to
    ) public override onlyOwner canWithdraw nonReentrant {
        require(currentContractAmount > 0, "No commissions to withdraw.");
        uint256 maxAllowed = getMaximumWithdrawalAmountAllowed();
        (bool sent, ) = _to.call{value: maxAllowed}("");
        require(sent, "Withdrawal failed.");
        lastWithdrawalTimestamp = block.timestamp;
        emit CommissionWithdrawn(_to, maxAllowed);
    }

    function getCurrentTotalAccumulated()
        external
        view
        override
        returns (uint256)
    {
        return currentContractAmount;
    }

    function getTotalAccumulatedEver()
        external
        view
        override
        returns (uint256)
    {
        return totalCollectedAmountEver;
    }

    function getTotalAmountWithdrawn()
        external
        view
        override
        returns (uint256)
    {
        return totalCollectedAmountEver - currentContractAmount;
    }

    function getCommissionPercentage()
        external
        view
        override
        returns (uint256)
    {
        return commissionPercentage;
    }

    function getMaximumWithdrawalAmountAllowed() public view returns (uint256) {
        return
            CrowdfundingUtils.calculatePercentage(
                currentContractAmount,
                withdrawalLimitPercentage
            );
    }

    function getLastWithdrawalTimestamp() public view returns (uint256) {
        return lastWithdrawalTimestamp;
    }

    function getCooldownPeriod() public view returns (uint256) {
        return withdrawalCooldown;
    }

    function getWithdrawalLimitPercentage() public view returns (uint256) {
        return withdrawalLimitPercentage;
    }
}
