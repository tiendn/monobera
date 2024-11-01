export const balancerPoolCreationHelperAbi = [
  {
    inputs: [
      {
        internalType: "contract IVault",
        name: "_vault",
        type: "address",
      },
      {
        internalType: "contract WeightedPoolFactory",
        name: "_weightedPoolFactory",
        type: "address",
      },
      {
        internalType: "contract ComposableStablePoolFactory",
        name: "_composableStablePoolFactory",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "pool",
        type: "address",
      },
    ],
    name: "PoolCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "composableStablePoolFactory",
    outputs: [
      {
        internalType: "contract ComposableStablePoolFactory",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
      {
        internalType: "contract IERC20[]",
        name: "tokens",
        type: "address[]",
      },
      {
        internalType: "uint256",
        name: "amplificationParameter",
        type: "uint256",
      },
      {
        internalType: "contract IRateProvider[]",
        name: "rateProviders",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "tokenRateCacheDurations",
        type: "uint256[]",
      },
      {
        internalType: "bool[]",
        name: "exemptFromYieldProtocolFeeFlags",
        type: "bool[]",
      },
      {
        internalType: "uint256",
        name: "swapFeePercentage",
        type: "uint256",
      },
      {
        internalType: "uint256[]",
        name: "amountsIn",
        type: "uint256[]",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "salt",
        type: "bytes32",
      },
    ],
    name: "createAndJoinStablePool",
    outputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
      {
        internalType: "contract IERC20[]",
        name: "tokens",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "normalizedWeights",
        type: "uint256[]",
      },
      {
        internalType: "contract IRateProvider[]",
        name: "rateProviders",
        type: "address[]",
      },
      {
        internalType: "uint256",
        name: "swapFeePercentage",
        type: "uint256",
      },
      {
        internalType: "uint256[]",
        name: "amountsIn",
        type: "uint256[]",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "salt",
        type: "bytes32",
      },
    ],
    name: "createAndJoinWeightedPool",
    outputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "vault",
    outputs: [
      {
        internalType: "contract IVault",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "weightedPoolFactory",
    outputs: [
      {
        internalType: "contract WeightedPoolFactory",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
