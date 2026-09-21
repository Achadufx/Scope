// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SafeMerchant
 * @notice Approved commercial procurement router (Acme Components / Northstar Supplies).
 * @dev Validates orders, settles payment in allowed assets, and fulfills orders.
 */
contract SafeMerchant {
    string public merchantName;
    address public treasury;
    uint256 public orderCount;

    struct Order {
        uint256 orderId;
        address buyer;
        address asset;
        uint256 amount;
        string itemSku;
        uint256 timestamp;
        bool fulfilled;
    }

    mapping(uint256 => Order) public orders;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed asset,
        uint256 amount,
        string itemSku
    );
    event OrderFulfilled(uint256 indexed orderId);

    constructor(string memory _name, address _treasury) {
        merchantName = _name;
        treasury = _treasury == address(0) ? msg.sender : _treasury;
    }

    /**
     * @notice Procurement action called by ScopeExecutor or directly by authorized agent.
     */
    function processProcurement(
        address asset,
        uint256 amount,
        string calldata itemSku
    ) external returns (uint256 orderId) {
        require(amount > 0, "Amount must be > 0");

        // Pull payment from sender (ScopeExecutor holds or forwards funds)
        bool success = IERC20(asset).transferFrom(msg.sender, treasury, amount);
        require(success, "Payment failed");

        orderCount++;
        orderId = orderCount;

        orders[orderId] = Order({
            orderId: orderId,
            buyer: msg.sender,
            asset: asset,
            amount: amount,
            itemSku: itemSku,
            timestamp: block.timestamp,
            fulfilled: true
        });

        emit OrderCreated(orderId, msg.sender, asset, amount, itemSku);
        emit OrderFulfilled(orderId);

        return orderId;
    }

    /**
     * @notice Swap / fulfillment simulating asset exchange with minimum output guarantee.
     * E.g. paying USDC and receiving receipt or fulfillment asset.
     */
    function executeSwap(
        address inAsset,
        uint256 inAmount,
        address outAsset,
        uint256 outAmount
    ) external returns (bool) {
        require(IERC20(inAsset).transferFrom(msg.sender, address(this), inAmount), "In-transfer failed");
        if (outAmount > 0 && outAsset != address(0)) {
            require(IERC20(outAsset).balanceOf(address(this)) >= outAmount, "Insufficient merchant liquidity");
            require(IERC20(outAsset).transfer(msg.sender, outAmount), "Out-transfer failed");
        }
        return true;
    }

    // Support depositing test liquidity
    function fundMerchant(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
    }
}
