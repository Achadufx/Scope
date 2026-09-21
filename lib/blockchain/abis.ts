export const ScopePolicyRegistryABI = [
  {
    inputs: [
      { internalType: "address", name: "agent", type: "address" },
      { internalType: "address[]", name: "allowedTargets", type: "address[]" },
      { internalType: "address[]", name: "allowedAssets", type: "address[]" },
      { internalType: "address[]", name: "allowedRecipients", type: "address[]" },
      { internalType: "uint256", name: "maxPerAction", type: "uint256" },
      { internalType: "uint256", name: "dailyLimit", type: "uint256" },
      { internalType: "uint256", name: "validAfter", type: "uint256" },
      { internalType: "uint256", name: "validUntil", type: "uint256" }
    ],
    name: "createPolicy",
    outputs: [{ internalType: "bytes32", name: "policyHash", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "policyHash", type: "bytes32" }],
    name: "activatePolicy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "policyHash", type: "bytes32" }],
    name: "revokePolicy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "policyHash", type: "bytes32" }],
    name: "getPolicy",
    outputs: [
      {
        components: [
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "address", name: "agent", type: "address" },
          { internalType: "address[]", name: "allowedTargets", type: "address[]" },
          { internalType: "address[]", name: "allowedAssets", type: "address[]" },
          { internalType: "address[]", name: "allowedRecipients", type: "address[]" },
          { internalType: "uint256", name: "maxPerAction", type: "uint256" },
          { internalType: "uint256", name: "dailyLimit", type: "uint256" },
          { internalType: "uint256", name: "validAfter", type: "uint256" },
          { internalType: "uint256", name: "validUntil", type: "uint256" },
          { internalType: "bytes32", name: "policyHash", type: "bytes32" },
          { internalType: "bool", name: "active", type: "bool" }
        ],
        internalType: "struct ScopePolicyRegistry.Policy",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "getActivePolicyForAgent",
    outputs: [
      {
        components: [
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "address", name: "agent", type: "address" },
          { internalType: "address[]", name: "allowedTargets", type: "address[]" },
          { internalType: "address[]", name: "allowedAssets", type: "address[]" },
          { internalType: "address[]", name: "allowedRecipients", type: "address[]" },
          { internalType: "uint256", name: "maxPerAction", type: "uint256" },
          { internalType: "uint256", name: "dailyLimit", type: "uint256" },
          { internalType: "uint256", name: "validAfter", type: "uint256" },
          { internalType: "uint256", name: "validUntil", type: "uint256" },
          { internalType: "bytes32", name: "policyHash", type: "bytes32" },
          { internalType: "bool", name: "active", type: "bool" }
        ],
        internalType: "struct ScopePolicyRegistry.Policy",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "policyHash", type: "bytes32" },
      { internalType: "address", name: "target", type: "address" }
    ],
    name: "isTargetAllowed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "policyHash", type: "bytes32" },
      { internalType: "address", name: "asset", type: "address" }
    ],
    name: "isAssetAllowed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "policyHash", type: "bytes32" },
      { internalType: "address", name: "recipient", type: "address" }
    ],
    name: "isRecipientAllowed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

export const ScopeExecutorABI = [
  {
    inputs: [{ internalType: "address", name: "_registry", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "agent", type: "address" },
          { internalType: "address", name: "target", type: "address" },
          { internalType: "address", name: "asset", type: "address" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint8", name: "postconditionType", type: "uint8" },
          { internalType: "address", name: "postconditionToken", type: "address" },
          { internalType: "uint256", name: "postconditionValue", type: "uint256" }
        ],
        internalType: "struct ScopeExecutor.ExecutionRequest",
        name: "req",
        type: "tuple"
      },
      { internalType: "bytes", name: "signature", type: "bytes" }
    ],
    name: "execute",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "agent", type: "address" },
          { internalType: "address", name: "target", type: "address" },
          { internalType: "address", name: "asset", type: "address" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "callData", type: "bytes" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint8", name: "postconditionType", type: "uint8" },
          { internalType: "address", name: "postconditionToken", type: "address" },
          { internalType: "uint256", name: "postconditionValue", type: "uint256" }
        ],
        internalType: "struct ScopeExecutor.ExecutionRequest",
        name: "req",
        type: "tuple"
      }
    ],
    name: "hashExecutionRequest",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "policyHash", type: "bytes32" }],
    name: "getTodaySpent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Custom Errors
  { inputs: [], name: "InvalidSignature", type: "error" },
  { inputs: [{ internalType: "uint256", name: "nonce", type: "uint256" }], name: "NonceAlreadyUsed", type: "error" },
  { inputs: [{ internalType: "uint256", name: "deadline", type: "uint256" }, { internalType: "uint256", name: "currentTimestamp", type: "uint256" }], name: "DeadlineExpired", type: "error" },
  { inputs: [], name: "PolicyInactiveOrNotFound", type: "error" },
  { inputs: [{ internalType: "uint256", name: "currentTimestamp", type: "uint256" }, { internalType: "uint256", name: "validAfter", type: "uint256" }, { internalType: "uint256", name: "validUntil", type: "uint256" }], name: "PolicyTimeWindowViolation", type: "error" },
  { inputs: [{ internalType: "address", name: "target", type: "address" }], name: "TargetNotAllowed", type: "error" },
  { inputs: [{ internalType: "address", name: "asset", type: "address" }], name: "AssetNotAllowed", type: "error" },
  { inputs: [{ internalType: "address", name: "recipient", type: "address" }], name: "RecipientNotAllowed", type: "error" },
  { inputs: [{ internalType: "uint256", name: "requested", type: "uint256" }, { internalType: "uint256", name: "maxPerAction", type: "uint256" }], name: "ActionLimitExceeded", type: "error" },
  { inputs: [{ internalType: "uint256", name: "requested", type: "uint256" }, { internalType: "uint256", name: "dailyLimit", type: "uint256" }, { internalType: "uint256", name: "currentSpent", type: "uint256" }], name: "DailyLimitExceeded", type: "error" },
  { inputs: [{ internalType: "bytes", name: "reason", type: "bytes" }], name: "TargetExecutionFailed", type: "error" },
  { inputs: [{ internalType: "uint256", name: "actualAmount", type: "uint256" }, { internalType: "uint256", name: "expectedThreshold", type: "uint256" }], name: "OutcomePostconditionFailed", type: "error" }
] as const;

export const MockUSDCABI = [
  {
    inputs: [{ internalType: "uint256", name: "initialSupply", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "faucet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;
