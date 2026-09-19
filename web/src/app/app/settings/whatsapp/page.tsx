import { requireGym } from "@/lib/dal";
import { capabilities } from "@/lib/plan";
import { Card, CardTitle, Notice } from "@/components/app/ui";
import { WhatsAppSettingsForm } from "./form";

export const metadata = { title: "WhatsApp" };

export default async function WhatsAppSettingsPage() {
  const { gym, role } = await requireGym();
  const canUseWhatsApp = capabilities(gym).canUseWhatsApp;

  return (
    <div className="max-w-[42rem] space-y-6">
      {role !== "owner" ? (
        <Notice tone="warn">
          Only the gym owner can change these. You can read them.
        </Notice>
      ) : null}

      {!canUseWhatsApp ? (
        <Notice tone="warn">
          WhatsApp is on the Pro plan, and this gym is not on it. You can set
          this up now, but campaigns cannot go out over WhatsApp until you
          upgrade. Worth knowing before you start: getting a template approved
          happens at Meta, under your own WhatsApp Business account, and takes
          days rather than minutes.
        </Notice>
      ) : null}

      <Card>
        <CardTitle>Set up WhatsApp in three steps</CardTitle>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[0.9375rem] text-graphite">
          <li>
            Set up your gym&apos;s WhatsApp Business sender in Twilio. Use a number
            your gym owns, so members see your gym&apos;s business name.{" "}
            <a
              href="https://www.twilio.com/docs/whatsapp/key-concepts"
              target="_blank"
              rel="noreferrer noopener"
              className="text-teal underline underline-offset-4"
            >
              Twilio&apos;s WhatsApp guide
            </a>{" "}
            explains the terms and approval steps.
          </li>
          <li>
            In Twilio&apos;s Content Template Builder, make and submit a WhatsApp
            template. Its body needs exactly one variable, <code className="literal">{"{{1}}"}</code>,
            for your gym&apos;s name. After WhatsApp approves it, copy the Content
            SID beginning <code className="literal">HX</code>.{" "}
            <a
              href="https://www.twilio.com/docs/content/create-templates-with-the-content-template-builder"
              target="_blank"
              rel="noreferrer noopener"
              className="text-teal underline underline-offset-4"
            >
              Open the template guide
            </a>
            .
          </li>
          <li>
            Paste the number and Content SID below, turn WhatsApp on, then save.
            Send yourself a test from a campaign before contacting members.
          </li>
        </ol>
      </Card>
      <WhatsAppSettingsForm gym={gym} readOnly={role !== "owner"} />
    </div>
  );
}
