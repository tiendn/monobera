import React from "react";
import { RewardVaultIncentive, useTokenHoneyPrice } from "@bera/berajs";
import {
  DataTableColumnHeader,
  FormattedNumber,
  TokenIcon,
} from "@bera/shared-ui";
import { Button } from "@bera/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { type ActiveIncentiveWithVault } from "~/types/validators";
import { GaugeHeaderWidget } from "~/components/gauge-header-widget";

export const gauge_incentives_columns: ColumnDef<RewardVaultIncentive>[] = [
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Incentive Breakdown" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-row items-center gap-1">
          <TokenIcon address={row.original.token.address} />
          <div>{row.original.token.symbol}</div>
        </div>
      );
    },
    accessorKey: "token",
    enableSorting: false,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Incentive Rate"
        tooltip={"The amount of token emitted per BGT sent to the vault"}
      />
    ),
    cell: ({ row }) => {
      const { data: price } = useTokenHoneyPrice({
        tokenAddress: row.original.token.address,
      });
      return (
        <div className="flex flex-col gap-1">
          <FormattedNumber
            value={row.original.incentiveRate}
            symbol={row.original.token.symbol}
          />
          <span className="text-xs text-muted-foreground">
            <FormattedNumber
              value={row.original.incentiveRate * parseFloat(price ?? "0")}
              symbol="USD"
            />
          </span>
        </div>
      );
    },
    accessorKey: "incentiveRate",
    enableSorting: false,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Amount Left"
        tooltip={"The amount of incentives remaining"}
      />
    ),
    cell: ({ row }) => {
      const { data: price } = useTokenHoneyPrice({
        tokenAddress: row.original.token.address,
      });
      return (
        <div className="flex flex-col gap-1">
          <FormattedNumber
            value={row.original.amountRemaining}
            symbol={row.original.token.symbol}
          />
          <span className="text-xs text-muted-foreground">
            <FormattedNumber
              value={row.original.amountRemaining * parseFloat(price ?? "0")}
              symbol="USD"
            />
          </span>
        </div>
      );
    },
    accessorKey: "incentiveAmount",
    enableSorting: false,
  },
];

export const validator_gauge_columns: ColumnDef<ActiveIncentiveWithVault>[] = [
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reward Vaults" />
    ),
    cell: ({ row }) => (
      <GaugeHeaderWidget
        // TODO: fix this
        address={row.original.cuttingBoard?.receiver ?? "0x"}
        className="w-[150px]"
      />
    ),
    accessorKey: "gauge",
    enableSorting: false,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Icentives Breakdown" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-row items-center gap-1">
          <TokenIcon address={row.original.token.address} />
          <div>{row.original.token.symbol}</div>
        </div>
      );
    },
    accessorKey: "token",
    enableSorting: false,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Incentive Rate"
        tooltip={"The amount of token emitted per BGT sent to the vault"}
      />
    ),
    cell: ({ row }) => {
      const { data: price } = useTokenHoneyPrice({
        tokenAddress: row.original.token.address,
      });
      return (
        <div className="flex flex-col gap-1">
          <FormattedNumber value={row.original.incentiveRate} compact={false} />
          <div className="text-xs text-muted-foreground">
            $
            <FormattedNumber
              value={row.original.incentiveRate * parseFloat(price ?? "0")}
              compact={false}
            />
          </div>
        </div>
      );
    },
    accessorKey: "incentiveRate",
    enableSorting: false,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Amount Left"
        tooltip={"The amount of incentives remaining"}
      />
    ),
    cell: ({ row }) => {
      const { data: price } = useTokenHoneyPrice({
        tokenAddress: row.original.token.address,
      });
      return (
        <div className="flex flex-col gap-1">
          <FormattedNumber
            value={row.original.amountRemaining}
            compact={false}
          />
          <div className="text-xs text-muted-foreground">
            $
            <FormattedNumber
              value={row.original.amountRemaining * parseFloat(price ?? "0")}
              compact={false}
            />
          </div>
        </div>
      );
    },
    accessorKey: "incentiveAmount",
    enableSorting: false,
  },
];
