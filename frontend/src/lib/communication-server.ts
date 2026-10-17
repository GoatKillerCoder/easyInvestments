import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const communicationServer = () => import("@/lib/communication.server");

const sessionSchema = z.object({ sessionToken: z.string().min(1).max(500) });
const clientListSchema = sessionSchema;
const createConversationSchema = sessionSchema.extend({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(10_000),
});
const clientConversationSchema = sessionSchema.extend({
  conversationId: z.string().uuid(),
});
const sendClientMessageSchema = clientConversationSchema.extend({
  messageId: z.string().uuid(),
  message: z.string().trim().min(1).max(10_000),
});
const adminSchema = z.object({ adminToken: z.string().min(1).max(256) });
const adminListSchema = adminSchema.extend({
  search: z.string().trim().max(160).default(""),
  status: z.enum(["All", "Open", "Pending", "Resolved", "Closed"]).default("All"),
  priority: z.enum(["All", "Low", "Normal", "High", "Urgent"]).default("All"),
  page: z.number().int().min(1).default(1),
});
const adminConversationSchema = adminSchema.extend({
  conversationId: z.string().uuid(),
});
const sendAdminMessageSchema = adminConversationSchema.extend({
  messageId: z.string().uuid(),
  message: z.string().trim().min(1).max(10_000),
});
const updateConversationSchema = adminConversationSchema.extend({
  status: z.enum(["Open", "Pending", "Resolved", "Closed"]).optional(),
  priority: z.enum(["Low", "Normal", "High", "Urgent"]).optional(),
});

type CommunicationBackend = typeof import("@/lib/communication.server");

async function invoke<T>(
  label: string,
  operation: (backend: CommunicationBackend) => Promise<T>,
): Promise<T> {
  let backend: CommunicationBackend | undefined;
  try {
    backend = await communicationServer();
    return await operation(backend);
  } catch (error) {
    if (backend && error instanceof backend.CommunicationError) throw error;
    console.error(`Communication ${label} failed.`, {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    throw new Error("The support request could not be completed. Please try again.");
  }
}

export const listClientConversationsServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => clientListSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("client conversation list", (backend) => backend.listClientConversations(data)),
  );

export const createClientConversationServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => createConversationSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("conversation creation", (backend) => backend.createClientConversation(data)),
  );

export const getClientConversationServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => clientConversationSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("client conversation fetch", (backend) => backend.getClientConversation(data)),
  );

export const sendClientMessageServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => sendClientMessageSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("client message write", (backend) => backend.sendClientMessage(data)),
  );

export const listAdminConversationsServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminListSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("administrator conversation list", (backend) => backend.listAdminConversations(data)),
  );

export const getAdminConversationServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminConversationSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("administrator conversation fetch", (backend) => backend.getAdminConversation(data)),
  );

export const sendAdminMessageServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => sendAdminMessageSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("administrator message write", (backend) => backend.sendAdminMessage(data)),
  );

export const updateAdminConversationServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateConversationSchema.parse(data))
  .handler(async ({ data }) =>
    invoke("administrator conversation update", (backend) => backend.updateAdminConversation(data)),
  );
