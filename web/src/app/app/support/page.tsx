import { PageHeader } from "@/components/app/ui";
import { SupportForm } from "./support-form";

export const metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <div className="max-w-[42rem]">
      <PageHeader
        eyebrow="Support"
        title="Get help from Davide"
        lede="Send the problem in your own words. Davide is notified straight away and replies to the email on your casdey account."
      />
      <SupportForm />
    </div>
  );
}
