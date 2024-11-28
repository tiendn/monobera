/* eslint-disable no-restricted-imports */
import {
  developmentAnalytics,
  mixpanelProjectToken,
  postHogHostAddress,
  postHogProjectKey,
  projectName,
} from "@bera/config";
import {
  captureEvent as _captureEvent,
  captureException as _captureException,
} from "@sentry/react";
import mixpanel from "mixpanel-browser";
import posthog from "posthog-js";

const isDevelopmentWithoutAnalytics =
  process.env.NODE_ENV === "development" && !developmentAnalytics;

// Initialize Mixpanel
const isMixpanelEnabled =
  mixpanelProjectToken && !isDevelopmentWithoutAnalytics;

if (isMixpanelEnabled) {
  // NOTE: the events have changed since we integrated PostHog, so if you enable mixPanel and see this comment you are mixing.
  mixpanel.init(mixpanelProjectToken, {
    debug: true,
    track_pageview: true,
    persistence: "localStorage",
  });
  mixpanel.register({
    project: projectName ?? "unknown",
    env: process.env.NODE_ENV,
  });
}

// Initialize PostHog
const isPosthogEnabled = postHogProjectKey && !isDevelopmentWithoutAnalytics;

if (isPosthogEnabled) {
  posthog.init(postHogProjectKey, {
    api_host: postHogHostAddress,
    debug: true,
    persistence: "localStorage",
  });
  console.log(
    "POSTHOG IS ENABLED!!!!",
    postHogProjectKey,
    isDevelopmentWithoutAnalytics,
  );
} else {
  console.log(
    "POSTHOG IS NOT ENABLED!!!!",
    postHogProjectKey,
    isDevelopmentWithoutAnalytics,
  );
}

export const useAnalytics = () => {
  const captureException: typeof _captureException = (
    error: any,
    hint: any,
  ) => {
    return _captureException(error, hint);
  };

  const setAnalyticsUserId = (userId: string) => {
    if (isMixpanelEnabled) {
      mixpanel.reset();
      mixpanel.identify(userId);
    }
    if (isPosthogEnabled) {
      posthog.reset();
      posthog.identify(userId);
    }
  };

  const unsetAnalyticsUserId = () => {
    if (isMixpanelEnabled) {
      mixpanel.reset();
    }
    if (isPosthogEnabled) {
      posthog.reset();
    }
  };

  const track = (eventName: string, eventData?: { [key: string]: any }) => {
    if (isMixpanelEnabled) {
      mixpanel.track(eventName, {
        eventData,
      });
    }
    if (isPosthogEnabled) {
      posthog.capture(eventName, eventData);
    }
  };

  return { track, setAnalyticsUserId, unsetAnalyticsUserId, captureException };
};
