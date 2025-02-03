// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface ICommissionManager {
    event CommissionReceived(address indexed from, uint256 amount);
    event CommissionWithdrawn(address indexed to, uint256 amount);

    function accumulate(uint256 _amount) external payable;
    function withdrawAmount(address payable _to, uint256 _amount) external;
    function withdrawAll(address payable _to) external;
    function getCommissionPercentage() external view returns (uint256);
    function getCurrentTotalAccumulated() external view returns (uint256);
    function getTotalAccumulatedEver() external view returns (uint256);
    function getTotalAmountWithdrawn() external view returns (uint256);
}
