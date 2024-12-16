import { ProposalWithVotesFragment } from "@bera/graphql/governance";
import useSWR from "swr";
import { usePublicClient } from "wagmi";

import { getProposalDetails } from "~/actions/governance/getProposalDetails";
import { useBeraJs } from "~/contexts";
import POLLING from "~/enum/polling";
import { DefaultHookOptions, DefaultHookReturnType, Vote } from "~/types";

export interface UsePollProposalResponse
  extends DefaultHookReturnType<ProposalWithVotesFragment> {}

/**
 * Polls a proposal and returns the proposal details.
 * Pulls data from the subgraph and onchain.
 *
 * @param proposalId - The ID of the proposal to poll
 * @param options - Optional configuration options
 * @returns {UsePollProposalResponse} Object containing:
 *   - data: ProposalWithVotesFragment | undefined - The proposal data if successful
 *   - error: Error | undefined - Error object if request failed
 *   - isLoading: boolean - True while data is being fetched
 *   - isValidating: boolean - True while data is being revalidated
 *   - refresh: () => Promise<void> - Function to manually refresh the data
 */
export const usePollProposal = (
  proposalId: string,
  options?: DefaultHookOptions,
): UsePollProposalResponse => {
  const { config: beraConfig } = useBeraJs();
  const publicClient = usePublicClient();
  const config = options?.beraConfigOverride ?? beraConfig;
  const QUERY_KEY = proposalId ? ["usePollProposal", proposalId] : null;

  const swrResponse = useSWR<ProposalWithVotesFragment>(
    QUERY_KEY,
    async () =>
      await getProposalDetails({ proposalId, config, client: publicClient }),
    {
      ...options?.opts,
      refreshInterval: options?.opts?.refreshInterval ?? POLLING.SLOW,
    },
  );

  // const votes = swrResponse.data?.votes.nodes ?? [];
  return {
    ...swrResponse,
    refresh: () => swrResponse?.mutate?.(),
  };
};
