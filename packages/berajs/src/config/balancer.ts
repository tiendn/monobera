// Custom Balancer network configuration for Berachain

import {
  BalancerNetworkConfig,
  BalancerSdkConfig,
  ContractAddresses,
  Network,
} from "@balancer-labs/sdk";
import {
  balancerHelperAddress,
  balancerQueriesAddress,
  balancerSubgraphUrl,
  balancerVaultAddress,
  beraTokenAddress,
  jsonRpcUrl,
  multicallAddress,
  nativeTokenAddress,
} from "@bera/config";

const contractAddresses: ContractAddresses = {
  vault: balancerVaultAddress,
  multicall: multicallAddress,
  poolDataQueries: balancerQueriesAddress,
  balancerHelpers: balancerHelperAddress,
  balancerRelayer: "0x0000000000000000000000000000000000000001", // https://docs.balancer.fi/concepts/advanced/relayers.html#authorizing-a-relayer
};

export const balancerNetworkConfig: BalancerNetworkConfig = {
  addresses: {
    contracts: contractAddresses,
    tokens: {
      wrappedNativeAsset: beraTokenAddress,
      bal: nativeTokenAddress,
    },
  },
  urls: {
    subgraph: balancerSubgraphUrl,
  },
  thirdParty: {
    coingecko: {
      nativeAssetId: "berachain-bera", // CoinGecko ID for Berachain's native asset (https://www.coingecko.com/en/coins/berachain-bera)
      platformId: "berachain-bera",
    },
  },
  pools: {},
  chainId: 80084 as Network,

  // multicallBatchSize: 10, // Optional batch size for multicall
  // averageBlockTime: 3, // Optional average block time in seconds
};
export const balancerSdkConfig: BalancerSdkConfig = {
  network: balancerNetworkConfig,
  rpcUrl: jsonRpcUrl,
  enableLogging: true,
};
