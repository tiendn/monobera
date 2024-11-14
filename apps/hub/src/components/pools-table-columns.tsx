"use client";

import { DataTableColumnHeader, TokenIconList } from "@bera/shared-ui";
import { Badge } from "@bera/ui/badge";
import { type ColumnDef } from "@tanstack/react-table";
import { GqlPoolType, MinimalPoolInListFragment } from "@bera/graphql/dex/api";

export const poolTypeLabels: Record<any, string> = {
  [GqlPoolType.ComposableStable]: "Stable",
  [GqlPoolType.MetaStable]: "Meta Stable",
  [GqlPoolType.Weighted]: "Weighted",
};

export const PoolSummary = ({ pool }: { pool: MinimalPoolInListFragment }) => {
  return (
    <div className="flex flex-row items-start gap-2">
      <TokenIconList
        tokenList={pool?.tokens.filter((t) => t.address !== pool.address)}
        size="xl"
        className="self-center"
      />
      <div className="flex flex-col items-start justify-start gap-1">
        <div className="flex flex-row items-center justify-start gap-1">
          <span className="w-fit max-w-[180px] truncate text-left text-sm font-semibold">
            {pool?.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className=" text-muted-foreground text-xs">
            {pool.type in poolTypeLabels
              ? poolTypeLabels[pool.type]
              : pool.type}
          </span>
          <Badge
            variant={"secondary"}
            className="border-none px-2 py-1 text-[10px] leading-[10px] text-foreground"
          >
            <span>
              {(Number(pool?.dynamicData?.swapFee) * 100).toFixed(2)}%
            </span>
          </Badge>
          {pool.userBalance && pool.userBalance.walletBalance !== "0" && (
            <Badge
              variant="success"
              className="border-none bg-success px-2 py-1 text-[10px] leading-[10px] "
            >
              <span>Provided Liquidity</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export const getUserPoolColumns = (
  refresh: () => void,
): ColumnDef<MinimalPoolInListFragment>[] => {
  return [
    {
      accessorKey: "poolName",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          className="flex items-center gap-1"
          tooltip={"Base and quote assets in the liquidity pool."}
          title={"Pool Composition"}
        />
      ),
      cell: ({ row }) => <PoolSummary pool={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
    // {
    //   accessorKey: "estimatedHoneyValue",
    //   accessorFn: (row) => row.userPosition?.estimatedHoneyValue,
    //   header: ({ column }) => (
    //     <DataTableColumnHeader
    //       column={column}
    //       title="In Wallet"
    //       className="whitespace-nowrap"
    //     />
    //   ),
    //   cell: ({ row }) => (
    //     <div className="flex items-center text-sm">
    //       <FormattedNumber
    //         value={row.original?.userPosition?.estimatedHoneyValue ?? 0}
    //         symbol="USD"
    //       />
    //     </div>
    //   ),
    // },
    // {
    //   accessorKey: "estimatedDepositedHoneyValue",
    //   accessorFn: (row) => row.userPosition?.estimatedDepositedHoneyValue,
    //   header: ({ column }) => (
    //     <DataTableColumnHeader
    //       column={column}
    //       title="In Vault"
    //       className="whitespace-nowrap"
    //     />
    //   ),
    //   cell: ({ row }) => (
    //     <div className="flex items-center text-sm">
    //       {row.original.vaultAddress ? (
    //         <FormattedNumber
    //           value={
    //             row.original?.userPosition?.estimatedDepositedHoneyValue ?? 0
    //           }
    //           compact
    //           symbol="USD"
    //         />
    //       ) : (
    //         <p className="text-muted-foreground">no vault</p>
    //       )}
    //     </div>
    //   ),
    // },
    // {
    //   accessorKey: "bgtEarned",
    //   accessorFn: (row) => row.userPosition?.bgtEarned,
    //   header: ({ column }) => (
    //     <DataTableColumnHeader
    //       column={column}
    //       title="Rewards"
    //       className="whitespace-nowrap"
    //     />
    //   ),
    //   cell: ({ row }) => {
    //     const { data: beraToken } = useSubgraphTokenInformation({
    //       tokenAddress: beraTokenAddress,
    //     });
    //     return (
    //       <div className="flex items-center text-sm">
    //         {/* {row.original.vaultAddress ? (
    //           row.original.userPosition?.estimatedDepositedHoneyValue !== 0 ? (
    //             <div className="flex flex-col gap-0">
    //               <FormattedNumber
    //                 value={row.original?.userPosition?.bgtEarned ?? 0}
    //                 compact
    //                 symbol="BGT"
    //               />
    //               <FormattedNumber
    //                 value={
    //                   parseFloat(row.original?.userPosition?.bgtEarned ?? "0") *
    //                   parseFloat(beraToken?.usdValue ?? "0")
    //                 }
    //                 compact
    //                 className="text-xs text-muted-foreground"
    //                 symbol="USD"
    //               />
    //             </div>
    //           ) : (
    //             <div className="flex w-40 flex-col">
    //               <span className="font-medium">
    //                 {" "}
    //                 Deposit balance in vault to start earning rewards
    //               </span>
    //               <div className="flex flex-row items-center text-success-foreground">
    //                 <Icons.bgt className="mr-1 h-4 w-4" />
    //                 <FormattedNumber value={row.original.wtv ?? 0} compact />%
    //                 APY
    //               </div>
    //             </div>
    //           )
    //         ) : (
    //           <p className="text-muted-foreground">--</p>
    //         )} */}
    //       </div>
    //     );
    //   },
    // },
    // {
    //   accessorKey: "btns",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader
    //       column={column}
    //       title=""
    //       className="text-center"
    //     />
    //   ),
    //   cell: ({ row }) => {
    //     const { account } = useBeraJs();
    //     const { write } = useTxn({
    //       message: "Claim BGT Rewards",
    //       actionType: TransactionActionType.CLAIMING_REWARDS,
    //       onSuccess: () => {
    //         refresh();
    //       },
    //     });
    //     return (
    //       <div className="w-100 flex flex-row items-center justify-center gap-1">
    //         {row.original.vaultAddress ? (
    //           row.original.userPosition?.estimatedDepositedHoneyValue !== 0 ? (
    //             <Button
    //               size="sm"
    //               variant="outline"
    //               onClick={(e) => {
    //                 e.stopPropagation();
    //                 write({
    //                   address: (row.original.vaultAddress ??
    //                     ADDRESS_ZERO) as Address,
    //                   abi: BERA_VAULT_REWARDS_ABI,
    //                   functionName: "getReward",
    //                   params: [account!],
    //                 });
    //               }}
    //             >
    //               Claim
    //             </Button>
    //           ) : (
    //             <Link
    //               href={getRewardsVaultUrl(row.original.vaultAddress)}
    //               onClick={(e) => e.stopPropagation()}
    //             >
    //               <Button variant={"outline"} size="sm">
    //                 Deposit
    //               </Button>
    //             </Link>
    //           )
    //         ) : (
    //           <></>
    //         )}
    //       </div>
    //     );
    //   },
    //   enableSorting: false,
    // },
  ];
};
