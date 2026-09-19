import { Card, CardTitle, Pill } from "@/components/app/ui";
import { supportInbox } from "@/lib/support";
import { SupportReplyForm } from "./support-reply-form";
import { Section } from "./parts";

function when(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function SupportTab() {
  const { conversations, feedback } = await supportInbox();

  return (
    <>
      <Section
        title="Support conversations"
        sub="Messages sent from a gym's in-product chat. Reply here and casdey emails them that a reply is waiting."
      >
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <Card>
              <p className="text-[0.875rem] text-stone">No support conversations yet.</p>
            </Card>
          ) : conversations.map((conversation) => (
            <Card key={conversation.conversationId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{conversation.gymName}</CardTitle>
                  <p className="literal text-[0.75rem] text-stone">{conversation.authorEmail}</p>
                </div>
                <div className="text-right">
                  <Pill tone={conversation.status === "open" ? "teal" : "quiet"}>{conversation.status}</Pill>
                  <p className="mt-1 text-[0.75rem] text-stone">{when(conversation.lastMessageAt)}</p>
                </div>
              </div>
              <SupportReplyForm conversation={conversation} />
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Product feedback"
        sub="Feedback from the help popup. This is separate from support messages so it stays useful for product decisions."
      >
        <div className="space-y-3">
          {feedback.length === 0 ? (
            <Card>
              <p className="text-[0.875rem] text-stone">No product feedback yet.</p>
            </Card>
          ) : feedback.map((note) => (
            <Card key={note.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">{note.gymName}</p>
                <p className="text-[0.75rem] text-stone">{when(note.createdAt)}</p>
              </div>
              <p className="literal mt-1 text-[0.75rem] text-stone">{note.authorEmail}{note.path ? ` · ${note.path}` : ""}</p>
              <p className="mt-3 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-graphite">{note.message}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
