// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract CommissionManager {
    address public admin;
    uint256 public totalCollected;

    event CommissionReceived(address from, uint256 amount);
    event CommissionWithdrawn(address to, uint256 amount);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action.");
        _;
    }

    receive() external payable {
        totalCollected += msg.value;
        emit CommissionReceived(msg.sender, msg.value);
    }

    function withdrawCommissions(
        address payable _to,
        uint256 _amount
    ) public onlyAdmin {
        require(_amount <= totalCollected, "Not enough funds.");
        totalCollected -= _amount;
        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "Withdrawal failed.");
        emit CommissionWithdrawn(_to, _amount);
    }
}
