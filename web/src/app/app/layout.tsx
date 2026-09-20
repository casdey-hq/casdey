import Link from "next/link";

import { AppNav } from "@/components/app/nav";
import { CommandMenu } from "@/components/app/command-menu";
import { IconSignOut } from "@/components/app/icons";
import { Logo } from "@/components/wordmark";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";

import { getGymContext } from "@/lib/dal";
import { BillingBanner } from "@/components/app/billing-banner";
import { SupportWidget } from "@/components/app/support-widget";
import { UnsavedChangesGuard } from "@/components/app/unsaved-changes";
import { ThemeToggle, THEME_COOKIE } from "@/components/app/theme-toggle";
import { supportThreadForGym } from "@/lib/support";

import "@/styles/product.css";

// A crisp, high-contrast product face. Marketing and the Outfit wordmark keep
// their own typography; this file loads only in the signed-in workspace.
const productFont = Geist({
  variable: "--font-product",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The app shell.
 *
 * It reads the gym only to label the sidebar. It deliberately performs no
 * authorization: layouts do not re-render on client-side navigation and cannot
 * stop the segments below them from rendering, so a check here would look like
 * a gate without being one. Each page calls requireGym() (or
 * requireActiveGym()) itself. See src/lib/dal.ts.
 *
 * A gym can legitimately be missing here: /app/onboarding is where a new
 * user creates one.
 */

export const metadata = {
  // The template has to be restated here, not just the name. A plain string
  // title carries no template, so the root's "%s · casdey" reached /app but
  // died one segment further down: "Overview · casdey" but a bare "Members".
  title: { default: "casdey", template: "%s · casdey" },
  robots: { index: false, follow: false },
};

// Nothing under /app is ever the same for two people, so none of it is static.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const context = await getGymContext();
  const supportThread = context ? await supportThreadForGym(context.gym.id) : null;

  // A saved preference wins. New browsers begin in dark mode, and the server
  // renders it before hydration so the switch never flashes the wrong theme.
  const theme =
    (await cookies()).get(THEME_COOKIE)?.value === "light" ? "light" : "dark";

  return (
    <div
      data-theme={theme}
      // text-ink is load-bearing, not decoration. body sets its colour from
      // --ink resolved OUTSIDE this element, so anything that merely inherits
      // it kept the light theme's near-black and rendered black on black in
      // dark mode. Re-stating it here resolves the token inside the themed
      // scope, so every descendant inherits the right one.
      className={`${productFont.variable} product-workspace flex min-h-full flex-1 flex-col text-ink md:flex-row`}
    >
      {/* Sticky and exactly one viewport tall on desktop, with its own scroll.
          As a plain flex child it stretched to the height of whatever page it
          sat beside, which put the gym name, the theme switch and sign out at
          the foot of a long document instead of the foot of the screen: on
          Settings you had to scroll the page to reach the controls that are
          supposed to be always there. */}
      <aside className="app-sidebar flex shrink-0 flex-col gap-5 px-4 py-4 md:sticky md:top-0 md:h-[100dvh] md:w-60 md:overflow-y-auto md:px-4 md:py-6">
        <div className="flex items-center justify-between md:block">
          <Link href="/app" className="inline-block text-ink">
            <Logo className="text-[1.5rem]" />
          </Link>
          {/* The sidebar footer that carries the full switch is desktop only,
              so on a phone this is the only way to reach it. */}
          <div className="md:hidden">
            <ThemeToggle initial={theme} compact />
          </div>
        </div>

        {context ? (
          <div className="workspace-identity hidden md:block">
            <span className="text-[0.6875rem] font-semibold text-stone">Workspace</span>
            <span className="mt-1 block truncate text-[0.875rem] font-semibold text-ink">{context.gym.name}</span>
          </div>
        ) : null}

        <CommandMenu />

        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:flex-1 md:overflow-visible md:px-0">
          <AppNav />
        </div>

        {context ? (
          <div className="hidden border-t border-ash pt-4 md:block">
            <p className="literal truncate text-[0.75rem] text-stone">
              {context.session.email}
            </p>
            <div className="mt-3 -mx-2.5">
              <ThemeToggle initial={theme} />
            </div>

            <form action="/auth/signout" method="post" className="mt-1">
              <button
                type="submit"
                className="app-nav-link -mx-3 w-[calc(100%+1.5rem)] text-left"
              >
                <IconSignOut className="h-[1.125rem] w-[1.125rem]" />
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {context ? <BillingBanner gym={context.gym} /> : null}
        {/* pb leaves room for the support launcher, which is fixed to the
            bottom right and was sitting on top of whatever the page ended
            with: on Members that was the next-page arrow, which could not be
            clicked at all. */}
        <main className="mx-auto w-full max-w-[76rem] flex-1 px-5 pt-8 pb-24 sm:px-10 sm:pt-10">
          {children}
        </main>
      </div>

      <SupportWidget initialThread={supportThread ?? { conversationId: null, status: null, messages: [] }} />
      <UnsavedChangesGuard />
    </div>
  );
}
