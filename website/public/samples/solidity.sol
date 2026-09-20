// Showcase: Solidity — ERC-20 with access control.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Highlight token ledger
/// @notice Minimal ERC-20-style ledger for demo purposes.
contract HighlightToken is Ownable {
    string public constant name = "Highlight";
    string public constant symbol = "HL";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientBalance(uint256 have, uint256 want);
    error ZeroAddress();

    modifier noZero(address a) {
        if (a == address(0)) revert ZeroAddress();
        _;
    }

    constructor(uint256 initial) Ownable(msg.sender) {
        totalSupply = initial;
        balanceOf[msg.sender] = initial;
        emit Transfer(address(0), msg.sender, initial);
    }

    function transfer(address to, uint256 value) external noZero(to) returns (bool) {
        if (balanceOf[msg.sender] < value) {
            revert InsufficientBalance(balanceOf[msg.sender], value);
        }
        unchecked {
            balanceOf[msg.sender] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyOwner noZero(to) {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}
