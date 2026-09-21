// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Token {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IScopePolicyRegistry {
    struct Policy {
        address owner;
        address agent;
        address[] allowedTargets;
        address[] allowedAssets;
        address[] allowedRecipients;
        uint256 maxPerAction;
        uint256 dailyLimit;
        uint256 validAfter;
        uint256 validUntil;
        bytes32 policyHash;
        bool active;
    }

    function getPolicy(bytes32 policyHash) external view returns (Policy memory);
    function getActivePolicyForAgent(address agent) external view returns (Policy memory);
    function isTargetAllowed(bytes32 policyHash, address target) external view returns (bool);
    function isAssetAllowed(bytes32 policyHash, address asset) external view returns (bool);
    function isRecipientAllowed(bytes32 policyHash, address recipient) external view returns (bool);
}

/**
 * @title ScopeExecutor
 * @notice The onchain execution firewall for autonomous agents.
 * @dev Enforces economic boundaries, signature validation, preconditions, and atomic postconditions.
 */
contract ScopeExecutor {
    // EIP-712 Typehashes
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant EXECUTION_REQUEST_TYPEHASH = keccak256(
        "ExecutionRequest(address agent,address target,address asset,address recipient,uint256 value,bytes callData,uint256 nonce,uint256 deadline,uint8 postconditionType,address postconditionToken,uint256 postconditionValue)"
    );

    enum PostconditionType {
        NONE,
        MIN_TOKEN_RECEIVED,
        MAX_TOKEN_SPENT
    }

    struct ExecutionRequest {
        address agent;
        address target;
        address asset;
        address recipient;
        uint256 value;
        bytes callData;
        uint256 nonce;
        uint256 deadline;
        uint8 postconditionType;
        address postconditionToken;
        uint256 postconditionValue;
    }

    IScopePolicyRegistry public immutable registry;
    bytes32 public immutable DOMAIN_SEPARATOR;

    // agent => nonce => used
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    
    // policyHash => dayEpoch (timestamp / 86400) => amountSpent
    mapping(bytes32 => mapping(uint256 => uint256)) public dailySpent;

    // Events
    event ExecutionApproved(
        bytes32 indexed executionId,
        address indexed agent,
        bytes32 indexed policyHash,
        address target,
        address recipient,
        uint256 value
    );
    event ExecutionCompleted(
        bytes32 indexed executionId,
        address indexed agent,
        address target,
        uint256 value,
        bytes returnData
    );
    event ExecutionBlocked(
        bytes32 indexed executionId,
        address indexed agent,
        string violationReason
    );

    // Custom Errors
    error InvalidSignature();
    error NonceAlreadyUsed(uint256 nonce);
    error DeadlineExpired(uint256 deadline, uint256 currentTimestamp);
    error PolicyInactiveOrNotFound();
    error PolicyTimeWindowViolation(uint256 currentTimestamp, uint256 validAfter, uint256 validUntil);
    error TargetNotAllowed(address target);
    error AssetNotAllowed(address asset);
    error RecipientNotAllowed(address recipient);
    error ActionLimitExceeded(uint256 requested, uint256 maxPerAction);
    error DailyLimitExceeded(uint256 requested, uint256 dailyLimit, uint256 currentSpent);
    error TargetExecutionFailed(bytes reason);
    error OutcomePostconditionFailed(uint256 actualAmount, uint256 expectedThreshold);

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IScopePolicyRegistry(_registry);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("ScopeExecutor")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Computes EIP-712 execution hash for signing.
     */
    function hashExecutionRequest(ExecutionRequest calldata req) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTION_REQUEST_TYPEHASH,
                req.agent,
                req.target,
                req.asset,
                req.recipient,
                req.value,
                keccak256(req.callData),
                req.nonce,
                req.deadline,
                req.postconditionType,
                req.postconditionToken,
                req.postconditionValue
            )
        );

        return keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
    }

    /**
     * @notice Main entrypoint: validates agent request against economic policy,
     * executes call atomically, and verifies outcome constraints.
     */
    function execute(
        ExecutionRequest calldata req,
        bytes calldata signature
    ) external returns (bytes memory) {
        bytes32 executionId = hashExecutionRequest(req);

        // 1. Signature Verification
        if (req.agent == address(0)) revert InvalidSignature();
        address signer = recoverSigner(executionId, signature);
        if (signer != req.agent) {
            revert InvalidSignature();
        }

        // 2. Replay Protection: Nonce & Deadline
        if (usedNonces[req.agent][req.nonce]) {
            revert NonceAlreadyUsed(req.nonce);
        }
        if (block.timestamp > req.deadline) {
            revert DeadlineExpired(req.deadline, block.timestamp);
        }
        usedNonces[req.agent][req.nonce] = true;

        // 3. Load Active Policy
        IScopePolicyRegistry.Policy memory policy = registry.getActivePolicyForAgent(req.agent);
        if (!policy.active || policy.owner == address(0)) {
            revert PolicyInactiveOrNotFound();
        }

        // 4. Time Window Check
        if (block.timestamp < policy.validAfter || block.timestamp > policy.validUntil) {
            revert PolicyTimeWindowViolation(block.timestamp, policy.validAfter, policy.validUntil);
        }

        // 5. Target Contract Whitelist
        if (!registry.isTargetAllowed(policy.policyHash, req.target)) {
            revert TargetNotAllowed(req.target);
        }

        // 6. Asset Whitelist
        if (req.asset != address(0) && !registry.isAssetAllowed(policy.policyHash, req.asset)) {
            revert AssetNotAllowed(req.asset);
        }

        // 7. Recipient Whitelist
        if (req.recipient != address(0) && !registry.isRecipientAllowed(policy.policyHash, req.recipient)) {
            revert RecipientNotAllowed(req.recipient);
        }

        // 8. Amount Limit: Per Action
        if (req.value > policy.maxPerAction) {
            revert ActionLimitExceeded(req.value, policy.maxPerAction);
        }

        // 9. Daily Exposure Limit
        uint256 currentDay = block.timestamp / 86400;
        uint256 alreadySpentToday = dailySpent[policy.policyHash][currentDay];
        if (alreadySpentToday + req.value > policy.dailyLimit) {
            revert DailyLimitExceeded(req.value, policy.dailyLimit, alreadySpentToday);
        }
        dailySpent[policy.policyHash][currentDay] = alreadySpentToday + req.value;

        emit ExecutionApproved(executionId, req.agent, policy.policyHash, req.target, req.recipient, req.value);

        // 10. Record pre-execution balance state if outcome postcondition is configured
        uint256 balanceBefore = 0;
        if (req.postconditionType == uint8(PostconditionType.MIN_TOKEN_RECEIVED) && req.postconditionToken != address(0)) {
            balanceBefore = IERC20Token(req.postconditionToken).balanceOf(req.agent);
        }

        // 11. Atomic Execution: Transfer token funds to target or recipient if applicable
        if (req.value > 0 && req.asset != address(0)) {
            // Transfer tokens from agent (who approved ScopeExecutor) to recipient or target
            address destination = req.recipient != address(0) ? req.recipient : req.target;
            bool funded = IERC20Token(req.asset).transferFrom(req.agent, destination, req.value);
            require(funded, "SCOPE: asset funding transfer failed");
        }

        // Call target contract if calldata exists
        bytes memory returnData = "";
        if (req.callData.length > 0) {
            (bool success, bytes memory result) = req.target.call(req.callData);
            if (!success) {
                revert TargetExecutionFailed(result);
            }
            returnData = result;
        }

        // 12. Postcondition Verification (e.g. MIN_TOKEN_RECEIVED)
        if (req.postconditionType == uint8(PostconditionType.MIN_TOKEN_RECEIVED) && req.postconditionToken != address(0)) {
            uint256 balanceAfter = IERC20Token(req.postconditionToken).balanceOf(req.agent);
            uint256 received = balanceAfter >= balanceBefore ? (balanceAfter - balanceBefore) : 0;
            if (received < req.postconditionValue) {
                revert OutcomePostconditionFailed(received, req.postconditionValue);
            }
        }

        emit ExecutionCompleted(executionId, req.agent, req.target, req.value, returnData);
        return returnData;
    }

    /**
     * @notice Helper to recover signer from EIP-712 hash and signature.
     */
    function recoverSigner(bytes32 hash, bytes calldata signature) public pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) return address(0);

        return ecrecover(hash, v, r, s);
    }

    /**
     * @notice View helper to check today's spent amount for a policy.
     */
    function getTodaySpent(bytes32 policyHash) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 86400;
        return dailySpent[policyHash][currentDay];
    }
}
