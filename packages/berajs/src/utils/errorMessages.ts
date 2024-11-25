import { ethers } from "ethers";
import { PublicClient } from "viem";

import { clientToProvider } from "./ethers-client-to-provider";

interface ErrorType {
  keywords: string[];
  errorMSG: string;
}

interface ErrorCategory {
  [key: string]: ErrorType;
}

interface ErrorMessages {
  GENERAL_ERROR: string;
  [key: string]: ErrorCategory | string;
}

const errorMsgMap: ErrorMessages = {
  GENERAL_ERROR: "Something went wrong. Please try again later.",
  RPC: {
    GAS_PRICE: {
      keywords: ["gasLimit"],
      errorMSG:
        "It seems an RPC error has occurred while estimating gas. Please try your request later.",
    },
    JSON_RPC: {
      keywords: ["JSON-RPC"],
      errorMSG:
        "It seems an RPC error has occurred. Please try your request one more later.",
    },
    // ETH_GETBALANCE: {
    //   keywords: "eth_getBalance",
    //   err: "An RPC error has been detected. Please attempt your request after a short while.",
    // },
    HASH: {
      keywords: ["hash"],
      errorMSG:
        "It seems an RPC error has occurred. Please check if your transaction was finalized. If not, please try again.",
    },
    USER_REJECTION: {
      keywords: ["User denied transaction signature"],
      errorMSG: "You rejected the transaction.",
    },
  },
  // NOTE: these codes are from https://github.com/balancer/balancer-v2-monorepo/blob/master/pkg/balancer-js/src/utils/errors.ts
  BALANCER: {
    BAL000: {
      keywords: ["BAL#000"],
      errorMSG: "Addition overflow occurred during calculation.",
    },
    BAL001: {
      keywords: ["BAL#001"],
      errorMSG: "Subtraction overflow occurred during calculation.",
    },
    BAL002: {
      keywords: ["BAL#002"],
      errorMSG: "Subtraction underflow occurred during calculation.",
    },
    BAL003: {
      keywords: ["BAL#003"],
      errorMSG: "Multiplication overflow occurred during calculation.",
    },
    BAL004: { keywords: ["BAL#004"], errorMSG: "Attempted division by zero." },
    BAL005: {
      keywords: ["BAL#005"],
      errorMSG: "Internal error occurred during division.",
    },
    BAL006: { keywords: ["BAL#006"], errorMSG: "X value is out of bounds." },
    BAL007: { keywords: ["BAL#007"], errorMSG: "Y value is out of bounds." },
    BAL008: {
      keywords: ["BAL#008"],
      errorMSG: "Product result is out of bounds.",
    },
    BAL009: {
      keywords: ["BAL#009"],
      errorMSG: "Invalid exponent provided in calculation.",
    },
    BAL100: {
      keywords: ["BAL#100"],
      errorMSG: "Value is out of acceptable bounds.",
    },
    BAL101: {
      keywords: ["BAL#101"],
      errorMSG: "Array is not sorted as required.",
    },
    BAL102: {
      keywords: ["BAL#102"],
      errorMSG: "Tokens are not sorted as required.",
    },
    BAL103: {
      keywords: ["BAL#103"],
      errorMSG: "Input length mismatch detected.",
    },
    BAL104: {
      keywords: ["BAL#104"],
      errorMSG: "A zero token value was encountered.",
    },
    BAL105: {
      keywords: ["BAL#105"],
      errorMSG: "Insufficient data provided for the operation.",
    },
    BAL200: {
      keywords: ["BAL#200"],
      errorMSG: "Minimum number of tokens not met.",
    },
    BAL201: {
      keywords: ["BAL#201"],
      errorMSG: "Maximum number of tokens exceeded.",
    },
    BAL202: {
      keywords: ["BAL#202"],
      errorMSG: "Swap fee percentage exceeds the maximum allowed.",
    },
    BAL203: {
      keywords: ["BAL#203"],
      errorMSG: "Swap fee percentage is below the minimum allowed.",
    },
    BAL204: {
      keywords: ["BAL#204"],
      errorMSG: "The required minimum BPT amount has not been met.",
    },
    BAL205: {
      keywords: ["BAL#205"],
      errorMSG: "Caller is not authorized to interact with the vault.",
    },
    BAL206: {
      keywords: ["BAL#206"],
      errorMSG: "The requested pool is uninitialized.",
    },
    BAL207: {
      keywords: ["BAL#207"],
      errorMSG: "Maximum BPT input amount exceeded.",
    },
    BAL208: {
      keywords: ["BAL#208"],
      errorMSG: "Minimum BPT output amount not met.",
    },
    BAL209: {
      keywords: ["BAL#209"],
      errorMSG: "Permit signature has expired.",
    },
    BAL210: {
      keywords: ["BAL#210"],
      errorMSG: "Operation requires exactly two tokens.",
    },
    BAL211: {
      keywords: ["BAL#211"],
      errorMSG: "The requested functionality is disabled.",
    },
    BAL300: {
      keywords: ["BAL#300"],
      errorMSG: "The amplification parameter is below the minimum allowed.",
    },
    BAL301: {
      keywords: ["BAL#301"],
      errorMSG: "The amplification parameter exceeds the maximum allowed.",
    },
    BAL302: {
      keywords: ["BAL#302"],
      errorMSG: "The weight parameter is below the minimum allowed.",
    },
    BAL303: {
      keywords: ["BAL#303"],
      errorMSG: "The number of stable tokens exceeds the maximum allowed.",
    },
    BAL304: {
      keywords: ["BAL#304"],
      errorMSG: "Input token amount exceeds the maximum allowed ratio.",
    },
    BAL305: {
      keywords: ["BAL#305"],
      errorMSG: "Output token amount exceeds the maximum allowed ratio.",
    },
    BAL306: {
      keywords: ["BAL#306"],
      errorMSG:
        "BPT input amount for token output is below the minimum required.",
    },
    BAL307: {
      keywords: ["BAL#307"],
      errorMSG:
        "BPT output amount for token input exceeds the maximum allowed.",
    },
    BAL308: {
      keywords: ["BAL#308"],
      errorMSG: "Normalized weights invariant validation failed.",
    },
    BAL309: {
      keywords: ["BAL#309"],
      errorMSG: "Invalid token provided for operation.",
    },
    BAL310: {
      keywords: ["BAL#310"],
      errorMSG: "Unhandled join kind operation.",
    },
    BAL311: {
      keywords: ["BAL#311"],
      errorMSG: "Zero invariant detected during the operation.",
    },
    BAL312: {
      keywords: ["BAL#312"],
      errorMSG: "Invalid query for oracle seconds data.",
    },
    BAL313: {
      keywords: ["BAL#313"],
      errorMSG: "Oracle has not been initialized.",
    },
    BAL314: {
      keywords: ["BAL#314"],
      errorMSG: "Oracle query data is too old.",
    },
    BAL315: { keywords: ["BAL#315"], errorMSG: "Oracle index is invalid." },
    BAL316: {
      keywords: ["BAL#316"],
      errorMSG: "Oracle seconds data is malformed.",
    },
    BAL317: {
      keywords: ["BAL#317"],
      errorMSG: "Amplification end time is too close to the start time.",
    },
    BAL318: {
      keywords: ["BAL#318"],
      errorMSG: "Amplification parameter update is ongoing.",
    },
    BAL319: {
      keywords: ["BAL#319"],
      errorMSG: "Amplification rate exceeds the maximum allowed.",
    },
    BAL320: {
      keywords: ["BAL#320"],
      errorMSG: "No ongoing amplification parameter update detected.",
    },
    BAL321: {
      keywords: ["BAL#321"],
      errorMSG: "Stable pool invariant calculation did not converge.",
    },
    BAL322: {
      keywords: ["BAL#322"],
      errorMSG: "Stable pool balance calculation did not converge.",
    },
    BAL323: {
      keywords: ["BAL#323"],
      errorMSG: "Relayer must be a valid contract.",
    },
    BAL324: {
      keywords: ["BAL#324"],
      errorMSG: "Base pool relayer was not called correctly.",
    },
    BAL325: {
      keywords: ["BAL#325"],
      errorMSG: "Rebalancing relayer operation re-entered unexpectedly.",
    },
    BAL326: {
      keywords: ["BAL#326"],
      errorMSG: "Detected time travel in gradual updates.",
    },
    BAL327: {
      keywords: ["BAL#327"],
      errorMSG: "Swaps are disabled for this pool.",
    },
    BAL328: {
      keywords: ["BAL#328"],
      errorMSG: "Caller is not the owner of the LBP.",
    },
    BAL329: {
      keywords: ["BAL#329"],
      errorMSG: "Price rate calculation resulted in overflow.",
    },
    BAL330: {
      keywords: ["BAL#330"],
      errorMSG: "Invalid join/exit kind while swaps are disabled.",
    },
    BAL331: {
      keywords: ["BAL#331"],
      errorMSG: "Weight change is occurring too quickly.",
    },
    BAL332: {
      keywords: ["BAL#332"],
      errorMSG: "Lower target exceeds upper target in configuration.",
    },
    BAL333: {
      keywords: ["BAL#333"],
      errorMSG: "Upper target value is too high.",
    },
    BAL334: {
      keywords: ["BAL#334"],
      errorMSG: "Unhandled operation by the linear pool.",
    },
    BAL335: {
      keywords: ["BAL#335"],
      errorMSG: "Out of the target range for the operation.",
    },
    BAL336: {
      keywords: ["BAL#336"],
      errorMSG: "Unhandled exit kind detected.",
    },
    BAL337: {
      keywords: ["BAL#337"],
      errorMSG: "Unauthorized exit from the pool.",
    },
    BAL338: {
      keywords: ["BAL#338"],
      errorMSG: "Management swap fee percentage exceeded the maximum.",
    },
    BAL339: {
      keywords: ["BAL#339"],
      errorMSG: "Unhandled operation by the managed pool.",
    },
    BAL340: {
      keywords: ["BAL#340"],
      errorMSG: "Unhandled operation by the phantom pool.",
    },
    BAL341: {
      keywords: ["BAL#341"],
      errorMSG: "Token does not have a valid rate provider.",
    },
    BAL342: {
      keywords: ["BAL#342"],
      errorMSG: "Invalid pool initialization parameters provided.",
    },
    BAL343: {
      keywords: ["BAL#343"],
      errorMSG: "Value is out of the new target range for the operation.",
    },
    BAL344: {
      keywords: ["BAL#344"],
      errorMSG: "This feature is currently disabled.",
    },
    BAL345: {
      keywords: ["BAL#345"],
      errorMSG: "The pool controller is uninitialized.",
    },
    BAL346: {
      keywords: ["BAL#346"],
      errorMSG: "Cannot set swap fee during an ongoing fee change.",
    },
    BAL347: {
      keywords: ["BAL#347"],
      errorMSG: "Cannot set swap fee during pending fee changes.",
    },
    BAL348: {
      keywords: ["BAL#348"],
      errorMSG: "Cannot change tokens during a weight change.",
    },
    BAL349: {
      keywords: ["BAL#349"],
      errorMSG: "Cannot change tokens during pending weight changes.",
    },
    BAL350: {
      keywords: ["BAL#350"],
      errorMSG: "Weight parameter exceeds the maximum allowed.",
    },
    BAL351: { keywords: ["BAL#351"], errorMSG: "Unauthorized join operation." },
    BAL352: {
      keywords: ["BAL#352"],
      errorMSG: "Management AUM fee percentage exceeded the maximum allowed.",
    },
    BAL353: {
      keywords: ["BAL#353"],
      errorMSG: "Fractional target values are not supported.",
    },
    BAL354: {
      keywords: ["BAL#354"],
      errorMSG: "Adding or removing BPT is not allowed in this context.",
    },
    BAL355: {
      keywords: ["BAL#355"],
      errorMSG: "Invalid circuit breaker bounds configuration.",
    },
    BAL356: {
      keywords: ["BAL#356"],
      errorMSG: "The circuit breaker has been triggered.",
    },
    BAL357: {
      keywords: ["BAL#357"],
      errorMSG: "Malicious query detected and reverted.",
    },
    BAL358: {
      keywords: ["BAL#358"],
      errorMSG: "Joins and exits are currently disabled for this pool.",
    },
  },
  LEND: {
    PRICE_FLUCTUATION: {
      keywords: [`function "borrow"`, `function "repay"`, "repay", "borrow"],
      errorMSG:
        "The price of the asset you are trying to borrow has fluctuated too much. Please try again.",
    },
  },
  POL: {
    REWARD_VAULT_FACTORY: {
      keywords: ["VaultAlreadyExists"],
      errorMSG:
        "Failed to create reward vault. A vault already exists with this staking token.",
    },
  },
  PERPS: {
    WRONG_LIMIT_PRICE: {
      keywords: ["WrongLimitPrice"],
      errorMSG:
        "Currently, Limit Prices must be set below the current price for long positions and above for short positions.",
    },
    PRICE_IMPACT_TOO_HIGH: {
      keywords: ["PriceImpactTooHigh"],
      errorMSG: "This position causes too much price impact.",
    },
    MAX_TRADES_PER_PAIR: {
      keywords: ["MaxTradesPerPair"],
      errorMSG:
        "You've exceeded your maximum amount of trades for this market!",
    },
    ABOVE_MAX_POS: {
      keywords: ["AboveMaxPos"],
      errorMSG: "The position's collateral is too high.",
    },
    ABOVE_MAX_GROUP_COLLATERAL: {
      keywords: ["AboveMaxGroupCollateral"],
      errorMSG:
        "The position's collateral is more than the vault can support for this market.",
    },
    BELOW_MIN_POS: {
      keywords: ["BelowMinPos"],
      errorMSG: "The position's volume (leveraged position size) is too low.",
    },
    LEVERAGE_INCORRECT: {
      keywords: ["LeverageIncorrect"],
      errorMSG: "The leverage for this position is either too low or too high.",
    },
    WRONG_TP: {
      keywords: ["WrongTp", "TpReached"],
      errorMSG: "The Take Profit is invalid for this position.",
    },
    WRONG_SL: {
      keywords: ["WrongSl", "SlReached"],
      errorMSG: "The Stop Loss is invalid for this position.",
    },
    NO_TRADE: {
      keywords: ["NoTrade"],
      errorMSG: "This position is no longer open.",
    },
    NO_LIMIT: {
      keywords: ["NoLimit"],
      errorMSG: "This order is no longer open.",
    },
    SLIPPAGE_EXCEEDED: {
      keywords: ["SlippageExceeded"],
      errorMSG:
        "The price just moved significantly! Please set a higher slippage.",
    },
    PAST_EXPOSURE_LIMITS: {
      keywords: ["PastExposureLimits"],
      errorMSG:
        "This position's volume is beyond the safe exposure limits of open interest. Please try again later or with a smaller size.",
    },
    PENDING_WITHDRAWAL: {
      keywords: ["PendingWithdrawal"],
      errorMSG:
        "You have a pending withdrawal. Please wait for it to be processed.",
    },
    MORE_THAN_WITHDRAW_AMOUNT: {
      keywords: ["InsufficientBalance"],
      errorMSG: "You can't cancel more than you've requested to withdraw.",
    },
    NOT_ENOUGH_ASSETS: {
      keywords: ["NotEnoughAssets", "MaxDailyPnL"],
      errorMSG: "The vault cannot settle your position at this time.",
    },
    ARITHMETIC_ERROR: {
      keywords: ["Arithmetic operation resulted in underflow or overflow."],
      errorMSG: "This operation reverted on chain. Please try again later.",
    },
    INVALID_REFERRER: {
      keywords: ["InvalidReferrer"],
      errorMSG: "The referrer address is invalid.",
    },
    ALREADY_REFERRED: {
      keywords: ["AlreadyReferred"],
      errorMSG: "You have already been referred.",
    },
    REFERRAL_CYCLE: {
      keywords: ["ReferralCycle"],
      errorMSG: "You cannot be referred by someone you have already referred.",
    },
    GENERIC_PARAMETERS_ERROR: {
      keywords: ["WrongParams"],
      errorMSG: "The given parameters are invalid.",
    },
    INVALID_PERMISSIONS: {
      keywords: ["Unauthorized"],
      errorMSG: "You are not permitted to execute this operation.",
    },
    PRICE_ORACLE_ERROR: {
      keywords: [
        "InvalidExpo",
        "NoFreshUpdate",
        "PriceFeedNotFoundWithinRange",
        "PriceFeedNotFound",
      ],
      errorMSG:
        "The price oracle failed to return correctly, please try again later.",
    },
    INVALID_CONFIDENCE: {
      keywords: ["InvalidConfidence"],
      errorMSG:
        "The price oracle returned with a very high uncertainty for this market. For safety. Please try again later.",
    },
    STALE_FEED: {
      keywords: ["StalePrice"],
      errorMSG:
        "The price feed from the oracle is currently stale. Please try again later.",
    },
    TRADING_PAUSED: {
      keywords: ["Paused"],
      errorMSG: "Trading has been momentarily paused.",
    },
    POSITION_TIMEOUT: {
      keywords: ["InTimeout"],
      errorMSG:
        "This position is currently in timeout. Please wait for the timeout to expire to execute.",
    },
    MAX_DEPOSIT: {
      keywords: ["MaxDeposit"],
      errorMSG:
        "The vault cannot currently support minting this much bHONEY right now. Please try an amount less than the current max deposit or come back later.",
    },
  },
};

