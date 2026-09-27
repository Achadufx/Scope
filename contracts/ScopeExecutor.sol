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
    function agentActivePolicy(address agent) external view returns (bytes32);
    function isTargetAllowed(bytes32 policyHash, address target) external view returns (bool);
    function isAssetAllowed(bytes32 policyHash, address asset) external view returns (bool);
    function isRecipientAllowed(bytes32 policyHash, address recipient) external view returns (bool);
}

/**
 * @title ScopeExecutor
 * @notice The onchain execution firewall for autonomous agents.
 * @dev Enforces economic boundaries, signature validation, preconditions, and atomic postconditions.
 *
 * SOLIDITY ERROR -> BACKEND DECISION CODE (authoritative; the offchain engine decodes by name):
 *   InvalidSignature()                          -> INVALID_SIGNATURE
 *   UnauthorizedAgent()                         -> UNAUTHORIZED_AGENT
 *   NonceAlreadyUsed(uint256)                   -> NONCE_USED
 *   DeadlineExpired(uint256,uint256)            -> DEADLINE_EXPIRED
 *   PolicyInactiveOrExpired()                   -> POLICY_EXPIRED_OR_OUTSIDE_WINDOW
 *   TargetNotAllowed(address)                   -> CONTRACT_NOT_ALLOWED
 *   AssetNotAllowed(address)                    -> ASSET_NOT_ALLOWED
 *   RecipientNotAllowed(address)                -> RECIPIENT_NOT_ALLOWED
 *   ActionLimitExceeded(uint256,uint256)        -> ACTION_LIMIT_EXCEEDED
 *   DailyLimitExceeded(uint256,uint256,uint256) -> DAILY_LIMIT_EXCEEDED
 *   OutcomePostconditionFailed(uint256,uint256) -> OUTCOME_VIOLATION
 *   TargetExecutionFailed(bytes)                -> EXECUTION_REVERTED
 */
