// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ScopePolicyRegistry
 * @notice Central registry for agent economic execution policies in SCOPE.
 * @dev Manages creation, retrieval, authorization, and revocation of execution policies.
 */
contract ScopePolicyRegistry {
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

    // Mapping from policyHash => Policy
    mapping(bytes32 => Policy) private _policies;
    // Mapping from agent address => active policyHash
    mapping(address => bytes32) public agentActivePolicy;
    // All policy hashes for enumeration
    bytes32[] public allPolicyHashes;

    // Events
    event PolicyCreated(
        bytes32 indexed policyHash,
        address indexed owner,
        address indexed agent,
        uint256 maxPerAction,
        uint256 dailyLimit,
        uint256 validAfter,
        uint256 validUntil
    );
    event PolicyActivated(bytes32 indexed policyHash, address indexed agent);
    event PolicyRevoked(bytes32 indexed policyHash, address indexed agent);

    // Errors
    error PolicyAlreadyExists(bytes32 policyHash);
    error PolicyNotFound(bytes32 policyHash);
    error Unauthorized();
    error InvalidPolicyParameters();

    modifier onlyPolicyOwner(bytes32 policyHash) {
        if (_policies[policyHash].owner == address(0)) revert PolicyNotFound(policyHash);
        if (_policies[policyHash].owner != msg.sender) revert Unauthorized();
        _;
    }

    /**
     * @notice Creates and activates a new execution policy for an agent.
     */
    function createPolicy(
        address agent,
        address[] calldata allowedTargets,
        address[] calldata allowedAssets,
        address[] calldata allowedRecipients,
        uint256 maxPerAction,
        uint256 dailyLimit,
        uint256 validAfter,
        uint256 validUntil
    ) external returns (bytes32 policyHash) {
        if (agent == address(0)) revert InvalidPolicyParameters();
        if (validUntil <= validAfter) revert InvalidPolicyParameters();
        if (maxPerAction == 0) revert InvalidPolicyParameters();

        policyHash = keccak256(
            abi.encode(
                msg.sender,
                agent,
                allowedTargets,
                allowedAssets,
                allowedRecipients,
                maxPerAction,
                dailyLimit,
                validAfter,
                validUntil,
                block.chainid,
                allPolicyHashes.length
            )
        );

        if (_policies[policyHash].owner != address(0)) revert PolicyAlreadyExists(policyHash);

        Policy storage p = _policies[policyHash];
        p.owner = msg.sender;
        p.agent = agent;
        p.allowedTargets = allowedTargets;
        p.allowedAssets = allowedAssets;
        p.allowedRecipients = allowedRecipients;
        p.maxPerAction = maxPerAction;
        p.dailyLimit = dailyLimit;
        p.validAfter = validAfter;
        p.validUntil = validUntil;
        p.policyHash = policyHash;
        p.active = true;

        agentActivePolicy[agent] = policyHash;
        allPolicyHashes.push(policyHash);

        emit PolicyCreated(
            policyHash,
            msg.sender,
            agent,
            maxPerAction,
            dailyLimit,
            validAfter,
            validUntil
        );
        emit PolicyActivated(policyHash, agent);

        return policyHash;
    }

    /**
     * @notice Deactivates/revokes an existing policy.
     */
    function revokePolicy(bytes32 policyHash) external onlyPolicyOwner(policyHash) {
        Policy storage p = _policies[policyHash];
        p.active = false;
        if (agentActivePolicy[p.agent] == policyHash) {
            delete agentActivePolicy[p.agent];
        }
        emit PolicyRevoked(policyHash, p.agent);
    }

    /**
     * @notice Reactivates an existing policy.
     */
    function activatePolicy(bytes32 policyHash) external onlyPolicyOwner(policyHash) {
        Policy storage p = _policies[policyHash];
        p.active = true;
        agentActivePolicy[p.agent] = policyHash;
        emit PolicyActivated(policyHash, p.agent);
    }

    /**
     * @notice Fetches full policy details.
     */
    function getPolicy(bytes32 policyHash) external view returns (Policy memory) {
        Policy memory p = _policies[policyHash];
        if (p.owner == address(0)) revert PolicyNotFound(policyHash);
        return p;
    }

    /**
     * @notice Gets active policy for an agent.
     */
    function getActivePolicyForAgent(address agent) external view returns (Policy memory) {
        bytes32 policyHash = agentActivePolicy[agent];
        if (policyHash == bytes32(0)) revert PolicyNotFound(bytes32(0));
        return _policies[policyHash];
    }

    /**
     * @notice Checks if target address is allowed under policy.
     */
    function isTargetAllowed(bytes32 policyHash, address target) external view returns (bool) {
        Policy storage p = _policies[policyHash];
        if (!p.active) return false;
        for (uint256 i = 0; i < p.allowedTargets.length; i++) {
            if (p.allowedTargets[i] == target) return true;
        }
        return false;
    }

    /**
     * @notice Checks if asset address is allowed under policy.
     */
    function isAssetAllowed(bytes32 policyHash, address asset) external view returns (bool) {
        Policy storage p = _policies[policyHash];
        if (!p.active) return false;
        for (uint256 i = 0; i < p.allowedAssets.length; i++) {
            if (p.allowedAssets[i] == asset) return true;
        }
        return false;
    }

    /**
     * @notice Checks if recipient address is allowed under policy.
     */
    function isRecipientAllowed(bytes32 policyHash, address recipient) external view returns (bool) {
        Policy storage p = _policies[policyHash];
        if (!p.active) return false;
        // Deny-by-default: an empty recipient allowlist permits no direct recipient.
        for (uint256 i = 0; i < p.allowedRecipients.length; i++) {
            if (p.allowedRecipients[i] == recipient) return true;
        }
        return false;
    }

    /**
     * @notice Returns total number of policies registered.
     */
    function totalPolicies() external view returns (uint256) {
        return allPolicyHashes.length;
    }
}
