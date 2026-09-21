import type { Metadata } from "next";

import { SeeVideo } from "@/components/see-video";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink, Container } from "@/components/ui";
import { startCta } from "@/lib/offer-copy";
import { earlyAdopterProgramActive, paidTrialEnabled } from "@/lib/plan";
import { visitorCurrency } from "@/lib/visitor";

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

export default async function SeePage() {
  const currency = await visitorCurrency();
  const paidTrial = paidTrialEnabled();

  return (
    <div className="marketing-surface see-surface">
      <SiteHeader
        currency={currency}
        sections={false}
        paidTrial={paidTrial}
        discountActive={earlyAdopterProgramActive()}
      />
      <main>
        <section className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-28">
          <div aria-hidden="true" className="see-film-field pointer-events-none absolute inset-x-0 top-0" />
          <div
            aria-hidden="true"
            className="grain pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(ellipse_64%_52%_at_68%_10%,color-mix(in_srgb,var(--teal-bright)_13%,transparent),transparent_72%)]"
          />

          <Container className="relative">
            <div className="mx-auto grid max-w-[64rem] gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end md:gap-16">
              <div>
                <div aria-hidden="true" className="mb-6 h-px w-14 bg-teal" />
                <h1 className="display max-w-[15ch] text-[clamp(2.35rem,5.2vw,4.7rem)] leading-[0.98] tracking-[-0.045em] text-ink text-balance">
                Your ex-members, paying you again.
                </h1>
              </div>
              <p className="max-w-[36ch] text-[1.0625rem] leading-relaxed text-graphite text-pretty md:pb-1">
                Under two minutes on what casdey does for a gym like yours.
                <span className="mt-2 block text-stone">Sound on if you can.</span>
              </p>
            </div>

            <div className="see-video-stage mx-auto mt-10 max-w-[64rem] overflow-hidden rounded-[24px] border border-ash bg-white p-2 sm:mt-12 sm:rounded-[30px] sm:p-3">
              <div className="overflow-hidden rounded-[17px] sm:rounded-[20px]">
                <SeeVideo
                  src="/video/casdey-promo.mp4"
                  poster="/video/casdey-promo-poster.webp"
                />
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-[64rem] text-[0.8125rem] text-stone">
              The gym and the figures in the film are an illustrative example.
            </p>

            <div className="mx-auto mt-16 max-w-[64rem] rounded-[24px] border border-ash bg-white p-7 sm:p-10">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center md:gap-12">
                <div>
                  <h2 className="display text-[clamp(1.65rem,2.8vw,2.35rem)] text-ink text-balance">
                    Want to see it with your own members?
                  </h2>
                  <p className="mt-3 max-w-[48ch] text-[1rem] leading-relaxed text-graphite text-pretty">
                    Import your list and casdey shows you who has lapsed and what
                    they were worth, in about ten minutes.
                  </p>
                </div>
                <div className="md:justify-self-end">
                  <ButtonLink href="/login?mode=signup">{startCta(paidTrial, currency)}</ButtonLink>
                </div>
              </div>
              <p className="mt-8 border-t border-ash pt-6 text-[0.9375rem] text-graphite">
                Or just reply to my email with a question. I read every one.
                <span className="ml-2 text-stone">Davide @casdey</span>
              </p>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
