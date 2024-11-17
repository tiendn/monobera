import { gql } from "@apollo/client";

export const getTokenHoneyPriceReq = gql`
  query GetTokenHoneyPrice($id: String) {
    tokenHoneyPrice(id: $id) {
      id
      price
    }
  }
`;

// NEW QUERIES

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
