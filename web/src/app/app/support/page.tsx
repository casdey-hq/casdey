import { PageHeader } from "@/components/app/ui";
import { SupportChat } from "@/components/app/support-chat";
import { requireGym } from "@/lib/dal";
import { supportThreadForGym } from "@/lib/support";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const { gym } = await requireGym();
  const thread = await supportThreadForGym(gym.id);
  return (
    <div className="max-w-[42rem]">
      <PageHeader
        eyebrow="Support"
        title="Chat with support"
        lede="Send the problem in your own words. Replies stay here and are emailed to the address on your casdey account."
      />
      <div className="card flex h-[38rem] max-h-[calc(100dvh-12rem)] flex-col overflow-hidden !p-0">
        <SupportChat initialThread={thread} />
      </div>
    </div>
  );
}
