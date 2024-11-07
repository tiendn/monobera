import { ApolloClient, InMemoryCache } from "@apollo/client";
import {
  balancerApiUrl,
  balancerSubgraphUrl,
  crocSubgraphEndpoint,
} from "@bera/config";

// import { subgraphUrl } from "@bera/config";

export const dexClient = new ApolloClient({
  uri: crocSubgraphEndpoint,
  cache: new InMemoryCache(),
});

export const bexSubgraphClient = new ApolloClient({
  ssrMode: true,
  uri: balancerSubgraphUrl,
  cache: new InMemoryCache(),
});

export const bexApiGraphqlClient = new ApolloClient({
  uri: balancerApiUrl,
  cache: new InMemoryCache(),
});
