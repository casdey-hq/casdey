"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { requireGym } from "@/lib/dal";
import { sendMail } from "@/lib/zoho-mail";
import { supabaseAdmin } from "@/lib/supabase";
import { supportThreadForGym } from "@/lib/support";
import type { SupportThread } from "@/lib/support-types";

export type SupportState = {
  error: string | null;
  sent: boolean;
  thread: SupportThread | null;
};

const INITIAL_MESSAGE_LIMIT = 4000;
const SUPPORT_NOTIFY_TO = process.env.SUPPORT_NOTIFY_TO ?? process.env.FEEDBACK_NOTIFY_TO ?? "davide@casdey.com";

function messageFrom(formData: FormData): string | null {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return null;
  return message.length <= INITIAL_MESSAGE_LIMIT ? message : "too-long";
}

export async function sendSupportMessageAction(
  _previous: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const { gym, session } = await requireGym();
  const message = messageFrom(formData);
  if (message === null) return { error: "Write a message before sending it.", sent: false, thread: null };
  if (message === "too-long") return { error: "Keep your message under 4,000 characters.", sent: false, thread: null };

  const admin = supabaseAdmin();
  let { data: conversation, error: conversationError } = await admin
    .from("support_conversations")
    .select("id")
    .eq("gym_id", gym.id)
    .maybeSingle();

  if (!conversation && !conversationError) {
    const created = await admin
      .from("support_conversations")
      .insert({ gym_id: gym.id, author_email: session.email })
      .select("id")
      .single();
    conversation = created.data;
    conversationError = created.error;
  }

  if (conversationError || !conversation) {
    console.error("[support] conversation failed", conversationError?.message);
    return { error: "We could not open this support chat. Try again.", sent: false, thread: null };
  }

  const conversationId = (conversation as { id: string }).id;
  const { error: messageError } = await admin.from("support_messages").insert({
    conversation_id: conversationId,
    sender: "gym",
    body: message,
  });
  if (messageError) {
    console.error("[support] message failed", messageError.message);
    return { error: "We could not send that message. Try again.", sent: false, thread: null };
  }

  await admin
    .from("support_conversations")
    .update({ status: "open", last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  try {
    await sendMail({
      to: SUPPORT_NOTIFY_TO,
      subject: `[casdey Support] ${gym.name}`,
      text: `New support message from ${gym.name} (${session.email}).\n\n${message}\n\nReply in casdey HQ: /admin?tab=support`,
    });
  } catch (error) {
    console.error("[support] notification email failed", error instanceof Error ? error.message : error);
  }

  revalidatePath("/admin");
  return { error: null, sent: true, thread: await supportThreadForGym(gym.id) };
}

export async function sendAdminSupportReplyAction(
  _previous: SupportState,
  formData: FormData,
): Promise<SupportState> {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  const message = messageFrom(formData);
  if (!conversationId) return { error: "This support conversation no longer exists.", sent: false, thread: null };
  if (message === null) return { error: "Write a reply before sending it.", sent: false, thread: null };
  if (message === "too-long") return { error: "Keep your reply under 4,000 characters.", sent: false, thread: null };

  const admin = supabaseAdmin();
  const { data: conversation } = await admin
    .from("support_conversations")
    .select("gym_id, author_email, gyms!inner(name)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return { error: "This support conversation no longer exists.", sent: false, thread: null };

  const row = conversation as { gym_id: string; author_email: string; gyms: { name: string } | { name: string }[] };
  const { error } = await admin.from("support_messages").insert({
    conversation_id: conversationId,
    sender: "support",
    body: message,
  });
  if (error) {
    console.error("[support] reply failed", error.message);
    return { error: "We could not send that reply. Try again.", sent: false, thread: null };
  }

  await admin
    .from("support_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  const gymName = Array.isArray(row.gyms) ? row.gyms[0]?.name ?? "your gym" : row.gyms?.name ?? "your gym";
  try {
    await sendMail({
      to: row.author_email,
      subject: "New reply from casdey support",
      text: `casdey support replied to ${gymName}.\n\n${message}\n\nOpen casdey to continue the conversation.`,
    });
  } catch (mailError) {
    console.error("[support] customer notification failed", mailError instanceof Error ? mailError.message : mailError);
  }

  revalidatePath("/admin");
  return { error: null, sent: true, thread: await supportThreadForGym(row.gym_id) };
}
