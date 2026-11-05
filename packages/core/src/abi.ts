export const policyAbi = [
  {
    type: "constructor",
    stateMutability: "nonpayable",
    inputs: [{ name: "admin_", type: "address" }],
  },
  {
    type: "function",
    name: "setRule",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "mode", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "readRule",
    stateMutability: "view",
    inputs: [
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
    ],
    outputs: [{ type: "uint8" }],
  },
] as const;

export const accountAbi = [
  {
    type: "constructor",
    stateMutability: "payable",
    inputs: [
      { name: "owner_", type: "address" },
      { name: "policy_", type: "address" },
      { name: "registry_", type: "address" },
    ],
  },
  {
    type: "function",
    name: "grantSession",
    stateMutability: "nonpayable",
    inputs: [
      { name: "key", type: "address" },
      { name: "expiry", type: "uint64" },
      { name: "valueCap", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeSession",
    stateMutability: "nonpayable",
    inputs: [{ name: "key", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setP256Cosigner",
    stateMutability: "nonpayable",
    inputs: [{ name: "who", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "sessionOf",
    stateMutability: "view",
    inputs: [{ name: "key", type: "address" }],
    outputs: [
      { name: "expiry", type: "uint64" },
      { name: "valueCap", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "fund",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "p256Cosigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const vaultAbi = [
  { type: "constructor", stateMutability: "nonpayable", inputs: [] },
  { type: "function", name: "ping", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "sweep", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const stakeAbi = [
  {
    type: "function",
    name: "addStake",
    stateMutability: "payable",
    inputs: [{ name: "unstakeDelaySec", type: "uint32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getDepositInfo",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "stake", type: "uint256" },
      { name: "unstakeDelaySec", type: "uint32" },
      { name: "withdrawTime", type: "uint64" },
    ],
  },
] as const;

export const ALLOW = 1;
export const HIGH = 2;
