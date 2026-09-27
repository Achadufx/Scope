// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockUSDC
 * @notice Testnet & demo ERC-20 token representing Demo USDC with 6 decimals.
 * @dev Explicitly tagged as DEMO USDC for institutional clarity.
 */
contract MockUSDC {
    string public constant name = "Demo USD Coin";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event FaucetMinted(address indexed to, uint256 amount);

    constructor(uint256 initialSupply) {
        if (initialSupply > 0) {
            balanceOf[msg.sender] = initialSupply;
            totalSupply = initialSupply;
            emit Transfer(address(0), msg.sender, initialSupply);
        }
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(recipient != address(0), "ERC20: transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "ERC20: approve to zero address");
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(sender != address(0), "ERC20: transfer from zero");
        require(recipient != address(0), "ERC20: transfer to zero");
        require(balanceOf[sender] >= amount, "ERC20: insufficient balance");
        
        uint256 currentAllowance = allowance[sender][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            allowance[sender][msg.sender] = currentAllowance - amount;
        }

        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        require(to != address(0), "ERC20: mint to zero address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit FaucetMinted(to, amount);
    }

    function faucet(address to, uint256 amount) external {
        require(to != address(0), "ERC20: faucet to zero address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit FaucetMinted(to, amount);
    }

    /**
     * @notice DEMO-ONLY provisioning helper. Mints `amount` to `holder` and grants `spender`
     * a standing max allowance in a single call, so a gasless demo agent never needs ETH to
     * approve. Acceptable only because this is a throwaway demo token.
     */
    function demoProvision(address holder, address spender, uint256 amount) external {
        require(holder != address(0), "DEMO: holder is zero address");
        require(spender != address(0), "DEMO: spender is zero address");
        totalSupply += amount;
        balanceOf[holder] += amount;
        allowance[holder][spender] = type(uint256).max;
        emit Transfer(address(0), holder, amount);
        emit FaucetMinted(holder, amount);
        emit Approval(holder, spender, type(uint256).max);
    }
}
