"use client";
import React, { useEffect, type PropsWithChildren } from "react";
import { BeraWagmi } from "@bera/wagmi";
import { ThemeProvider } from "~/components/theme-provider";
import { BeraJsProvider, BlockTimeProvider } from "@bera/berajs";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";

export default function Providers({ children }: PropsWithChildren<any>) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return;
    }
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    });
  }, []);
  return (
    <PostHogProvider client={posthog}>
      <BeraWagmi>
        <BeraJsProvider configOverride={undefined}>
          <BlockTimeProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              {children}
            </ThemeProvider>
          </BlockTimeProvider>
        </BeraJsProvider>
      </BeraWagmi>
    </PostHogProvider>
  );
}
