import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Privacy notice · Casdey",
  description: "What Casdey collects for your free analysis, why, what happens to your photos, and how to have your data deleted.",
};

export default function Privacy() {
  return (
    <>
      <SiteNav />
      <main className="legal">
        <div className="wrap">
          <h1>Privacy notice</h1>
          <p className="updated">Last updated 5 October 2026. This covers the free analysis and the earlier waitlist.</p>

          <h2>Who we are</h2>
          <p>
            Casdey is run by Davide Longo, an individual based in Italy, who is the data controller for the information below.
            Contact: info@casdey.com.
          </p>

          <h2>Casdey is for adults</h2>
          <p>
            The free analysis is only for people aged 18 or over. We ask you to confirm your age before we look at any photo, and
            we refuse photos of anyone who looks under 18.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Your email address.</li>
            <li>Your answers to the quiz: what you want to improve, your age range, height, weight, and habits such as training, sleep and skincare.</li>
            <li>Your photos (a face photo, and a full-body photo if you add one), only for the time it takes to analyse them. See below.</li>
            <li>The analysis we give you.</li>
            <li>The country your connection comes from, worked out from your IP address. The IP address itself is not stored.</li>
            <li>Anonymous page statistics (pages viewed, steps of the quiz reached), collected without cookies.</li>
          </ul>

          <h2>Your photos</h2>
          <p>
            Your photos are sent once, encrypted, to our AI provider to produce your analysis, and are not stored by Casdey: not in
            our database, not on our servers, not in the email. Our AI provider processes them only to answer the request and does
            not use them to train its models. Photos can reveal sensitive things about you, so we ask for your explicit consent
            before you send them, and you can stop at any point before pressing the button.
          </p>

          <h2>Why, and on what basis</h2>
          <p>
            We use your answers and photos to produce your analysis, and your email to send you a copy and to tell you when the full
            Casdey plan opens. We keep your answers and the analysis so your plan can build on them, and to understand what people
            want. The legal basis is your consent, which you give when you request the analysis, and which you can withdraw at any
            time. We will only email you about Casdey, and we never sell your data.
          </p>

          <h2>Who processes it for us</h2>
          <ul>
            <li>Anthropic (the AI that produces your analysis).</li>
            <li>Supabase (database, hosted in Ireland, EU).</li>
            <li>Vercel (website hosting).</li>
            <li>Resend (sending email).</li>
            <li>PostHog (anonymous page statistics, EU cloud).</li>
          </ul>
          <p>Some of these providers are based in the United States and protect transfers with the EU standard contractual clauses.</p>

          <h2>How long we keep it</h2>
          <p>Photos: not kept at all. Everything else: until you ask us to remove it, or 12 months after your last analysis, whichever comes first.</p>

          <h2>Your rights</h2>
          <p>
            You can ask to see, correct or delete your data, or withdraw your consent, by replying to any Casdey email or
            writing to info@casdey.com. You can also complain to your local data protection authority; in Italy that is the
            Garante per la protezione dei dati personali.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
