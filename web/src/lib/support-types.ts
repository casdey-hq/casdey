export type SupportSender = "gym" | "support";

export type SupportMessageView = {
  id: string;
  sender: SupportSender;
  body: string;
  createdAt: string;
};

export type SupportThread = {
  conversationId: string | null;
  status: "open" | "closed" | null;
  messages: SupportMessageView[];
};

export type SupportInboxConversation = SupportThread & {
  gymId: string;
  gymName: string;
  authorEmail: string;
  lastMessageAt: string;
};

export type FeedbackInboxNote = {
  id: string;
  gymName: string;
  authorEmail: string;
  message: string;
  path: string | null;
  createdAt: string;
};
