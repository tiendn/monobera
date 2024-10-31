import type { CodegenConfig } from "@graphql-codegen/cli";
import dotenv from "dotenv";

dotenv.config({
  path: ["../../.env.local", "../../.env"],
});

const config: CodegenConfig = {
  overwrite: true,
  // documents: "./src/**/query.ts",
  schema: process.env.NEXT_PUBLIC_CHAIN_BLOCKS_SUBGRAPH_URL,
  generates: {
    "./src/modules/governance/codegen.ts": {
      documents: "./src/modules/governance/query.ts",
      schema: process.env.NEXT_PUBLIC_GOVERNANCE_SUBGRAPH_URL,
      // preset: "client",

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
        // noExport: true,
      },
    },
    "./src/modules/chain/codegen.ts": {
      documents: "./src/modules/chain/query.ts",
      schema: process.env.NEXT_PUBLIC_CHAIN_BLOCKS_SUBGRAPH_URL,

      // preset: "client",
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
        {
          "typescript-document-nodes": {},
        },
      ],
      config: {
        // noExport: true,
        withHooks: true,
        gqlImport: "@apollo/client#gql",
      },
    },
    "./src/modules/dex/codegen.ts": {
      documents: "./src/modules/dex/backendQueries.ts",
      schema: process.env.NEXT_PUBLIC_BALANCER_API_URL,

      // preset: "client",
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
        {
          "typescript-document-nodes": {},
        },
      ],
      config: {
        // noExport: true,
        withHooks: true,
        gqlImport: "@apollo/client#gql",
      },
    },
  },
};

export default config;
