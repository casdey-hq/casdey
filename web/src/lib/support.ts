import "server-only";

import { supabaseAdmin } from "./supabase";
import type {
  FeedbackInboxNote,
  SupportInboxConversation,
  SupportMessageView,
  SupportThread,
} from "./support-types";

type ConversationRow = {
  id: string;
  gym_id: string;
  author_email: string;
  status: "open" | "closed";
  created_at: string;
  last_message_at: string;
  gyms?: { name: string } | { name: string }[] | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender: "gym" | "support";
  body: string;
  created_at: string;
};

function toMessage(row: MessageRow): SupportMessageView {
  return {
    id: row.id,
    sender: row.sender,
    body: row.body,
    createdAt: row.created_at,
  };
}

function gymName(row: ConversationRow): string {
  const joined = Array.isArray(row.gyms) ? row.gyms[0] : row.gyms;
  return joined?.name ?? "Unknown gym";
}

export async function supportThreadForGym(gymId: string): Promise<SupportThread> {
  const admin = supabaseAdmin();
  const { data: conversation } = await admin
    .from("support_conversations")
    .select("id, status")
    .eq("gym_id", gymId)
    .maybeSingle();

  if (!conversation) {
    return { conversationId: null, status: null, messages: [] };
  }

  const row = conversation as { id: string; status: "open" | "closed" };
  const { data: messages } = await admin
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("conversation_id", row.id)
    .order("created_at", { ascending: true });

  return {
    conversationId: row.id,
    status: row.status,
    messages: ((messages ?? []) as MessageRow[]).map(toMessage),
  };
}

export async function supportInbox(): Promise<{
  conversations: SupportInboxConversation[];
  feedback: FeedbackInboxNote[];
}> {
  const admin = supabaseAdmin();
  const [{ data: conversations }, { data: feedbackRows }] = await Promise.all([
    admin
      .from("support_conversations")
      .select("id, gym_id, author_email, status, created_at, last_message_at, gyms!inner(name)")
      .order("last_message_at", { ascending: false })
      .limit(100),
    admin
      .from("feedback")
      .select("id, message, path, author_email, created_at, gyms!inner(name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const rows = (conversations ?? []) as ConversationRow[];
  const ids = rows.map((row) => row.id);
  const { data: messageRows } = ids.length
    ? await admin
        .from("support_messages")
        .select("id, conversation_id, sender, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] as MessageRow[] };

  const byConversation = new Map<string, SupportMessageView[]>();
  for (const message of (messageRows ?? []) as MessageRow[]) {
    const current = byConversation.get(message.conversation_id) ?? [];
    current.push(toMessage(message));
    byConversation.set(message.conversation_id, current);
  }

  const feedback = ((feedbackRows ?? []) as Array<{
    id: string;
    message: string;
    path: string | null;
    author_email: string;
    created_at: string;
    gyms: { name: string } | { name: string }[] | null;
  }>).map((row) => ({
    id: row.id,
    gymName: Array.isArray(row.gyms) ? row.gyms[0]?.name ?? "Unknown gym" : row.gyms?.name ?? "Unknown gym",
    authorEmail: row.author_email,
    message: row.message,
    path: row.path,
    createdAt: row.created_at,
  }));

  return {
    conversations: rows.map((row) => ({
      conversationId: row.id,
      gymId: row.gym_id,
      gymName: gymName(row),
      authorEmail: row.author_email,
      status: row.status,
      lastMessageAt: row.last_message_at,
      messages: byConversation.get(row.id) ?? [],
    })),
    feedback,
  };
}
