import React, { useState, useEffect } from "react";
import { Badge } from "@bera/ui/badge";
import { formatTimeLeft, getBadgeColor, getTimeLeft } from "../helper";
import { useBlockToTimestamp } from "@bera/berajs";
import { cn } from "@bera/ui";
import {
  ProposalSelectionFragment,
  ProposalStatus,
} from "@bera/graphql/governance";

export const statusMap: Record<ProposalStatus, string> = {
  [ProposalStatus.Active]: "Active",
  [ProposalStatus.CanceledByGuardian]: "Canceled by guardian",
  [ProposalStatus.CanceledByUser]: "Canceled by user",
  [ProposalStatus.Defeated]: "Defeated",
  [ProposalStatus.Executed]: "Executed",
  [ProposalStatus.InQueue]: "In queue",
  [ProposalStatus.Pending]: "Pending",
  [ProposalStatus.PendingExecution]: "Pending execution",
  [ProposalStatus.PendingQueue]: "Pending queue",
  [ProposalStatus.QuorumNotReached]: "Quorum not reached",
};

export const StatusBadge = ({
  proposal,
  className,
}: { proposal: ProposalSelectionFragment; className?: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  const start = useBlockToTimestamp(
    proposal.status === ProposalStatus.Pending
      ? proposal.voteStartBlock
      : undefined,
  );
  const end = useBlockToTimestamp(
    proposal.status === ProposalStatus.Active
      ? proposal.voteEndBlock
      : undefined,
  );

  useEffect(() => {
    const updateTime = () => {
      const timestamp =
        proposal.status === ProposalStatus.Pending
          ? start
          : proposal.status === ProposalStatus.Active
            ? end
            : null;

      if (timestamp) {
        console.log(formatTimeLeft(getTimeLeft(new Date(timestamp * 1000))));
        setTimeLeft(formatTimeLeft(getTimeLeft(new Date(timestamp * 1000))));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 5000);

    return () => clearInterval(interval);
  }, [proposal.status, start, end]);

  return (
    <div
      className={cn(
        "text-xs col-span-full font-medium leading-6 text-muted-foreground",
        className,
      )}
    >
      <Badge
        variant={getBadgeColor(proposal.status)}
        className="mr-3 select-none rounded-xs px-2 py-1 text-sm leading-none font-semibold capitalize"
      >
        {statusMap[proposal.status]}
      </Badge>
      {(proposal.status === ProposalStatus.Pending ||
        proposal.status === ProposalStatus.Active) &&
        timeLeft && <span className="whitespace-nowrap">{timeLeft} left</span>}
    </div>
  );
};

export default StatusBadge;
