"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTokens } from "@bera/berajs";
import { cn } from "@bera/ui";
import { CustomAvatar } from "@bera/ui/custom-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { getAddress, isAddress } from "viem";

const IconVariants = cva(
  "aspect-square flex items-center justify-center rounded-full text-foreground",
  {
    variants: {
      size: {
        "3xl": "w-16 h-16 text-lg font-semibold leading-7",
        "2xl": "w-12 h-12 text-[14px] font-semibold leading-tight",
        xl: "w-8 h-8 text-xs font-normal leading-3",
        lg: "w-6 h-6 text-[8px]",
        md: "w-4 h-4 text-[6px]",
        sm: "w-3 h-3 text-[4px]",
        xs: "w-2 h-2 text-[3px]",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  },
);

interface IconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof IconVariants> {
  address: string | undefined;
  symbol?: string;
  imgOverride?: string;
}

export const TokenIcon = ({
  address: adr,
  className,
  size,
  symbol,
  imgOverride,
  ...props
}: IconProps) => {
  const { data: tokenData } = useTokens();
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const address = isAddress(adr ?? "") ? getAddress(adr ?? "") : adr;
  const img = useMemo(() => {
    if (tokenData?.tokenDictionary && address && isAddress(address)) {
      const uploadedToken = tokenData?.tokenDictionary?.[address];
      if (uploadedToken?.base64) {
        setIsLoading(false);
        return `data:image/svg+xml;base64,${uploadedToken.base64}`;
      }
      return tokenData?.tokenDictionary[address]?.logoURI;
    }
    return "";
  }, [tokenData?.tokenDictionary, tokenData?.tokenDictionary?.[address ?? ""]]);

  const finalImageUrl = imgOverride ?? img ?? "";

  return (
    <CustomAvatar
      fallbackText={symbol ? symbol.slice(0, 3) : "TKN"}
      className={cn(IconVariants({ size }), className)}
      isNodeLoading={isLoading}
      imageNode={
        finalImageUrl && !imageError ? (
          <Image
            src={finalImageUrl}
            alt="Custom Avatar"
            fill
            style={{ opacity: isLoading ? 0 : 1 }}
            className={cn("aspect-square h-full w-full")}
            onLoad={() => setIsLoading(false)}
            onError={() => setImageError(true)}
          />
        ) : null
      }
      {...props}
    />
  );
};
