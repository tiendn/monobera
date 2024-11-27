import type { CodegenConfig } from "@graphql-codegen/cli";
import dotenv from "dotenv";

dotenv.config({
  path: ["../../.env.local", "../../.env"],
});

export const getEndpointsMap = () =>
  [
    ["governance", process.env.NEXT_PUBLIC_GOVERNANCE_SUBGRAPH_URL],
    ["chain", process.env.NEXT_PUBLIC_CHAIN_BLOCKS_SUBGRAPH_URL],
    ["pol", process.env.NEXT_PUBLIC_POL_SUBGRAPH_URL],
    ["dex/subgraph", process.env.NEXT_PUBLIC_BALANCER_SUBGRAPH],
    ["dex/api", process.env.NEXT_PUBLIC_BALANCER_API_URL],
  ] as const;

export const endpointsMap = getEndpointsMap();

// endpointsMap.forEach((e) => {
//   if (!e[1]) {
//     throw new Error(
//       `GraphQL schema URL for ${e[0]} is not defined in the environment variables.`,
//     );
//   }
// });

const config: CodegenConfig = {
  overwrite: true,
  generates: endpointsMap.reduce<CodegenConfig["generates"]>(
    (acc, [entry, url]) => {
      if (!url) {
        console.error(
          `GraphQL schema URL for ${entry} is not defined in the environment variables.`,
        );
        return acc;
      }

      const [dir, file] = entry.split("/");

      acc[`./src/modules/${dir}/${file ?? dir}.codegen.ts`] = {
        schema: url,
        documents: `./src/modules/${dir}/${file ?? "*"}.graphql`,
        plugins: [
          "typescript",
          "typescript-operations",
          "typescript-react-apollo",
          {
            "typescript-document-nodes": {
              gqlImport: "@apollo/client#gql",
            },
          },
        ],
        config: {
          gqlImport: "@apollo/client#gql",
          withHooks: true,
        },
      };

      return acc;
    },
    {},
  ),
};

export default config;
