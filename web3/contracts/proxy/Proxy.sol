// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ProxyForUpgradeable} from "@thirdweb-dev/contracts/extension/ProxyForUpgradeable.sol";

contract Proxy is ProxyForUpgradeable {
    constructor(address _logic, bytes memory _data) ProxyForUpgradeable(_logic, _data) {}
}