export const getCustomAppErrorMessages = (
  e: any,
  app: "PERPS" | "BEND" | "BALANCER",
) => {
  if (e?.metaMessages?.[0]) {
    const errors = errorMsgMap[app] as ErrorCategory;
    for (const type in errors) {
      const errorType = errors[type];
      if (
        errorType?.keywords.some((keyword) =>
          e.metaMessages[0].includes(keyword),
        )
      ) {
        return errorType.errorMSG;
      }
    }
  }
};

export const getErrorMessage = (e: any): string => {
  // Extract error message from different levels of the error object
  let errorMsgDetails = "";

  for (const key in e) {
    if (e[key]) {
      errorMsgDetails += `${key}: ${String(e[key])}, `;
    }
  }
  for (const category in errorMsgMap) {
    if (
      category !== "GENERAL_ERROR" &&
      typeof errorMsgMap[category] !== "string"
    ) {
      const errors = errorMsgMap[category] as ErrorCategory;
      for (const type in errors) {
        const errorType = errors[type];
        if (
          errorType?.keywords.some((keyword) =>
            errorMsgDetails.includes(keyword),
          )
        ) {
          return errorType.errorMSG;
        }
      }
    }
  }
  return errorMsgMap.GENERAL_ERROR;
};

export const getRevertReason = async (
  publicClient: PublicClient,
  txHash: string | undefined,
): Promise<string | undefined> => {
  if (!txHash) return "Transaction reverted for unknown reason.";
  try {
    // Use public client to get ethers provider since wagmi doesn't have the capability to get revert reasons
    const ethersProvider = clientToProvider(publicClient);
    // Get the transaction details
    const tx = await ethersProvider?.getTransaction(txHash);
    const response = await ethersProvider.call({
      ...(tx as any),
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });
    // Decode the error data (for some reason it's always at index 138)
    const reason = ethers.utils.toUtf8String(`0x${response.substring(138)}`);
    const cleanedReason = reason.replace(/[^\x20-\x7E]/g, ""); // Remove hidden UTF-8 characters

    // Match with Balancer error map
    const balancerErrors = errorMsgMap.BALANCER as ErrorCategory;
    for (const errorCode in balancerErrors) {
      const errorType = balancerErrors[errorCode];
      if (
        errorType?.keywords.some((keyword) => cleanedReason.includes(keyword))
      ) {
        return errorType.errorMSG;
      }
    }

    // Fallback for unknown errors
    return cleanedReason || "Transaction reverted for an unknown reason.";
  } catch (error) {
    console.error(
      "Error fetching transaction or receipt revert reason: ",
      error,
    );
  }
};
