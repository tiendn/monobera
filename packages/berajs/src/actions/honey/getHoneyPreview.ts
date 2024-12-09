import { Address, PublicClient, formatUnits, parseUnits } from "viem";

import { honeyFactoryReaderAbi } from "~/abi";
import { BeraConfig, Token } from "~/types";

export enum HoneyPreviewMethod {
  Mint = "previewMint",
  RequiredCollateral = "previewRequiredCollateral",
  Redeem = "previewRedeem",
  RedeemBasket = "previewRedeemBasketMode",
  HoneyToRedeem = "previewHoneyToRedeem",
}

export interface HoneyPreviewArgs {
  client: PublicClient;
  config: BeraConfig;
  collateral: Token;
  collateralList: Token[] | undefined;
  amount: string;
  method: HoneyPreviewMethod;
}

/**
 * fetch the mint and redeem rate of all colleteral tokens
 */
export const getHoneyPreview = async ({
  client,
  config,
  collateral,
  collateralList,
  amount,
  method,
}: HoneyPreviewArgs): Promise<string[] | undefined> => {
  try {
    if (!config.contracts?.honeyFactoryAddress)
      throw new Error("missing contract address honeyFactoryAddress");

    let formattedAmount = 0n;
    if (
      method === HoneyPreviewMethod.Mint ||
      method === HoneyPreviewMethod.HoneyToRedeem
    ) {
      formattedAmount = parseUnits(amount, collateral.decimals);
    } else {
      formattedAmount = parseUnits(amount, 18); //honey decimals
    }

    const result = (await client.readContract({
      address: config.contracts.honeyFactoryReaderAddress as Address,
      abi: honeyFactoryReaderAbi,
      functionName: method,
      args: [
        collateral.address,
        method === HoneyPreviewMethod.RedeemBasket
          ? formattedAmount
          : undefined,
      ],
    })) as bigint | bigint[];

    const formattedResult = Array<string>(collateralList?.length ?? 2).fill(
      "0",
    );
    if (
      method === HoneyPreviewMethod.Mint ||
      method === HoneyPreviewMethod.HoneyToRedeem
    ) {
      formattedResult[0] = formatUnits(result as bigint, 18); //honey decimals
    } else if (method === HoneyPreviewMethod.Redeem) {
      formattedResult[0] = formatUnits(result as bigint, collateral.decimals);
    } else if (collateralList && collateralList.length === 2) {
      formattedResult[0] = formatUnits(
        (result as bigint[])[0],
        collateralList?.[0].decimals,
      );
      formattedResult[1] = formatUnits(
        (result as bigint[])[1],
        collateralList?.[1].decimals,
      );
    }
    return formattedResult;
  } catch (e) {
    console.log("error", e);
    return undefined;
  }
};
