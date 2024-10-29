import React, {
  createContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { usePublicClient } from "wagmi";

import { useChainId } from "~/hooks";
import { useEthersProvider } from "~/hooks/useEthersProvider";

export type AppEnvironment = "local" | "testnet" | "production";
export const APP_ENVIRONMENT: AppEnvironment = "local";

export const IS_LOCAL_ENV = APP_ENVIRONMENT === "local";

const CrocEnvContextProvider = ({ children }: PropsWithChildren) => {
  return <>{children}</>;
};

export default CrocEnvContextProvider;
