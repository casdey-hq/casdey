import { Mark } from "@/components/mark";
import { PhoneToday } from "@/components/phone-today";
import { WaitlistForm } from "@/components/waitlist-form";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

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
    body: "The price is clear before you upload anything. No pay-per-scan. If you leave, your photos are deleted.",
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
            <div className="eyebrow">Coming soon</div>
            <h1>Glow up in 90&nbsp;days.</h1>
            <p className="lede">A real plan for your body, skin and style. Checked every day. No fake scores.</p>
            <WaitlistForm source="hero" />
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
            <h2 className="section-title" id="closing-title">Be first in&nbsp;line.</h2>
            <p className="lede">Your free face and physique analysis, the day Casdey opens.</p>
            <WaitlistForm source="closing" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
