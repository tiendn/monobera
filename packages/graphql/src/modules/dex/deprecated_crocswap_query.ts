import { gql } from "@apollo/client";

export const getTokenHoneyPriceReq = gql`
  query GetTokenHoneyPrice($id: String) {
    tokenHoneyPrice(id: $id) {
      id
      price
    }
  }
`;

export const getUserPools = gql`
  query GetUserPools($userAddress: String!) {
    userPools(where: { userAddress: $userAddress }) {
      id
      poolAddress
      shares
      userAddress
    }
  }
`;

export const getUserPoolsDetails = gql`
  query GetUserPoolsDetails($list: [Pool_filter]) {
    pools(where: { or: $list }) {
      id
      pool: address
      poolName: name
      tokens: poolTokens {
        denomWeight
        amount
        denom
        address
        symbol
        decimals
        latestPriceUsd {
          id
          price
        }
      }
      swapFee
      sharesDenom
      sharesAddress
      totalShares
      tvlUsd
    }
  }
`;

export const getPoolList = gql`
  query GetPoolList($page: Int!, $limit: Int!) {
    pools(
      skip: $page
      first: $limit
      orderBy: timeCreate
      orderDirection: desc
    ) {
      id
      poolIdx
      base
      quote
      timeCreate
      template {
        feeRate
      }
      baseInfo {
        id
        address
        symbol
        name
        decimals
      }
      quoteInfo {
        id
        address
        symbol
        name
        decimals
      }
    }
  }
`;

export const searchFilteredPoolList = gql`
  query GetPoolList(
    $baseAssets: [Bytes!]
    $quoteAssets: [Bytes!]
    $keyword: String
  ) {
    pools(
      where: {
        or: [
          {
            base_in: $baseAssets
            quote_in: $quoteAssets
            baseInfo_: { name_contains_nocase: $keyword }
          }
          {
            base_in: $baseAssets
            quote_in: $quoteAssets
            baseInfo_: { symbol_contains_nocase: $keyword }
          }
          {
            base_in: $baseAssets
            quote_in: $quoteAssets
            quoteInfo_: { name_contains_nocase: $keyword }
          }
          {
            base_in: $baseAssets
            quote_in: $quoteAssets
            quoteInfo_: { symbol_contains_nocase: $keyword }
          }
        ]
      }
    ) {
      id
      poolIdx
      base
      quote
      timeCreate
      template {
        feeRate
      }
      baseInfo {
        id
        address
        symbol
        name
        decimals
      }
      quoteInfo {
        id
        address
        symbol
        name
        decimals
      }
      shareAddress {
        address
      }
    }
  }
`;

export const getRecentSwaps = gql`
  query GetRecentSwaps($poolHash: Bytes!) {
    swaps(
      first: 50
      orderBy: time
      orderDirection: desc
      where: { pool: $poolHash }
    ) {
      user
      baseFlow
      quoteFlow
      transactionHash
      time
      baseAssetUsdPrice
      quoteAssetUsdPrice
    }
  }
`;

export const getRecentProvisions = gql`
  query GetRecentProvisions($poolHash: Bytes!) {
    liquidityChanges(
      first: 50
      orderBy: time
      orderDirection: desc
      where: { pool: $poolHash }
    ) {
      user
      baseFlow
      quoteFlow
      changeType
      transactionHash
      time
      baseAssetUsdPrice
      quoteAssetUsdPrice
    }
  }
`;

// NEW QUERIES

export const getFilteredPoolsBySymbol = gql`
  query GetPoolList(
    $keyword: String
    $skip: Int!
    $first: Int!
    $order: String
    $orderDirection: String
  ) {
    pools(
      where: {
        or: [
          { baseInfo_: { name_contains_nocase: $keyword } }
          { baseInfo_: { symbol_contains_nocase: $keyword } }
          { quoteInfo_: { name_contains_nocase: $keyword } }
          { quoteInfo_: { symbol_contains_nocase: $keyword } }
        ]
      }
      orderBy: $order
      orderDirection: $orderDirection
      skip: $skip
      first: $first
    ) {
      id
      poolIdx
      base
      quote
      timeCreate
      tvlUsd
      baseAmount
      quoteAmount
      wtv
      template {
        feeRate
      }
      baseInfo {
        id
        address
        symbol
        name
        decimals
        usdValue
        beraValue
      }
      quoteInfo {
        id
        address
        symbol
        name
        decimals
        usdValue
        beraValue
      }
      shareAddress {
        address
      }
      vault {
        id
        vaultAddress
      }
    }
  }
`;

export const getFilteredPoolsByAddress = gql`
  query GetPoolList(
    $keyword: String
    $skip: Int!
    $first: Int!
    $order: String
    $orderDirection: String
  ) {
    pools(
      where: {
        or: [
          { baseInfo_: { address_contains: $keyword } }
          { quoteInfo_: { address_contains: $keyword } }
          { shareAddress_: { address_contains: $keyword } }
        ]
      }
      orderBy: $order
      orderDirection: $orderDirection
      skip: $skip
      first: $first
    ) {
      id
      poolIdx
      base
      quote
      timeCreate
      tvlUsd
      baseAmount
      quoteAmount
      wtv
      template {
        feeRate
      }
      baseInfo {
        id
        address
        symbol
        name
        decimals
        usdValue
        beraValue
      }
      quoteInfo {
        id
        address
        symbol
        name
        decimals
        usdValue
        beraValue
      }
      shareAddress {
        address
      }
      vault {
        id
        vaultAddress
      }
    }
  }
`;

export const GetHomepageData = gql`
  query HomepageData($beraAddress: String) {
    bexGlobalData(id: "global") {
      tvlUsd
    }
    bexGlobalDayDatas(orderBy: date, orderDirection: desc, first: 1) {
      volumeUsd
    }
    globalInfo(id: "global") {
      totalBGTDistributed
    }
    tokenInformations(where: { address_contains: $beraAddress }) {
      usdValue
    }
  }
`;

export const GetTokenInformation = gql`
  query GetTokenInformation($id: String) {
    tokenInformation(id: $id) {
      id
      address
      symbol
      name
      decimals
      usdValue
      beraValue
    }
  }
`;

export const GetTokenInformations = gql`
  query GetTokenInformation($id: [String!]) {
    tokenInformations(where: { id_in: $id }) {
      id
      address
      symbol
      name
      decimals
      usdValue
      beraValue
    }
  }
`;

export const GetPoolDayDatas = gql`
  query PoolDayData($poolId: String) {
    poolDayDatas(
      where: { pool: $poolId }
      orderBy: date
      orderDirection: desc
    ) {
      date
      tvlUsd
      volumeUsd
      feesUsd
    }
  }
`;

export const GetPoolCount = gql`
  query PoolCount {
    bexGlobalUsages(interval: "day", first: 1) {
      id
      timestamp
      poolCount
    }
  }
`;

export const GetPoolHistory = gql`
  query PoolHistory($poolId: String) {
    poolUsages(interval: "day", where: { pool_: { id: $poolId } }, first: 90) {
      volumeUsd: dailyVolumeUsd
      tvlUsd
      feesUsd: dailyfeesUsd
      date: timestamp
      pool {
        id
      }
    }
  }
`;

export const GetWeeklyBgtInflation = gql`
  query BgtInflation($wbera: String) {
    globalIncentivesUsages(interval: "day", first: 7) {
      bgtDistributed
    }
    tokenInformation(id: $wbera) {
      usdValue
    }
  }
`;
