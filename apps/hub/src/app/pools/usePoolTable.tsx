import { useState } from "react";
import { useBgtInflation, type PoolV2 } from "@bera/berajs";
import {
  DataTableColumnHeader,
  FormattedNumber,
  useAsyncTable,
} from "@bera/shared-ui";
import { PoolSummary } from "../../components/pools-table-columns";
import { MinimalPoolInListFragment } from "@bera/graphql/dex/api";
import { usePools } from "./usePools";

export const usePoolTable = ({
  sorting,
  userPoolsOnly,
}: {
  sorting: any;
  page: number;
  pageSize: number;
  textSearch?: string;
  userPoolsOnly?: boolean;
}) => {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");

  const handleEnter = (e: any) => {
    if (e.key === "Enter") {
      setKeyword(search);
    }
  };

  const {
    pools: allPools,
    isPoolsLoading,
    walletPools,
  } = usePools({ keyword });

  const pools = userPoolsOnly ? walletPools : allPools;

  const table = useAsyncTable<MinimalPoolInListFragment>({
    data: pools ?? [],
    fetchData: async () => {},
    additionalTableProps: {
      initialState: { sorting, pagination: { pageSize: 10, pageIndex: 0 } },
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
        // maxSize: 250,
        minSize: 280,
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
                value={row.original?.dynamicData?.totalLiquidity ?? 0}
                symbol="USD"
              />
            </div>
          </div>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
        sortingFn: (rowA, rowB) => {
          return (
            Number(rowA.original.dynamicData.totalLiquidity ?? "0") -
            Number(rowB.original.dynamicData.totalLiquidity ?? "0")
          );
        },
      },
      {
        accessorKey: "dynamicData__fees24h",
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
                value={row.original.dynamicData.fees24h ?? "0"}
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
            Number(rowA.original.dynamicData.fees24h ?? "0") -
            Number(rowB.original.dynamicData.fees24h ?? "0")
          );
        },
      },
      {
        accessorKey: "dynamicData__volume24h",
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
                value={row.original.dynamicData.volume24h ?? "0"}
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
            Number(rowA.original.dynamicData.volume24h ?? "0") -
            Number(rowB.original.dynamicData.volume24h ?? "0")
          );
        },
      },
      {
        accessorKey: "dynamicData__aprItems__0__apr",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="APR"
            // tooltip={apyTooltipText()}
            className="whitespace-nowrap"
          />
        ),
        cell: ({ row }) => {
          const { data: bgtInflation } = useBgtInflation();
          return (
            <div
              className={`flex items-center justify-start text-sm ${
                row.original.dynamicData.aprItems?.at(0)?.apr === 0
                  ? "text-muted-foreground"
                  : "text-warning-foreground"
              }`}
            >
              <FormattedNumber
                value={
                  row.original.dynamicData.aprItems?.at(0)?.apr?.toString() ??
                  "0"
                }
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
          return (
            Number(rowA.original.dynamicData.aprItems?.at(0)?.apr ?? "0") -
            Number(rowB.original.dynamicData.aprItems?.at(0)?.apr ?? "0")
          );
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
    data: pools,
    table,
    search,
    setSearch,
    isLoading: isPoolsLoading,
    handleEnter,
    keyword,
    setKeyword,
  };
};
