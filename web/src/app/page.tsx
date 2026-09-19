import { earlyAdopterProgramActive, paidTrialEnabled } from "@/lib/plan";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/sections/hero";
import { WhatItDoes } from "@/components/sections/what-it-does";
import { WhyCasdey } from "@/components/sections/why-casdey";
import { MemberData } from "@/components/sections/member-data";
import { Offer } from "@/components/sections/offer";
import { CtaBand } from "@/components/sections/cta-band";
import { visitorCurrency } from "@/lib/visitor";

export default async function Home() {
  const currency = await visitorCurrency();
  return (
    <>
      <SiteHeader
        currency={currency}
        paidTrial={paidTrialEnabled()}
        discountActive={earlyAdopterProgramActive()}
      />
      <main>
        <Hero />
        <WhatItDoes />
        <WhyCasdey />
        <MemberData />
        <Offer />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
