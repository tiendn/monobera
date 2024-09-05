import React from "react";
import Link from "next/link";
import { Button } from "@bera/ui/button";
import { Icons } from "@bera/ui/icons";

import { Dapp } from "../../governance-genre-helper";
import { ProposalsList } from "./proposals-list";
import { UserVotingPower } from "./user-voting-power";

export default function GovernanceByStatus({ dapp }: { dapp: Dapp }) {
  return (
    <div>
      <Link
        href={"/governance"}
        className="mb-8 flex cursor-pointer gap-2 font-semibold"
      >
        <Icons.arrowLeft />
        Back to Governance Menu
      </Link>
      <div
        className="font-bold uppercase tracking-widest"
        style={{ color: dapp.color }}
      >
        {dapp.name}
      </div>
      <div className="text-forergound text-3xl font-bold leading-9 sm:text-5xl sm:leading-[48px]">
        Vote on proposals <br />
        or create your own
      </div>
      <div className="mx-auto my-8 flex w-[165px] flex-col gap-3 sm:w-full sm:flex-row">
        <Link href={`/governance/${dapp.link}/create`}>
          <Button>Create proposal</Button>
        </Link>
        <Button variant="secondary">Visit forums</Button>
      </div>

      <div className="flex flex-col-reverse gap-4 pt-10 lg:flex-row">
        <ProposalsList />
        <UserVotingPower />
      </div>
    </div>
  );
}
