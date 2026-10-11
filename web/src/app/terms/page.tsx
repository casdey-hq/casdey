import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Terms · Casdey",
  description: "The terms of the Casdey 90-day plan: what you get, the free trial, the price, and how to cancel.",
};

export default function Terms() {
  return (
    <>
      <SiteNav />
      <main className="legal">
        <div className="wrap">
          <h1>Terms</h1>
          <p className="updated">Last updated 11 October 2026.</p>

          <h2>Who we are</h2>
          <p>Casdey is run by Davide Longo, an individual based in Italy. Contact: info@casdey.com.</p>

          <h2>What you get</h2>
          <ul>
            <li>A personal 90-day plan built around the 3 levers of your analysis, written for you and sent by email within 24 hours of starting.</li>
            <li>A daily check-in by email: you reply with a quick photo or a line on what you did, and it is read.</li>
            <li>A weekly review of what is working and what to change.</li>
          </ul>
          <p>
            Casdey gives grooming, style, fitness and habit guidance. It is not medical advice. Check with a doctor before changing
            your diet or training if you have a health condition. Results depend on what you do, so they are not guaranteed. Casdey
            is for people aged 18 or over.
          </p>

          <h2>Free trial and price</h2>
          <p>
            The plan starts with a 7-day free trial. You add a card at the start, through Stripe, and nothing is charged during the
            trial. If you don&rsquo;t cancel, the plan continues at the price you chose, &euro;59.99 a year or &euro;9.99 a month,
            charged at the end of the trial and then every year or month until you cancel. Prices include any taxes due.
          </p>

          <h2>Cancelling</h2>
          <p>
            Reply &ldquo;cancel&rdquo; to any Casdey email, or write to info@casdey.com, any time. Cancel during the trial and you
            pay nothing. Cancel later and the plan stops at the end of the period you have paid for, with no further charges.
          </p>

          <h2>Your right to withdraw, and refunds</h2>
          <p>
            By starting the trial you ask Casdey to start your plan straight away. You still have 14 days from your first payment to
            change your mind: write to us within that time and you get that payment back in full.
          </p>

          <h2>Your data</h2>
          <p>How your data is handled is in the <a href="/privacy">privacy notice</a>.</p>

          <h2>Changes and law</h2>
          <p>
            If these terms change, you are told by email before the change applies to you. These terms are governed by Italian law,
            and you keep the protections of the consumer law of the country where you live.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
