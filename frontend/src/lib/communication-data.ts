import {
  createClientConversationServerFn,
  getAdminConversationServerFn,
  getClientConversationServerFn,
  listAdminConversationsServerFn,
  listClientConversationsServerFn,
  sendAdminMessageServerFn,
  sendClientMessageServerFn,
  updateAdminConversationServerFn,
} from "@/lib/communication-server";

export type CommunicationStatus = "Open" | "Pending" | "Resolved" | "Closed";
export type CommunicationPriority = "Low" | "Normal" | "High" | "Urgent";

export type CommunicationConversation = {
  id: string;
  user_id?: string;
  subject: string;
  status: CommunicationStatus;
  priority: CommunicationPriority;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  client_name?: string;
  client_email?: string;
  latest_message?: string | null;
  last_message_at: string | null;
  created_at: string;
  unread?: boolean;
};

export type CommunicationMessage = {
  id: string;
  sender_role: "client" | "admin";
  message_type: "text" | "system";
  message: string;
  created_at: string;
};

export function formatCommunicationDate(value: string | null | undefined) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-ZA", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export function communicationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function listClientConversations(sessionToken: string) {
  return listClientConversationsServerFn({ data: { sessionToken } });
}

export function createClientConversation(data: {
  sessionToken: string;
  conversationId: string;
  messageId: string;
  subject: string;
  message: string;
}) {
  return createClientConversationServerFn({ data });
}

export function getClientConversation(sessionToken: string, conversationId: string) {
  return getClientConversationServerFn({ data: { sessionToken, conversationId } });
}

export function sendClientMessage(data: {
  sessionToken: string;
  conversationId: string;
  messageId: string;
  message: string;
}) {
  return sendClientMessageServerFn({ data });
}

export function listAdminConversations(data: {
  adminToken: string;
  search: string;
  status: "All" | CommunicationStatus;
  priority: "All" | CommunicationPriority;
  page: number;
}) {
  return listAdminConversationsServerFn({ data });
}

export function getAdminConversation(adminToken: string, conversationId: string) {
  return getAdminConversationServerFn({ data: { adminToken, conversationId } });
}

export function sendAdminMessage(data: {
  adminToken: string;
  conversationId: string;
  messageId: string;
  message: string;
}) {
  return sendAdminMessageServerFn({ data });
}

export function updateAdminConversation(data: {
  adminToken: string;
  conversationId: string;
  status?: CommunicationStatus;
  priority?: CommunicationPriority;
}) {
  return updateAdminConversationServerFn({ data });
}
