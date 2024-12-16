import {
  ProposalSelectionFragment,
  ProposalStatus,
  ProposalWithVotesFragment,
} from "@bera/graphql/governance";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBlockNumber } from "wagmi";
import { useSWRConfig } from "swr";

type ProposalInput = ProposalSelectionFragment | ProposalSelectionFragment[];

/**
 * Monitors the status of one or multiple proposals and refetches them when their status changes
 * @param proposals - Single proposal or array of proposals to monitor
 */
export const useProposalStatusMonitor = (proposals: ProposalInput) => {
  const { data: currentBlockNumber } = useBlockNumber({
    watch: {
      pollingInterval: 5000,
      enabled: true,
      poll: true,
    },
  });
  const router = useRouter();
  const { mutate: refreshPollProposal } = useSWRConfig();

  useEffect(() => {
    if (proposals === undefined) return;
    if (!currentBlockNumber || !proposals) return;

    const proposalsArray = Array.isArray(proposals) ? proposals : [proposals];

    const statusChecks = {
      [ProposalStatus.Pending]: (p: ProposalSelectionFragment) =>
        p.voteStartBlock,
      [ProposalStatus.Active]: (p: ProposalSelectionFragment) => p.voteEndBlock,
      [ProposalStatus.InQueue]: (p: ProposalSelectionFragment) => p.queueEnd,
    };

    proposalsArray.forEach((proposal) => {
      const getThreshold =
        statusChecks[proposal.status as keyof typeof statusChecks];
      if (!getThreshold) return;

      const threshold = getThreshold(proposal);
      if (currentBlockNumber >= BigInt(threshold)) {
        refreshPollProposal(["usePollProposal", proposal.id]);
      }
    });
  }, [proposals, currentBlockNumber, router]);
};
