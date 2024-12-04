"use client";

import { HoneyMachine } from "~/components/honey-machine";
import Hero from "./hero";
import { SwapCard } from "./swap-card";

export default function HoneyPage({ arcade = false }: { arcade?: boolean }) {
  return (
    <section>
      <div className="m-auto block max-w-[1200px]">
        <HoneyMachine />
      </div>
    </section>
  );
}