contract ScopeExecutor {
    // EIP-712 Typehashes
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant EXECUTION_REQUEST_TYPEHASH = keccak256(
        "ExecutionRequest(address agent,address target,address asset,address recipient,uint256 value,bytes callData,uint256 nonce,uint256 deadline,uint8 postconditionType,address postconditionToken,uint256 postconditionValue)"
    );

    // secp256k1 group order / 2 (EIP-2 upper bound for a non-malleable s).
    uint256 private constant SECP256K1_HALF_N =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

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

    // Custom Errors (see decode table above)
    error InvalidSignature();
    error UnauthorizedAgent();
    error NonceAlreadyUsed(uint256 nonce);
    error DeadlineExpired(uint256 deadline, uint256 currentTimestamp);
    error PolicyInactiveOrExpired();
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
     * @notice Computes the EIP-712 execution digest that the agent signs.
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

        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    /**
     * @notice Main entrypoint. Validates an agent's signed request against its active economic
     * policy, executes atomically, and asserts outcome postconditions before completion.
     * Any violation reverts the entire transaction with a decodable custom error.
     */
    function execute(
        ExecutionRequest calldata req,
        bytes calldata signature
    ) external returns (bytes memory) {
        bytes32 executionId = hashExecutionRequest(req);

        // 1. Signature verification: the recovered signer must equal the declared agent.
        if (req.agent == address(0)) revert InvalidSignature();
        address signer = recoverSigner(executionId, signature);
        if (signer == address(0) || signer != req.agent) revert InvalidSignature();

        // 2. Replay protection: deadline, then single-use nonce.
        if (block.timestamp > req.deadline) revert DeadlineExpired(req.deadline, block.timestamp);
        if (usedNonces[req.agent][req.nonce]) revert NonceAlreadyUsed(req.nonce);
        usedNonces[req.agent][req.nonce] = true;

        // 3. Load the agent's active policy. No policy => the agent holds no delegated authority.
        //    getActivePolicyForAgent reverts when the agent has no active policy; treat that as
        //    an unauthorized agent rather than propagating the registry's internal error.
        IScopePolicyRegistry.Policy memory policy;
        try registry.getActivePolicyForAgent(req.agent) returns (IScopePolicyRegistry.Policy memory p) {
            policy = p;
        } catch {
            revert UnauthorizedAgent();
        }
        if (policy.owner == address(0) || policy.agent != req.agent) revert UnauthorizedAgent();
        if (!policy.active) revert PolicyInactiveOrExpired();

        // 4. Time window (validAfter / validUntil, incl. off-hours expiry).
        if (block.timestamp < policy.validAfter || block.timestamp > policy.validUntil) {
            revert PolicyInactiveOrExpired();
        }

        // 5. Target contract whitelist.
        if (!registry.isTargetAllowed(policy.policyHash, req.target)) {
            revert TargetNotAllowed(req.target);
        }

        // 6. Asset whitelist.
        if (req.asset != address(0) && !registry.isAssetAllowed(policy.policyHash, req.asset)) {
            revert AssetNotAllowed(req.asset);
        }

        // 7. Recipient whitelist (deny-by-default: an empty allowlist permits no recipient).
        if (req.recipient != address(0) && !registry.isRecipientAllowed(policy.policyHash, req.recipient)) {
            revert RecipientNotAllowed(req.recipient);
        }

        // 8. Per-action ceiling.
        if (req.value > policy.maxPerAction) {
            revert ActionLimitExceeded(req.value, policy.maxPerAction);
        }

        // 9. Rolling daily exposure limit (per-policy, bucketed by UTC day).
        uint256 currentDay = block.timestamp / 86400;
        uint256 alreadySpentToday = dailySpent[policy.policyHash][currentDay];
        if (alreadySpentToday + req.value > policy.dailyLimit) {
            revert DailyLimitExceeded(req.value, policy.dailyLimit, alreadySpentToday);
        }
        dailySpent[policy.policyHash][currentDay] = alreadySpentToday + req.value;

        emit ExecutionApproved(executionId, req.agent, policy.policyHash, req.target, req.recipient, req.value);

        // 10. Snapshot balance for outcome postconditions (MIN received / MAX spent).
        bool measureOutcome = req.postconditionType != uint8(PostconditionType.NONE)
            && req.postconditionToken != address(0);
        uint256 balanceBefore = measureOutcome
            ? IERC20Token(req.postconditionToken).balanceOf(req.agent)
            : 0;

        // 11. Atomic execution: move asset funds from the agent, then dispatch the target call.
        if (req.value > 0 && req.asset != address(0)) {
            address destination = req.recipient != address(0) ? req.recipient : req.target;
            bool funded = IERC20Token(req.asset).transferFrom(req.agent, destination, req.value);
            require(funded, "SCOPE: asset funding transfer failed");
        }

        bytes memory returnData = "";
        if (req.callData.length > 0) {
            (bool success, bytes memory result) = req.target.call(req.callData);
            if (!success) revert TargetExecutionFailed(result);
            returnData = result;
        }

        // 12. Outcome postconditions (atomic: a violation reverts every state change above).
        if (measureOutcome) {
            if (req.postconditionType == uint8(PostconditionType.MIN_TOKEN_RECEIVED)) {
                // Sweep any output token the executor received during the call back to the agent.
                uint256 executorBalance = IERC20Token(req.postconditionToken).balanceOf(address(this));
                if (executorBalance > 0) {
                    bool swept = IERC20Token(req.postconditionToken).transfer(req.agent, executorBalance);
                    require(swept, "SCOPE: token sweep failed");
                }
                uint256 balanceAfter = IERC20Token(req.postconditionToken).balanceOf(req.agent);
                uint256 received = balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0;
                if (received < req.postconditionValue) {
                    revert OutcomePostconditionFailed(received, req.postconditionValue);
                }
            } else if (req.postconditionType == uint8(PostconditionType.MAX_TOKEN_SPENT)) {
                uint256 balanceAfter = IERC20Token(req.postconditionToken).balanceOf(req.agent);
                uint256 spent = balanceBefore > balanceAfter ? balanceBefore - balanceAfter : 0;
                if (spent > req.postconditionValue) {
                    revert OutcomePostconditionFailed(spent, req.postconditionValue);
                }
            }
        }

        emit ExecutionCompleted(executionId, req.agent, req.target, req.value, returnData);
        return returnData;
    }

    /**
     * @notice Recovers the signer of an EIP-712 digest, rejecting malleable (high-s) signatures.
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

        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        // EIP-2: reject the high-s half of the curve to prevent signature malleability.
        if (uint256(s) > SECP256K1_HALF_N) return address(0);

        return ecrecover(hash, v, r, s);
    }

    /**
     * @notice View helper: amount already spent under a policy in the current UTC day.
     */
    function getTodaySpent(bytes32 policyHash) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 86400;
        return dailySpent[policyHash][currentDay];
    }
}
