import { requireGym } from "@/lib/dal";
import { dateOrderFor } from "@/lib/countries";
import { ImportWizard } from "@/components/app/import-wizard";
import { ProcessingAgreement } from "./agreement";
import { Card, PageHeader } from "@/components/app/ui";
import { PastImports } from "./past-imports";
import { mindbodySource } from "@/lib/ingestion/mindbody";
import type { ImportRun } from "@/lib/types";

export const metadata = { title: "Import members" };

/**
 * Where a direct sync actually stands, per platform (D1 walkthrough #31).
 *
 * Written from what each vendor publishes, because "coming soon" over a single
 * logo was telling every gym the same thing and it was not true for any of
 * them. The three cases are genuinely different:
 *
 *   - Mindbody has a real, documented API, and four gates in front of it:
 *     Mindbody's own review of casdey as a partner, a card on file, a metered
 *     per-call charge, and an activation code that each individual studio has
 *     to turn on from its own Manager Tools. Buildable, and not a small job.
 *   - TeamUp gives a gym its own API credentials from Settings, at no cost and
 *     with nobody's approval. This is the one that is genuinely easy, and it
 *     is first when a gym on TeamUp actually asks for it.
 *   - LegitFit publishes no developer API at all. Its Zapier app is
 *     trigger-only, so it can tell casdey about a booking that happens from now
 *     on and can never hand over the members who already lapsed, which is the
 *     entire list casdey needs. CSV is not a stopgap there, it is the only way.
 */
type Integration = {
  name: string;
  /** Where it stands with casdey, in one line. */
  status: string;
  /** What the gym can do about it right now. */
  state: "request" | "csv";
  /** The vendor's own page for getting the export or the credentials. Their
   *  documentation, not casdey's: it stays right when they change their UI,
   *  and it is what a gym owner will recognise. */
  href: string;
  hrefLabel: string;
  /** The shortest useful route through the software's own navigation. */
  route: string;
  guide: readonly string[];
};

const INTEGRATIONS: Integration[] = [
  {
    name: mindbodySource.label,
    status:
      "A direct sync is possible but needs Mindbody to approve casdey as a partner, and you to switch it on for your studio. Ask us and we will start it.",
    state: "request",
    href: "https://support.mindbodyonline.com/s/?language=en_US",
    hrefLabel: "Mindbody support",
    guide: [
      "Set As of Date to today, choose All Memberships, then choose Detail View.",
      "Select Export to Excel. Save the downloaded file as a CSV before you upload it to casdey.",
      "Keep every membership, including paused and expired ones, so casdey can find the people who stopped coming.",
    ],
    route: "Insights → Reports → Clients → Membership",
  },
  {
    name: "TeamUp",
    status:
      "TeamUp gives you your own API key from your dashboard, at no cost, so this is the sync casdey can build fastest. Ask us and it moves to the front.",
    state: "request",
    href: "https://support.goteamup.com/",
    hrefLabel: "TeamUp support",
    guide: [
      "Open your member report and include inactive or cancelled members, not only current ones.",
      "Export the complete list as CSV, including name, email and last attendance where TeamUp provides it.",
      "Upload that export here while we prepare a direct connection for TeamUp gyms.",
    ],
    route: "Reports → Members → export CSV",
  },
  {
    name: "Glofox",
    status:
      "No self-serve API for member lists. Export from Glofox and casdey reads it.",
    state: "csv",
    href: "https://support.glofox.com/",
    hrefLabel: "Glofox support",
    guide: [
      "Open Members under Memberships, then use the Download button in the top right.",
      "Choose the member report, not a leads report. It includes name, email, membership, plan and status.",
      "Upload the CSV here and map the last-attendance column if your export includes one.",
    ],
    route: "Reports → Memberships → Members → Download",
  },
  {
    name: "LegitFit",
    status:
      "Publishes no API, and its Zapier app can only report bookings from now on, never the members who already lapsed. The export is the only way in.",
    state: "csv",
    href: "https://www.legitfit.com/support",
    hrefLabel: "LegitFit support",
    guide: [
      "Open the support link and request a full member export from the LegitFit team.",
      "Ask for names, email addresses and the last attendance or visit date for each member.",
      "When the CSV arrives, upload it here and check casdey's column matching before importing.",
    ],
    route: "LegitFit support → request full member export",
  },
  {
    name: "PushPress",
    status: "Export your members and casdey reads it.",
    state: "csv",
    href: "https://help.pushpress.com/",
    hrefLabel: "PushPress help",
    guide: [
      "Open People, then Clients, and use the filters to include former members as well as active clients.",
      "Select the clients you want, open the three-dot menu and choose Export to CSV.",
      "Upload the exported CSV here. Include last check-in where your report offers it.",
    ],
    route: "People → Clients → select → ⋯ → Export",
  },
  {
    name: "Wodify",
    status:
      "Its API covers workouts rather than membership, so the member list comes from an export.",
    state: "csv",
    href: "https://help.wodify.com/",
    hrefLabel: "Wodify help",
    guide: [
      "Open People, then Clients. Select the clients you need, or use the top checkbox to select the whole filtered list.",
      "Open the three-dot menu and choose Export. Wodify downloads an Excel file.",
      "Open that file in Excel or Sheets and save it as CSV, then upload it here. The export includes last attendance.",
    ],
    route: "People → Clients → select → ⋯ → Export",
  },
  {
    name: "Virtuagym",
    status: "Export your members and casdey reads it.",
    state: "csv",
    href: "https://help.virtuagym.com/",
    hrefLabel: "Virtuagym help",
    guide: [
      "Open the members or clients report in your club portal and include former members if the report offers a status filter.",
      "Download the full result as CSV.",
      "Upload it here and map name, email and last visit before importing.",
    ],
    route: "Club portal → Members or Clients → export CSV",
  },
  {
    name: "ABC Fitness",
    status: "Export your members and casdey reads it.",
    state: "csv",
    href: "https://help.abcfitness.com/",
    hrefLabel: "ABC Fitness help",
    guide: [
      "Open the member report in your ABC Fitness dashboard and include inactive members where the report offers that filter.",
      "Download the full result as CSV.",
      "Upload it here and map name, email and last visit before importing.",
    ],
    route: "Reports → Members → export CSV",
  },
  {
    name: "Anything else",
    status:
      "casdey reads any CSV with a name, an email address and a last visit date. Nothing else is required. Tell us what you use and we will look at a sync for it.",
    state: "csv",
    href: "/contact",
    hrefLabel: "Tell us what you use",
    guide: [
      "Look for Members, Clients, Contacts or Reports in your software's main menu.",
      "Export the complete list as CSV, including people who have cancelled or gone inactive.",
      "Upload it here. casdey needs a name, email address and last visit date where available.",
    ],
    route: "Members, Clients or Reports → export CSV",
  },
];

