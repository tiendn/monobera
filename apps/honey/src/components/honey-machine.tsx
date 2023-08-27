"use client";

import { useEffect, useReducer, useState } from "react";
import Image from "next/image";
import { ConnectButton, useTxn } from "@bera/shared-ui";
import { cn } from "@bera/ui";
import {
  EventType,
  Fit,
  Layout,
  useRive,
  useStateMachineInput,
} from "@rive-app/react-canvas";
import { motion } from "framer-motion";
import { erc20ABI } from "wagmi";

import { cloudinaryUrl } from "~/config";
import { ERC20_HONEY_ABI } from "~/hooks/abi";
import { usePsm } from "~/hooks/usePsm";
import { HoneyTokenInput } from "./honey-token-input";

interface State {
  currentState: "approval" | "minting" | "redeeming" | "idle";
  isLoading: boolean;
  error: string | null;
}

type Action =
  | {
      type: "SET_STATE";
      payload: "approval" | "minting" | "redeeming" | "idle";
    }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string };

const initialState: State = {
  currentState: "idle",
  isLoading: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_STATE":
      return {
        ...state,
        currentState: action.payload,
        isLoading: false,
        error: null,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
        error: null,
      };
    case "SET_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

export function HoneyMachine() {
  const STATE_MACHINE_NAME = "honeyMachineSquare";
  const [state, dispatch] = useReducer(reducer, initialState);

  const { RiveComponent, rive } = useRive({
    src: "/honeyMachineSquare.riv",
    stateMachines: STATE_MACHINE_NAME,
    artboard: "honeyMachineSquare",
    autoplay: false,
    layout: new Layout({ fit: Fit.Contain }),
  });

  // user manually reject the transaction or input value 0
  const rejectAction = useStateMachineInput(rive, STATE_MACHINE_NAME, "reject");

  // submit metamask transaction approval/mint/redeem
  const txnSubmitAction = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "txnSubmitted",
  );

  // triggered when submit the transaction for mint/redeem
  const clawDownAction = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "toClawDown",
  );

  const approvalTxnSuccess = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "userApproval",
  );

  const mintTxnSuccess = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "mintTxnSuccess",
  );
  const redeemTxnSuccess = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "redeemTxnSuccess",
  );

  const txnFail = useStateMachineInput(rive, STATE_MACHINE_NAME, "txnFail");

  const {
    payload,
    isConnected,
    setSelectedFrom,
    // allowance,
    selectedFrom,
    selectedTo,
    setSelectedTo,
    fromAmount,
    setFromAmount,
    toAmount,
    setToAmount,
    isMint,
    fromBalance,
    toBalance,
    fee,
    fee2,
    ModalPortal,
    needsApproval,
  } = usePsm();

  // console.log(
  //   payload,
  //   payload[2],
  //   fromAmount,
  //   allowance?.formattedAllowance,
  //   needsApproval,
  // fromBalance?.balance,
  //   fromBalance?.formattedBalance,
  //   toBalance?.formattedBalance,
  // );

  const { write } = useTxn({
    message: isMint ? "Mint Honey" : "Redeem Honey",
    onError: (e: any) => {
      if (e.name === "TransactionExecutionError") {
        // rejection should be triggered when transaction fails(after metamask popup)
        rejectAction?.fire();
      } else {
        // rejection should be triggered when user reject or input amount 0( before metamask popup)
        txnFail?.fire();
      }
    },
    onSuccess: () => {
      // console.log("onSuccess", "approval", "isMint", isMint);
      if (needsApproval) {
        approvalTxnSuccess?.fire();
        // console.log("fire approval success");
      } else {
        if (isMint) {
          mintTxnSuccess?.fire();
          // console.log("fire mint success");
        } else {
          redeemTxnSuccess?.fire();
          // console.log("fire redeem success");
        }
      }
    },
    // onLoading: () => {
    //   console.log("onLoading" );
    // },
    onSubmission: () => {
      // console.log("onSubmission", "txnSubmitAction");
      if (needsApproval) {
        txnSubmitAction?.fire();
      } else {
        clawDownAction?.fire();
      }
    },
  });

  const [rotate, setRotate] = useState(0);

  const isConnectedState = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    "connectWallet",
  );

  useEffect(() => {
    if (rive) {
      rive.play();
    }
  }, [rive]);

  useEffect(() => {
    if (rive) {
      rive.on(EventType.StateChange, (event: any) => {
        // console.log(event.data, event.eventType);
        if (event.data[0] === "wallet") {
          if (needsApproval) {
            dispatch({ type: "SET_STATE", payload: "approval" });
          } else {
            if (isMint) {
              dispatch({ type: "SET_STATE", payload: "minting" });
            } else {
              dispatch({ type: "SET_STATE", payload: "redeeming" });
            }
          }
        } else {
          if (event.data[0] === "machineIdle") {
            dispatch({ type: "SET_STATE", payload: "idle" });
          }
        }
      });
    }
  }, [payload, rive, needsApproval]);

  const performApproval = () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      write({
        address: selectedFrom?.address as `0x${string}`,
        abi: erc20ABI as unknown as (typeof erc20ABI)[],
        functionName: "approve",
        params: [
          process.env.NEXT_PUBLIC_ERC20_HONEY_ADDRESS as string,
          1000000n,
        ],
      });
    } catch (error: any) {
      dispatch({ type: "SET_STATE", payload: "idle" });
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  };

  const performMinting = () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      // console.log(payload[2], Number(fromBalance.formattedBalance));
      if (Number(payload[2]) > 0 && payload[2] <= fromBalance.balance) {
        // console.log(
        //   Number(payload[2].toString),
        //   Number(fromBalance.formattedBalance),
        // );
        write({
          address: process.env.NEXT_PUBLIC_ERC20_HONEY_ADDRESS as `0x{string}`,
          abi: ERC20_HONEY_ABI,
          functionName: "mint",
          params: payload,
        });
      } else {
        rejectAction?.fire();
      }
    } catch (error: any) {
      dispatch({ type: "SET_STATE", payload: "idle" });
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  };

  const performRedeeming = () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      if (Number(payload[1]) > 0 && payload[1] <= fromBalance.balance) {
        write({
          address: process.env.NEXT_PUBLIC_ERC20_HONEY_ADDRESS as `0x{string}`,
          abi: ERC20_HONEY_ABI,
          functionName: "redeem",
          params: payload,
        });
      } else {
        rejectAction?.fire();
      }
    } catch (error: any) {
      dispatch({ type: "SET_STATE", payload: "idle" });
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  };

  useEffect(() => {
    if (isConnected) {
      if (isConnectedState) {
        isConnectedState.value = true;
      }
    } else {
      if (isConnectedState) {
        isConnectedState.value = false;
      }
    }
  }, [isConnected, isConnectedState]);

  // Perform the contract calls based on the current state
  useEffect(() => {
    switch (state.currentState) {
      case "approval":
        performApproval();
        break;
      case "minting":
        performMinting();
        break;
      case "redeeming":
        performRedeeming();
        break;
      default:
        // Handle any additional states or transitions here
        break;
    }
  }, [state.currentState]);

  return (
    <>
      <div className="relative bg-[#468DCB] pb-12">
        {ModalPortal}

        {rive ? (
          <div
            className={cn(
              "absolute bottom-[50px] left-[45px] z-30 m-6 h-[250px] w-[30%] max-w-[230px] overflow-hidden",
              !isConnected && "bottom-12",
            )}
          >
            {isConnected ? (
              <>
                <h1 className="relative mb-1 text-2xl font-semibold text-foreground">
                  {isMint ? "Mint" : "Redeem"}
                  <div className="absolute right-0 top-1 text-sm text-muted-foreground">
                    Static fee of 69%
                  </div>
                </h1>
                <ul role="list">
                  <HoneyTokenInput
                    selected={selectedFrom}
                    selectedTokens={[selectedFrom, selectedTo]}
                    onTokenSelection={setSelectedFrom}
                    amount={fromAmount ?? 0}
                    balance={fromBalance?.formattedBalance}
                    selectable={false}
                    hidePrice
                    setAmount={(amount) => {
                      setFromAmount(Number(amount));
                      setToAmount(Number(amount) * fee);
                    }}
                  />
                  <div className="flex justify-center">
                    <motion.div
                      animate={{ rotate }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 7,
                      }}
                    >
                      <button
                        onClick={() => {
                          setSelectedFrom(selectedTo);
                          setSelectedTo(selectedFrom);
                          setRotate(rotate + 180);
                        }}
                      >
                        <Image
                          src={`${cloudinaryUrl}/honey/xf16svjytnrzqbgmlafk`}
                          width={50}
                          height={50}
                          alt="Swap icon"
                          className="pt-1"
                        />
                      </button>
                    </motion.div>
                  </div>
                  <HoneyTokenInput
                    selected={selectedTo}
                    selectedTokens={[selectedFrom, selectedTo]}
                    amount={toAmount}
                    setAmount={(amount) => {
                      setToAmount(Number(amount));
                      setFromAmount(Number(amount) * fee2);
                    }}
                    selectable={false}
                    hidePrice
                    hideBalance
                    balance={toBalance?.formattedBalance}
                  />
                </ul>
              </>
            ) : (
              <ConnectButton className="w-full" />
            )}
          </div>
        ) : (
          <div className=" absolute top-0 flex h-[1048px] w-full items-center justify-center text-3xl text-white">
            Loading...
          </div>
        )}

        <div className="h-[1000px] w-[1000px]">
          <RiveComponent />
        </div>
      </div>
    </>
  );
}