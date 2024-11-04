import { useEffect, useState } from "react";
import { PoolWithMethods } from "@balancer-labs/sdk";
import { useBgtInflation, type PoolV2 } from "@bera/berajs";
import {
  DataTableColumnHeader,
  FormattedNumber,
  apyTooltipText,
  useAsyncTable,
} from "@bera/shared-ui";
import useSWR from "swr";
import { balancerClient } from "../../b-sdk/balancerClient";
import { calculateApy } from "../../utils/calculateApy";
import { PoolSummary } from "../../components/pools-table-columns";

export const usePoolTable = (sorting: any, page: number, pageSize: number) => {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");

  const sortOption =
    sorting[0] !== undefined && sorting[0].id !== undefined
      ? sorting[0].id
      : "totalLiquidity";
  const sortOrder =
    sorting[0] !== undefined && sorting[0].desc !== undefined
      ? sorting[0].desc === true
        ? "desc"
        : "asc"
      : "desc";

  const handleEnter = (e: any) => {
    if (e.key === "Enter") {
      setKeyword(search);
    }
  };

  const { data, isLoading } = useSWR(["usePoolTable"], async () => {
    const pools = await balancerClient.pools.all();
    return pools;
  });

  const table = useAsyncTable<PoolWithMethods>({
    data: data ?? [],
    fetchData: async () => {},
    additionalTableProps: {
      initialState: { sorting },
      manualPagination: false,
      manualSorting: false,
    },
    enablePagination: true,

    enableRowSelection: false,
    columns: [
      {
        accessorKey: "address",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            className="flex items-center gap-1"
            // tooltip={"Base and Quote assets in the liquidity pool."}
            title={"Pool Composition"}
          />
        ),
        cell: ({ row }) => <PoolSummary pool={row.original} />,
        enableSorting: false,
        enableHiding: false,
        maxSize: 250,
        minSize: 250,
      },
      {
        accessorKey: "totalLiquidity",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            // tooltip="Total amount of assets currently locked in the Pool, valued in HONEY"
            title="TVL"
            className="min-w-[95px]"
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="text-sm leading-5">
              <FormattedNumber
                value={row.original?.totalLiquidity ?? 0}
                symbol="USD"
              />
            </div>
          </div>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "latestPoolDayData__feesUsd",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Fees"
            // tooltip="Total trading fees this pool has generated in the last 24 hours, valued in HONEY"
            className="whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="text-sm leading-5">
              <FormattedNumber
                value={row.original.totalSwapFee ?? "0"}
                symbol="USD"
              />
            </div>
          </div>
        ),
        enableSorting: true,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        sortingFn: (rowA, rowB) => {
          return (
            Number(rowA.original.totalSwapFee ?? "0") -
            Number(rowB.original.totalSwapFee ?? "0")
          );
        },
      },
      {
        accessorKey: "latestPoolDayData__volumeUsd",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Volume"
            // tooltip="Total trading or transaction volume in the last 24 hours"
            className="whitespace-nowrap"
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="text-sm leading-5">
              <FormattedNumber
                value={row.original.totalSwapVolume ?? "0"}
                symbol="USD"
              />
            </div>
          </div>
        ),
        enableSorting: true,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        sortingFn: (rowA, rowB) => {
          return (
            Number(rowA.original.totalSwapVolume ?? "0") -
            Number(rowB.original.totalSwapVolume ?? "0")
          );
        },
      },
      {
        accessorKey: "wtv",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="BGT APY"
            tooltip={apyTooltipText()}
            className="whitespace-nowrap"
          />
        ),
        cell: ({ row }) => {
          const { data: bgtInflation } = useBgtInflation();
          return (
            <div
              className={`flex items-center justify-start text-sm ${
                row.original.apr?.protocolApr === 0
                  ? "text-muted-foreground"
                  : "text-warning-foreground"
              }`}
            >
              <FormattedNumber
                value={calculateApy(
                  row.original.apr?.protocolApr?.toString() ?? "0",
                  bgtInflation?.usdPerYear ?? 0,
                )}
                percent
                compact
                showIsSmallerThanMin
              />
            </div>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        sortingFn: (rowA, rowB) => {
          return 0;
        },
      },
      // {
      //   accessorKey: "btns",
      //   header: ({ column }) => (
      //     <DataTableColumnHeader
      //       column={column}
      //       title="Actions"
      //       className="text-center"
      //     />
      //   ),
      //   cell: ({ row }) => (
      //     <Link
      //       href={getPoolAddLiquidityUrl(row.original)}
      //       onClick={(e) => e.stopPropagation()}
      //     >
      //       <Button variant={"outline"} className="flex items-center gap-1">
      //         <Icons.add className="h-5 w-5" /> Add
      //       </Button>
      //     </Link>
      //   ),
      //   enableSorting: false,
      // },
    ],
  });

  return {
    data,
    table,
    search,
    setSearch,
    isLoading,
    handleEnter,
    keyword,
    setKeyword,
  };
};
