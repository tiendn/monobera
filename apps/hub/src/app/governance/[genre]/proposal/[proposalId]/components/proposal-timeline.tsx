import React from "react";
import { useBlockToTimestamp, usePollProposalVotes } from "@bera/berajs";
import { cn } from "@bera/ui";
import {
  OrderDirection,
  ProposalStatus,
  ProposalWithVotesFragment,
  Vote,
} from "@bera/graphql/governance";
import { useBlockNumber } from "wagmi";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

type BaseStepType = {
  title: string;
  isActive: boolean;
  bulletClassName?: string;
};

type StepWithDate = BaseStepType & {
  date: number | Date;
  block?: never;
};

type StepWithBlock = BaseStepType & {
  block: number | bigint | string;
  date?: never;
};

type StepProps = StepWithDate | StepWithBlock;

const TimelineStep: React.FC<StepProps> = ({
  title,
  date,
  isActive,
  block,
  bulletClassName,
}) => {
  const timestamp = block ? useBlockToTimestamp(block) : date;
  const formattedDate = timestamp
    ? DATE_FORMATTER.format(
        timestamp instanceof Date ? timestamp : timestamp * 1000,
      )
    : "--";

  return (
    <div className="flex gap-2 items-center pb-16 last:pb-6 group/step">
      <div>
        <div
          className={cn("h-4 w-4 rounded-full relative flex justify-center", {
            [bulletClassName ?? "bg-primary"]: isActive,
            "bg-primary-foreground": !isActive,
          })}
        >
          <div className="h-16 bg-primary-foreground w-[1px] absolute top-full group-last/step:hidden" />
        </div>
      </div>
      <div className="h-4">
        <h3 className="leading-none text-primary mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>
    </div>
  );
};

const getInitialStep = (proposal: ProposalWithVotesFragment): StepProps => ({
  title: "Initiated",
  date: proposal.createdAt,
  block: proposal.createdAtBlock,
  isActive: proposal.status === ProposalStatus.Pending,
});

const getCanceledStep = (proposal: ProposalWithVotesFragment): StepProps => ({
  title: "Canceled by proposer",
  date: proposal.canceledAt,
  isActive: true,
  bulletClassName: "bg-destructive-foreground",
});

const getVotingSteps = (proposal: ProposalWithVotesFragment): StepProps[] => {
  const initialVotingStep: StepProps = {
    title: "Voting Period Started",
    block: proposal.voteStartBlock ?? 0,
    isActive: proposal.status === ProposalStatus.Active,
  };

  const votingSteps: StepProps[] = [initialVotingStep];

  switch (proposal.status) {
    case ProposalStatus.Active:
    case ProposalStatus.Pending:
      votingSteps.push({
        title: "Voting Period Ends",
        block: proposal.voteEndBlock,
        isActive: false,
      });
      break;

    case ProposalStatus.Defeated:
    case ProposalStatus.QuorumNotReached:
      votingSteps.push({
        title: "Proposal Defeated",
        bulletClassName: "bg-destructive-foreground",
        block: proposal.voteEndBlock,
        isActive: true,
      });
      break;
    case ProposalStatus.Executed:
      if (proposal.succeededAt) {
        votingSteps.push({
          title: "Quorum Reached",
          date: proposal.succeededAt,
          bulletClassName: "bg-success-foreground",
          isActive: false,
        });
      } else {
        votingSteps.push({
          title: "Voting Period Ended",
          block: proposal.voteEndBlock,
          bulletClassName: "bg-success-foreground",
          isActive: false,
        });
      }
      break;
    default:
      if (proposal.succeededAt) {
        votingSteps.push({
          title: "Quorum Reached",
          date: proposal.succeededAt,
          bulletClassName: "bg-success-foreground",
          isActive: proposal.status === ProposalStatus.PendingQueue,
        });
        break;
      }

      votingSteps.push({
        title: "Voting Period Ended",
        block: proposal.voteEndBlock,
        bulletClassName: "bg-success-foreground",
        isActive: proposal.status === ProposalStatus.PendingQueue,
      });
  }

  return votingSteps;
};

const getExecutionSteps = (
  proposal: ProposalWithVotesFragment,
): StepProps[] => {
  const steps: StepProps[] = [];

  switch (proposal.status) {
    case ProposalStatus.CanceledByGuardian:
      steps.push({
        title: "Canceled by guardian",
        date: proposal.canceledAt,
        isActive: true,
        bulletClassName: "bg-destructive-foreground",
      });
      break;
    case ProposalStatus.InQueue:
      steps.push({
        title: "Proposal Queued",
        date: proposal.queueStart,
        isActive: true,
      });
      steps.push({
        title: "Queue Ending",
        date: proposal.queueEnd,
        isActive: false,
      });
      break;
    case ProposalStatus.PendingExecution:
      steps.push({
        title: "Proposal Executable",
        date: proposal.queueEnd,
        isActive: true,
      });
      break;
    case ProposalStatus.Executed:
      steps.push({
        title: "Proposal Queued",
        date: proposal.queueStart,
        isActive: false,
      });
      steps.push({
        title: "Queue Ended",
        date: proposal.queueEnd,
        isActive: false,
      });
      steps.push({
        title: "Proposal Executed",
        date: proposal.executedAt,
        isActive: true,
        bulletClassName: "bg-success-foreground",
      });
      break;
  }

  return steps;
};

export const ProposalTimeline: React.FC<{
  proposal: ProposalWithVotesFragment;
}> = ({ proposal }) => {
  const { data: latestVotes } = usePollProposalVotes(
    {
      proposalId: proposal.id,
      orderDirection: OrderDirection.Desc,
    },
    1,
  );

  const { data: currentBlockNumber } = useBlockNumber();

  const latestVote = latestVotes?.[0]?.data?.votes[0];

  const steps = [getInitialStep(proposal)];

  switch (proposal.status) {
    case ProposalStatus.CanceledByUser:
      steps.push(getCanceledStep(proposal));
      break;
    default:
      steps.push(...getVotingSteps(proposal));
      steps.push(...getExecutionSteps(proposal));
  }

  console.log(steps);

  return (
    <div className="gap-4 p-5 rounded-sm border border-border relative">
      {steps.map((step) => (
        <TimelineStep key={step.title} {...step} />
      ))}
    </div>
  );
};

export default ProposalTimeline;