export default async function ImportPage() {
  const { gym, session, role } = await requireGym();

  const { data } = await session.supabase
    .from("imports")
    .select("*")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const runs = (data ?? []) as ImportRun[];

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Bring your member list in"
        lede="casdey reads a CSV export from any gym software. Your list stays in the EU and is never shared with anyone."
      />

      {/* Importing and seeing who is lapsed is open to every plan, including
          Free. Sending is where a paid plan is required, and that gate lives on
          the campaigns side. */}
      {!gym.processing_agreed_at ? (
        <ProcessingAgreement
          gymName={gym.name}
          canAgree={role === "owner"}
        />
      ) : (
        <ImportWizard defaultDateOrder={dateOrderFor(gym.country)} />
      )}

      <PastImports runs={runs} canUndo={role === "owner"} />

      <section className="mt-10">
        <h2 className="display mb-1 text-[1.25rem]">Where else it can come from</h2>
        <p className="mb-4 max-w-[52rem] text-[0.9375rem] text-graphite">
          A direct sync means never exporting again. Whether one is possible
          depends on your software, so here is where each stands and how to get
          your list out today. Nothing here is switched on yet: where it says
          sync on request, ask us and we will build that one next.
        </p>
        <Card className="!p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Software</th>
                <th>Where it stands</th>
                <th>Getting your list out</th>
              </tr>
            </thead>
            <tbody>
              {INTEGRATIONS.map((row) => (
                <tr key={row.name}>
                  <td className="font-medium whitespace-nowrap text-ink">
                    {row.name}
                  </td>
                  <td>
                    <span className="mb-1 block">
                      <span
                        className={
                          row.state === "request"
                            ? "pill pill-teal"
                            : "pill pill-quiet"
                        }
                      >
                        {row.state === "request"
                          ? "Sync on request"
                          : "CSV export"}
                      </span>
                    </span>
                    {row.status}
                  </td>
                  <td>
                    <a
                      href={row.href}
                      target={row.href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        row.href.startsWith("http")
                          ? "noreferrer noopener"
                          : undefined
                      }
                      className="whitespace-nowrap text-teal underline underline-offset-4"
                    >
                      {row.hrefLabel}
                    </a>
                    <details className="mt-3 max-w-sm rounded-lg border border-ash bg-mist/35 p-3 text-[0.8125rem] text-graphite">
                      <summary className="cursor-pointer font-semibold text-teal marker:text-teal">
                        Show exact export steps
                      </summary>
                      <p className="literal mt-3 rounded-md border border-ash bg-white px-2.5 py-2 text-[0.75rem] text-graphite">
                        {row.route}
                      </p>
                      <ol className="mt-3 space-y-2">
                        {row.guide.map((step) => (
                          <li key={step} className="flex gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-shallow text-[0.6875rem] font-semibold text-teal">
                              {row.guide.indexOf(step) + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-3 max-w-[46rem] text-[0.875rem] text-stone">
          Every link goes to that company&apos;s own help site, which is where the
          export lives and where it stays correct when they move it. If your
          software is not listed, export a CSV and casdey will read it.
        </p>
      </section>

    </>
  );
}
