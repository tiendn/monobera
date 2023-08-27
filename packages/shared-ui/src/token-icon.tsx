"use client";

import { useEffect, useMemo, useState } from "react";
import { useTokenInformation, useTokens, type Token } from "@bera/berajs";
import { cn } from "@bera/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@bera/ui/avatar";

type Props = {
  token?: Token | undefined;
  fetch?: boolean;
  className?: string;
  address?: string;
};

export const TokenIcon = ({
  token,
  className,
  fetch = false,
  address,
}: Props) => {
  const { read, tokenInformation } = useTokenInformation();

  const { tokenDictionary } = useTokens();
  useMemo(() => {
    const fetchData = async () => {
      if (fetch && address && !tokenInformation) {
        await read({ address: address });
      }
    };

    void fetchData();
  }, [token]);

  const getTokenImgUri = () => {
    if (token && token.logoURI) {
      return token.logoURI;
    }
    if (token && token.logoURI === undefined && tokenDictionary) {
      return tokenDictionary[token.address]?.logoURI;
    }
    if (fetch && address) {
      if (tokenDictionary && tokenDictionary[address]) {
        return tokenDictionary[address]?.logoURI;
      } else {
        return "";
      }
    }
    return "";
  };

  return (
    <Avatar className={cn("h-6 w-6 rounded-full bg-muted", className)}>
      <AvatarImage src={getTokenImgUri()} className="rounded-full" />
      <AvatarFallback className="text-xs font-bold">
        {fetch
          ? tokenInformation?.symbol?.slice(0, 3)
          : token?.symbol?.slice(0, 3)}
      </AvatarFallback>
    </Avatar>
  );
};