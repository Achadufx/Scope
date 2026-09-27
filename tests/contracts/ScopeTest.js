const { expect } = require("chai");
const hre = require("hardhat");
const { parseUnits, keccak256, toHex, encodePacked, encodeAbiParameters, parseAbiParameters } = require("viem");

describe("SCOPE Smart Contract Suite", function () {
  let publicClient;
  let ownerWallet, agentWallet, attackerWallet, supplierWallet;
  let mockUSDC, registry, executor, safeMerchant, maliciousMerchant;
  let policyHash;

  const MAX_PER_ACTION = parseUnits("500", 6); // $500 USDC
  const DAILY_LIMIT = parseUnits("2000", 6);    // $2,000 USDC

  before(async function () {
    const clients = await hre.viem.getWalletClients();
    ownerWallet = clients[0];
    agentWallet = clients[1];
    attackerWallet = clients[2];
    supplierWallet = clients[3];
    publicClient = await hre.viem.getPublicClient();

    // 1. Deploy MockUSDC
    mockUSDC = await hre.viem.deployContract("MockUSDC", [parseUnits("1000000", 6)]);

    // 2. Deploy ScopePolicyRegistry
    registry = await hre.viem.deployContract("ScopePolicyRegistry");

    // 3. Deploy ScopeExecutor
    executor = await hre.viem.deployContract("ScopeExecutor", [registry.address]);

    // 4. Deploy SafeMerchant (Acme Components)
    safeMerchant = await hre.viem.deployContract("SafeMerchant", [
      "Acme Components",
      supplierWallet.account.address,
    ]);

    // 5. Deploy MaliciousMerchant (Phishing Clone)
    maliciousMerchant = await hre.viem.deployContract("MaliciousMerchant", [
      attackerWallet.account.address,
    ]);

    // Mint USDC to agent & approve Executor
    await mockUSDC.write.faucet([agentWallet.account.address, parseUnits("10000", 6)]);
    
    // Agent approves executor to handle up to allowed amounts
    const agentUsdc = await hre.viem.getContractAt("MockUSDC", mockUSDC.address, {
      client: { wallet: agentWallet },
    });
    await agentUsdc.write.approve([executor.address, parseUnits("10000", 6)]);

    // Register Policy for Agent
    const validAfter = BigInt(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago
    const validUntil = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400); // 7 days from now

    const tx = await registry.write.createPolicy([
      agentWallet.account.address,
      [safeMerchant.address], // allowed targets
      [mockUSDC.address],     // allowed assets
      [supplierWallet.account.address, safeMerchant.address], // allowed recipients
      MAX_PER_ACTION,
      DAILY_LIMIT,
      validAfter,
      validUntil,
    ]);

    policyHash = await registry.read.agentActivePolicy([agentWallet.account.address]);
  });

  async function signExecutionRequest(req, wallet) {
    const domain = {
      name: "ScopeExecutor",
      version: "1",
      chainId: 31337,
      verifyingContract: executor.address,
    };

    const types = {
      ExecutionRequest: [
        { name: "agent", type: "address" },
        { name: "target", type: "address" },
        { name: "asset", type: "address" },
        { name: "recipient", type: "address" },
        { name: "value", type: "uint256" },
        { name: "callData", type: "bytes" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "postconditionType", type: "uint8" },
        { name: "postconditionToken", type: "address" },
        { name: "postconditionValue", type: "uint256" },
      ],
    };

    const signature = await wallet.signTypedData({
      domain,
      types,
      primaryType: "ExecutionRequest",
      message: req,
    });

    return signature;
  }

  it("1. Legitimate Transaction: Atlas → Acme Components ($480 USDC) executes successfully", async function () {
    const amount = parseUnits("480", 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = 1n;

    const req = {
      agent: agentWallet.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: amount,
      callData: "0x",
      nonce,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };

    const sig = await signExecutionRequest(req, agentWallet);
    const balanceBefore = await mockUSDC.read.balanceOf([supplierWallet.account.address]);

    const tx = await executor.write.execute([req, sig]);
    expect(tx).to.be.ok;

    const balanceAfter = await mockUSDC.read.balanceOf([supplierWallet.account.address]);
    expect(balanceAfter - balanceBefore).to.equal(amount);
  });

  it("2. Compromised Supplier Attack: Atlas → Attacker Wallet ($480 USDC) is blocked onchain", async function () {
    const amount = parseUnits("480", 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = 2n;

    const req = {
      agent: agentWallet.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: attackerWallet.account.address, // Unauthorized Recipient!
      value: amount,
      callData: "0x",
      nonce,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };

    const sig = await signExecutionRequest(req, agentWallet);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("RecipientNotAllowed");
    }
    expect(failed).to.be.true;
  });

  it("3. Action Limit Bypass Attack: $700 against $500 max is blocked onchain", async function () {
    const amount = parseUnits("700", 6); // Exceeds $500 limit
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = 3n;

    const req = {
      agent: agentWallet.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: amount,
      callData: "0x",
      nonce,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };

    const sig = await signExecutionRequest(req, agentWallet);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("ActionLimitExceeded");
    }
    expect(failed).to.be.true;
  });

  it("4. Unauthorized Target Contract Attack: is blocked onchain", async function () {
    const amount = parseUnits("300", 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = 4n;

    const req = {
      agent: agentWallet.account.address,
      target: maliciousMerchant.address, // Unauthorized Target!
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: amount,
      callData: "0x",
      nonce,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };

    const sig = await signExecutionRequest(req, agentWallet);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("TargetNotAllowed");
    }
    expect(failed).to.be.true;
  });

  it("5. Replay Protection: Re-using the same nonce reverts with NonceAlreadyUsed", async function () {
    const amount = parseUnits("100", 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = 5n;

    const req = {
      agent: agentWallet.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: amount,
      callData: "0x",
      nonce,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };

    const sig = await signExecutionRequest(req, agentWallet);
    await executor.write.execute([req, sig]);

    // Attempt second execution with same nonce
    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("NonceAlreadyUsed");
    }
    expect(failed).to.be.true;
  });

  it("6. Postcondition Enforcement: Minimum output token requirement reverts if unsatisfied", async function () {
    const amount = parseUnits("200", 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = 6n;

    // Suppose we require receiving 1000 units of mockUSDC back, but target returns 0
    const req = {
      agent: agentWallet.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: amount,
      callData: "0x",
      nonce,
      deadline,
      postconditionType: 1, // MIN_TOKEN_RECEIVED
      postconditionToken: mockUSDC.address,
      postconditionValue: parseUnits("1000", 6), // 1000 required, but 0 returned
    };

    const sig = await signExecutionRequest(req, agentWallet);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("OutcomePostconditionFailed");
    }
    expect(failed).to.be.true;
  });

  it("7. Unauthorized Agent: a request from an agent with no active policy reverts with UnauthorizedAgent", async function () {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const req = {
      agent: attackerWallet.account.address, // no policy registered for attacker
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: parseUnits("10", 6),
      callData: "0x",
      nonce: 101n,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };
    const sig = await signExecutionRequest(req, attackerWallet);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("UnauthorizedAgent");
    }
    expect(failed).to.be.true;
  });

  it("8. Deadline Expired: a request past its deadline reverts with DeadlineExpired", async function () {
    const deadline = BigInt(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago
    const req = {
      agent: agentWallet.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: parseUnits("50", 6),
      callData: "0x",
      nonce: 102n,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };
    const sig = await signExecutionRequest(req, agentWallet);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("DeadlineExpired");
    }
    expect(failed).to.be.true;
  });

  it("9. Deny-by-default Recipients: an empty recipient allowlist blocks all recipients", async function () {
    const clients = await hre.viem.getWalletClients();
    const restrictedAgent = clients[4];
    const validAfter = BigInt(Math.floor(Date.now() / 1000) - 3600);
    const validUntil = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);

    await registry.write.createPolicy([
      restrictedAgent.account.address,
      [safeMerchant.address], // targets
      [mockUSDC.address], // assets
      [], // EMPTY recipients -> deny-by-default
      MAX_PER_ACTION,
      DAILY_LIMIT,
      validAfter,
      validUntil,
    ]);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const req = {
      agent: restrictedAgent.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: parseUnits("50", 6),
      callData: "0x",
      nonce: 1n,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };
    const sig = await signExecutionRequest(req, restrictedAgent);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("RecipientNotAllowed");
    }
    expect(failed).to.be.true;
  });

  it("10. MAX_TOKEN_SPENT Postcondition: spending beyond the cap reverts atomically", async function () {
    const value = parseUnits("200", 6);
    const maxSpend = parseUnits("100", 6); // actual spend (200) exceeds this cap
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const req = {
      agent: agentWallet.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value,
      callData: "0x",
      nonce: 103n,
      deadline,
      postconditionType: 2, // MAX_TOKEN_SPENT
      postconditionToken: mockUSDC.address,
      postconditionValue: maxSpend,
    };
    const sig = await signExecutionRequest(req, agentWallet);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("OutcomePostconditionFailed");
    }
    expect(failed).to.be.true;
  });

  it("11. Daily Limit: cumulative spend beyond the daily ceiling reverts with DailyLimitExceeded", async function () {
    const clients = await hre.viem.getWalletClients();
    const dailyAgent = clients[5];
    const validAfter = BigInt(Math.floor(Date.now() / 1000) - 3600);
    const validUntil = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);
    const lowDaily = parseUnits("300", 6);

    // Fund + approve so the request fails on the daily-limit check, not on transfer.
    await mockUSDC.write.faucet([dailyAgent.account.address, parseUnits("5000", 6)]);
    const dailyUsdc = await hre.viem.getContractAt("MockUSDC", mockUSDC.address, {
      client: { wallet: dailyAgent },
    });
    await dailyUsdc.write.approve([executor.address, parseUnits("5000", 6)]);

    await registry.write.createPolicy([
      dailyAgent.account.address,
      [safeMerchant.address],
      [mockUSDC.address],
      [supplierWallet.account.address],
      MAX_PER_ACTION, // 500 per action
      lowDaily, // 300 daily ceiling
      validAfter,
      validUntil,
    ]);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const req = {
      agent: dailyAgent.account.address,
      target: safeMerchant.address,
      asset: mockUSDC.address,
      recipient: supplierWallet.account.address,
      value: parseUnits("400", 6), // under the 500 per-action cap, but over the 300 daily
      callData: "0x",
      nonce: 1n,
      deadline,
      postconditionType: 0,
      postconditionToken: "0x0000000000000000000000000000000000000000",
      postconditionValue: 0n,
    };
    const sig = await signExecutionRequest(req, dailyAgent);

    let failed = false;
    try {
      await executor.write.execute([req, sig]);
    } catch (err) {
      failed = true;
      expect(err.message).to.include("DailyLimitExceeded");
    }
    expect(failed).to.be.true;
  });
});
