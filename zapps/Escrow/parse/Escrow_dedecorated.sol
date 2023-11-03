// SPDX-License-Identifier: CC0

// TARGET CONTRACT FOR PHASE 2 OF DEVELOPMENT:

pragma solidity ^0.8.0;

import "./Escrow-imports/IERC20.sol";

contract Escrow {

mapping(address => uint256) public balances;
IERC20 public erc20;

constructor(address _erc20) {
erc20 = IERC20(_erc20);
}

function deposit(uint256 amount) public {
bool hasBalance = erc20.transferFrom(msg.sender, address(this), amount);
require(hasBalance == true);
balances[msg.sender] += amount;
}

function transfer(address recipient, uint256 amount) public {
balances[msg.sender] -= amount;
balances[recipient] += amount;
}

function withdraw(uint256 amount) public {
bool success = erc20.transfer(msg.sender, amount);
require(success, "ERC20 transfer failed");
balances[msg.sender] -= amount;
}
}
