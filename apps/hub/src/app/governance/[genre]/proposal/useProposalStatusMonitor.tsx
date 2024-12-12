import {
  ProposalStatus,
  ProposalWithVotesFragment,
} from "@bera/graphql/governance";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBlockNumber } from "wagmi";

/**
 * Monitors the status of a proposal and refreshes the page when the status changes.
 * @param proposal
 */
export const useProposalStatusMonitor = (
  proposal: ProposalWithVotesFragment,
) => {
  const { data: currentBlockNumber } = useBlockNumber({
    watch: {
      pollingInterval: 5000,
    },
  });
  const router = useRouter();

  useEffect(() => {
    if (!currentBlockNumber || !proposal) return;

    const statusChecks = {
      [ProposalStatus.Pending]: proposal.voteStartBlock,
      [ProposalStatus.Active]: proposal.voteEndBlock,
      [ProposalStatus.InQueue]: proposal.queueEnd,
    };

    const threshold =
      statusChecks[proposal.status as keyof typeof statusChecks];

    if (threshold && currentBlockNumber >= BigInt(threshold)) {
      router.refresh();
    }
  }, [proposal, currentBlockNumber, router]);
};
