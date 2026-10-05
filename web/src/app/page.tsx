import Link from "next/link";
import { Mark } from "@/components/mark";
import { PhoneToday } from "@/components/phone-today";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

function StartAnalysis() {
  return (
    <div className="hero-cta">
      <Link href="/analysis" className="btn btn-link">Get your free analysis</Link>
      <p className="fine">About 2 minutes. Photos are analysed, then deleted.</p>
    </div>
  );
}

const promises = [
  {
    title: "A plan, not a score.",
    body: "Other apps rate your face and leave you there. Casdey tells you exactly what to do today, and again tomorrow.",
  },
  {
    title: "Checked, not just tracked.",
    body: "A photo at the gym, a routine done. Your streak only grows when it is real, so you actually follow through.",
  },
  {
    title: "How you look in real life.",
    body: "Posture, grooming, skin, style and the body under the shirt. Not a template measured against one selfie.",
  },
  {
    title: "Honest from day one.",
    body: "The price is on this page, before you upload anything. No pay-per-scan. A reminder before your trial ends, and one tap to cancel.",
  },
];

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="hero" id="join">
          <div className="wrap">
            <Mark className="hero-mark" animate title="Casdey" />
            <div className="eyebrow">Free analysis. No score.</div>
            <h1>Glow up in 90&nbsp;days.</h1>
            <p className="lede">See the 3 changes that would make the biggest difference to how you look. Then a real plan, checked every day.</p>
            <StartAnalysis />
          </div>
        </section>

        <section className="plan" aria-labelledby="plan-title">
          <div className="wrap">
            <div className="plan-text">
              <h2 className="section-title" id="plan-title">One plan. Every&nbsp;day.</h2>
              <p className="section-copy">
                Training, skin, sleep, posture and style in one daily list, built around you. Tick each one off with a quick photo, and watch the streak and the mirror change together.
              </p>
            </div>
            <PhoneToday />
          </div>
        </section>

        <section className="promises" aria-labelledby="promises-title">
          <div className="wrap">
            <h2 className="section-title" id="promises-title">Built for the part other apps&nbsp;skip.</h2>
            <div className="promise-grid">
              {promises.map((promise) => (
                <div className="promise" key={promise.title}>
                  <h3>{promise.title}</h3>
                  <p>{promise.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="closing" aria-labelledby="closing-title">
          <div className="wrap">
            <h2 className="section-title" id="closing-title">Start with the&nbsp;truth.</h2>
            <p className="lede">Your free analysis today. The full plan comes with a 7&#8209;day free trial, then €9.99 a month or €59.99 a year.</p>
            <StartAnalysis />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
