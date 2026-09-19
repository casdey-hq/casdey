import { Card, CardTitle, Stat } from "@/components/app/ui";
import { mrr, planBreakdown } from "@/lib/admin-stats";
import { readHq } from "@/lib/hq";
import { findPricePlan } from "@/lib/pricing";
import { EARLY_ADOPTER_DISCOUNT_PERCENT } from "@/lib/trial";
import {
  AI_EUR_PER_MESSAGE,
  MESSAGES_PER_GYM_MONTH,
  STRIPE_FIXED_EUR,
  STRIPE_PERCENT,
  WHATSAPP_EUR_HEAVY,
  breakEvenGyms,
  tierEconomics,
} from "@/lib/unit-economics";
import { NoteEditor } from "./hq-client";
import { MarkdownLite } from "./markdown-lite";
import { Section } from "./parts";

/**
 * Business: the offer, what it costs, what a gym earns, and break-even. The
 * casdey HQ Google Doc's content, but live: prices come from the catalogue the
 * checkout charges, economics are computed from them and from the cost lines,
 * and the offer text is a note anyone can edit here.
 */

const eur = (n: number) =>
  `€${n.toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export async function BusinessTab() {
  const [hq, revenue, plans] = await Promise.all([readHq(), mrr(), planBreakdown()]);

  const standardList = findPricePlan("standard", "eur", "month")!.amountMinor / 100;
  const proList = findPricePlan("pro", "eur", "month")!.amountMinor / 100;
  const standard = tierEconomics("standard", standardList, EARLY_ADOPTER_DISCOUNT_PERCENT);
  const pro = tierEconomics("pro", proList, EARLY_ADOPTER_DISCOUNT_PERCENT);

  const fixed = hq.costs.reduce((sum, cost) => sum + cost.monthly_eur, 0);
  const breakEven = breakEvenGyms(fixed, standard.margin);
  const offer = hq.notes.offer;

  const priceRow = (tier: "standard" | "pro") =>
    (["eur", "usd", "gbp"] as const).map((currency) => ({
      currency,
      month: findPricePlan(tier, currency, "month")?.chargeDisplay ?? "—",
      year: findPricePlan(tier, currency, "year")?.chargeDisplay ?? "—",
    }));

  return (
    <>
      <Section title="Where it stands" sub="Live. Test gyms are excluded from every figure.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="Paying gyms"
            value={revenue.payingGyms}
            hint="Monthly revenue is on the Numbers tab"
            tone="teal"
          />
          <Stat label="Gyms signed up" value={plans.total} />
          <Stat
            label="Break-even"
            value={breakEven === null ? "—" : `${breakEven} gym${breakEven === 1 ? "" : "s"}`}
            hint={`On Standard, against ${eur(Math.round(fixed * 100) / 100)} a month of fixed costs`}
          />
        </div>
      </Section>

      {offer ? (
        <Section title={offer.title}>
          <Card>
            <NoteEditor noteKey={offer.key} body={offer.body}>
              <MarkdownLite source={offer.body} />
            </NoteEditor>
          </Card>
        </Section>
      ) : null}

      <Section
        title="Prices"
        sub={`From the catalogue the checkout charges, so this cannot disagree with it. Early adopters keep ${EARLY_ADOPTER_DISCOUNT_PERCENT}% off for life. Free is €0, 50 members, no sending.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-[0.875rem]">
            <thead>
              <tr className="label text-stone">
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Euros</th>
                <th className="py-2 pr-4 font-medium">Dollars (US)</th>
                <th className="py-2 font-medium">Pounds (UK)</th>
              </tr>
            </thead>
            <tbody>
              {(["standard", "pro"] as const).map((tier) => (
                <tr key={tier} className="border-t border-ash align-top">
                  <td className="py-2.5 pr-4 font-semibold text-ink">
                    {tier === "standard" ? "Standard" : "Pro"}
                    <p className="text-[0.75rem] font-normal text-stone">
                      {tier === "standard" ? "200 members, email" : "2,000 members, WhatsApp, guarantee"}
                    </p>
                  </td>
                  {priceRow(tier).map((price) => (
                    <td key={price.currency} className="literal py-2.5 pr-4 text-graphite">
                      {price.month}
                      <p className="text-[0.75rem] text-stone">{price.year}</p>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="What one gym earns casdey, per month"
        sub={`With the ${EARLY_ADOPTER_DISCOUNT_PERCENT}% discount, in euros. Assumes ${MESSAGES_PER_GYM_MONTH} messages a month (200 members, two follow-ups) at about €${AI_EUR_PER_MESSAGE.toFixed(3)} each, Stripe at ${STRIPE_PERCENT}% + ${eur(STRIPE_FIXED_EUR)}, and on Pro a heavy WhatsApp month of ${eur(WHATSAPP_EUR_HEAVY)}.`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[standard, pro].map((tier) => (
            <Card key={tier.tier}>
              <CardTitle>{tier.tier === "standard" ? "Standard" : "Pro"}</CardTitle>
              <dl className="literal mt-3 space-y-1.5 text-[0.875rem]">
                {[
                  ["Revenue", eur(tier.revenue)],
                  ["Stripe", `−${eur(tier.stripe)}`],
                  ["AI writing", `−${eur(tier.ai)}`],
                  ...(tier.whatsapp ? [["WhatsApp", `−${eur(tier.whatsapp)}`]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 text-graphite">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-ash pt-1.5 font-semibold text-ink">
                  <dt>Margin</dt>
                  <dd>
                    {eur(tier.margin)} · {tier.marginPct}%
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="What casdey runs on"
        sub="The fixed monthly bill, in euros. Services charged per use are listed for completeness at €0."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-[0.875rem]">
            <thead>
              <tr className="label text-stone">
                <th className="py-2 pr-4 font-medium">Service</th>
                <th className="py-2 pr-4 font-medium">For</th>
                <th className="py-2 pr-4 font-medium">Per month</th>
                <th className="py-2 font-medium">When it changes</th>
              </tr>
            </thead>
            <tbody>
              {hq.costs.map((cost) => (
                <tr key={cost.id} className="border-t border-ash align-top">
                  <td className="py-2.5 pr-4 font-semibold text-ink">{cost.service}</td>
                  <td className="py-2.5 pr-4 text-graphite">{cost.purpose}</td>
                  <td className="literal py-2.5 pr-4 text-graphite">
                    {eur(cost.monthly_eur)}
                    {cost.basis ? <p className="text-[0.75rem] text-stone">{cost.basis}</p> : null}
                  </td>
                  <td className="py-2.5 text-stone">{cost.when_it_matters ?? ""}</td>
                </tr>
              ))}
              <tr className="border-t border-ash font-semibold text-ink">
                <td className="py-2.5 pr-4">Total</td>
                <td />
                <td className="literal py-2.5 pr-4">{eur(Math.round(fixed * 100) / 100)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.8125rem] text-stone">
          Cost lines are changed with <span className="literal">npm run hq -- costs set</span>; ask Claude.
        </p>
      </Section>
    </>
  );
}
