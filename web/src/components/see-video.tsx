"use client";

import { useRef } from "react";
import posthog from "posthog-js";

/**
 * The promo film on /see, the page the T2 cold email's "yes, send it" reply
 * links to. The only question worth answering about it is whether people
 * actually watch, so it reports two moments to PostHog: the first play and
 * reaching the end. Nothing is sent when PostHog is not initialised (see
 * posthog-provider.tsx), and neither event carries anything about the viewer.
 */
export function SeeVideo({ src, poster }: { src: string; poster: string }) {
  const played = useRef(false);
  const finished = useRef(false);

  const capture = (event: string) => {
    if (posthog.__loaded) posthog.capture(event, { video: "promo-v1.2" });
  };

  return (
    <video
      className="block aspect-video w-full bg-deep"
      src={src}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      onPlay={() => {
        if (played.current) return;
        played.current = true;
        capture("promo_video_played");
      }}
      onEnded={() => {
        if (finished.current) return;
        finished.current = true;
        capture("promo_video_completed");
      }}
    >
      Your browser cannot play this video.
    </video>
  );
}
