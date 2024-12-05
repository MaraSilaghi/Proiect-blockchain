// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract FundraisingDAO {
    mapping(address => uint256) public donations;
    address public admin;

    event DonationReceived(address indexed donor, uint256 amount);
    event FundsDistributed(uint256 totalDistributed);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    constructor() {
        admin = msg.sender; // Set admin as the deployer
    }

    function donate() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        donations[msg.sender] += msg.value;
        emit DonationReceived(msg.sender, msg.value);
    }

    function getTotalFunds() external view returns (uint256) {
        return address(this).balance;
    }

    function distributeFunds(address payable recipient, uint256 amount) external onlyAdmin {
        require(address(this).balance >= amount, "Insufficient balance");
        recipient.transfer(amount);
        emit FundsDistributed(amount);
    }

    function pureExample(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }
}
