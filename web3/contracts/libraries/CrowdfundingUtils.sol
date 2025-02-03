// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

library CrowdfundingUtils {
    // Helper functions
    function calculateDonatorShare(
        uint256 _amountDonated,
        uint256 _amountCollected
    ) internal pure returns (uint256) {
        require(_amountCollected > 0, "No amount collected.");
        return (_amountDonated * 100) / _amountCollected;
    }

    function calculateRemainingAmountToRaise(
        uint256 _target,
        uint256 _amountCollected
    ) internal pure returns (uint256) {
        if (_amountCollected >= _target) {
            return 0;
        }
        return _target - _amountCollected;
    }

    // Validation functions
    function isCampaignActive(uint256 _deadline) internal view returns (bool) {
        return block.timestamp < _deadline;
    }

    function validateWithdrawalLimit(
        uint256 currentAmount,
        uint256 amountToWithdraw,
        uint256 limitPercentage
    ) internal pure {
        uint256 maxAllowed = calculatePercentage(
            currentAmount,
            limitPercentage
        );
        require(
            amountToWithdraw <= maxAllowed,
            "Amount exceeds the maximum allowed withdrawal."
        );
    }

    // Calculation functions
    function calculatePercentage(
        uint256 amount,
        uint256 percentage
    ) internal pure returns (uint256) {
        require(percentage <= 100, "Percentage cannot be more than 100");
        return (amount * percentage) / 100;
    }
}
