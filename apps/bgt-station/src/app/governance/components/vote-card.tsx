import React from "react";
import { type TallyResult } from "@bera/berajs";
import { Card } from "@bera/ui/card";

interface IVoteCard {
  proposalVotes: TallyResult | undefined;
}

export function VoteCard({ proposalVotes }: IVoteCard) {
  return (
    <Card className="flex w-full p-6">
      <div className="flex flex-1 flex-col items-center gap-2 border-r border-border sm:w-[140px]">
        <div className="text-lg font-semibold leading-9 text-success-foreground sm:text-3xl">
          {proposalVotes?.yesCount ?? 0}%
        </div>
        <div className="flex items-center gap-0.5 text-xs font-medium leading-[14px] text-muted-foreground sm:text-sm">
          Yes
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center gap-2 border-r border-border sm:w-[140px]">
        <div className="text-lg font-semibold leading-9 text-destructive-foreground sm:text-3xl">
          {proposalVotes?.noCount ?? 0}%
        </div>
        <div className="flex items-center gap-0.5 text-xs font-medium leading-[14px] text-muted-foreground sm:text-sm">
          No
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center gap-2 border-r border-border sm:w-[140px]">
        <div className="text-lg font-semibold leading-9 text-info-foreground sm:text-3xl">
          {proposalVotes?.noWithVetoCount ?? 0}%
        </div>
        <div className="flex items-center gap-0.5 text-center text-xs font-medium leading-[14px] text-muted-foreground sm:text-sm">
          No with veto
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center gap-2 sm:w-[140px]">
        <div className="text-lg font-semibold leading-9 text-muted-foreground sm:text-3xl">
          {proposalVotes?.abstainCount ?? 0}%
        </div>
        <div className="flex items-center gap-0.5 text-xs font-medium leading-[14px] text-muted-foreground sm:text-sm">
          Abstain
        </div>
      </div>
    </Card>
  );
}