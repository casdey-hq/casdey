import type { Metadata } from "next";

import { SeeVideo } from "@/components/see-video";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink, Container } from "@/components/ui";
import { startCta } from "@/lib/offer-copy";
import { earlyAdopterProgramActive, paidTrialEnabled } from "@/lib/plan";

/**
 * A hidden page: the one the T2 cold email links to once a gym owner has
 * replied "yes, send it" (see CLAUDE.md, Marketing plan, 2026-09-13). Nothing
 * on the site links here and it is not in the sitemap. The noindex keeps it
 * out of search results should the link travel anyway.
 *
 * The page has one job, getting the film watched, so the film is the page.
 * Everything else is the one next step for someone who liked it.
 */
export const metadata: Metadata = {
  title: "See what casdey does",
  description: "A short film on how casdey gets a gym's ex-members paying again.",
  robots: { index: false, follow: false },
};

export default function SeePage() {
  const paidTrial = paidTrialEnabled();

  return (
    <>
      <SiteHeader
        sections={false}
        paidTrial={paidTrial}
        discountActive={earlyAdopterProgramActive()}
      />
      <main>
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
          <div
            aria-hidden="true"
            className="grain pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,color-mix(in_srgb,var(--teal-bright)_16%,transparent),transparent_72%)]"
          />

          <Container className="relative">
            <div className="mx-auto max-w-[40rem] text-center">
              <h1 className="display text-[clamp(1.9rem,3.6vw,3rem)] text-ink text-balance">
                Your ex-members, paying you again.
              </h1>
              <p className="mx-auto mt-4 max-w-[44ch] text-[1.0625rem] leading-relaxed text-graphite text-pretty">
                Under two minutes on what casdey does for a gym like yours.
                Sound on if you can.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-[64rem] overflow-hidden rounded-[22px] border border-ash bg-white p-2 shadow-[0_1px_2px_rgba(21,21,15,0.06),0_30px_60px_-30px_rgba(21,21,15,0.35)] sm:p-3">
              <div className="overflow-hidden rounded-[16px]">
                <SeeVideo
                  src="/video/casdey-promo.mp4"
                  poster="/video/casdey-promo-poster.webp"
                />
              </div>
            </div>
            <p className="mt-4 text-center text-[0.8125rem] text-stone">
              The gym and the figures in the film are an illustrative example.
            </p>

            <div className="mx-auto mt-16 max-w-[36rem] text-center">
              <h2 className="display text-[clamp(1.45rem,2.4vw,1.9rem)] text-ink text-balance">
                Want to see it with your own members?
              </h2>
              <p className="mx-auto mt-3 max-w-[42ch] text-[1rem] leading-relaxed text-graphite text-pretty">
                Import your list and casdey shows you who has lapsed and what
                they were worth, in about ten minutes.
              </p>
              <div className="mt-7 flex justify-center">
                <ButtonLink href="/login?mode=signup">{startCta(paidTrial)}</ButtonLink>
              </div>
              <p className="mt-6 text-[0.9375rem] text-graphite">
                Or just reply to my email with a question. I read every one.
                <span className="mt-1 block text-stone">Davide @casdey</span>
              </p>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
