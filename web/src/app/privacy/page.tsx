import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Privacy notice · Casdey",
  description: "What Casdey collects when you join the waitlist, why, and how to have it deleted.",
};

export default function Privacy() {
  return (
    <>
      <SiteNav />
      <main className="legal">
        <div className="wrap">
          <h1>Privacy notice</h1>
          <p className="updated">Last updated 26 September 2026. This covers the Casdey waitlist only.</p>

          <h2>Who we are</h2>
          <p>
            Casdey is run by Davide Longo, an individual based in Italy, who is the data controller for the information below.
            Contact: info@casdey.com.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Your email address.</li>
            <li>The one thing you want to improve most, if you pick one.</li>
            <li>The country your connection comes from, worked out from your IP address. The IP address itself is not stored.</li>
            <li>Anonymous page statistics (pages viewed, whether a signup happened), collected without cookies.</li>
          </ul>

          <h2>Why, and on what basis</h2>
          <p>
            We use your email to confirm your signup, to send you your free analysis and to tell you when Casdey opens. We use
            your answer and country to understand what people want and where they are. The legal basis is your consent, which
            you give by joining, and which you can withdraw at any time. We will only email you about Casdey, and we never sell
            your data.
          </p>

          <h2>Who processes it for us</h2>
          <ul>
            <li>Supabase (database, hosted in Ireland, EU).</li>
            <li>Vercel (website hosting).</li>
            <li>Resend (sending email).</li>
            <li>PostHog (anonymous page statistics, EU cloud).</li>
          </ul>
          <p>Some of these providers are based in the United States and protect transfers with the EU standard contractual clauses.</p>

          <h2>How long we keep it</h2>
          <p>Until you ask us to remove you, or until the waitlist closes and you have had your launch email, whichever comes first.</p>

          <h2>Your rights</h2>
          <p>
            You can ask to see, correct or delete your data, or withdraw your consent, by replying to any Casdey email or
            writing to info@casdey.com. You can also complain to your local data protection authority; in Italy that is the
            Garante per la protezione dei dati personali. Casdey is not meant for anyone under 16.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
