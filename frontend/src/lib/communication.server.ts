import { z } from "zod";
import { requireAdminToken } from "@/lib/manual-account.server";
import {
  serverDatabase,
  serverEnvironmentValue,
  verifyUserSessionToken,
} from "@/lib/user-session.server";

const PAGE_SIZE = 25;
const CLIENT_MESSAGE_LIMIT_PER_MINUTE = 15;

const chatStatusSchema = z.enum(["Open", "Pending", "Resolved", "Closed"]);
const chatPrioritySchema = z.enum(["Low", "Normal", "High", "Urgent"]);

export class CommunicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommunicationError";
  }
}

type ClientConversationInput = {
  sessionToken: string;
  conversationId: string;
};

type ConversationRow = {
  id: string;
  user_id?: string;
  subject: string;
  status: z.infer<typeof chatStatusSchema>;
  priority: z.infer<typeof chatPrioritySchema>;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  client_name?: string;
  client_email?: string;
  latest_message?: string | null;
  last_message_at: string | null;
  created_at: string;
  unread: boolean;
};

type MessageRow = {
  id: string;
  sender_role: "client" | "admin";
  message_type: "text" | "system";
  message: string;
  created_at: string;
};

function database() {
  return serverDatabase();
}

async function requireClient(sessionToken: string): Promise<string> {
  const userId = await verifyUserSessionToken(sessionToken);
  if (!userId) throw new CommunicationError("A valid client session is required.");

  const sql = database();
  const users = await sql`SELECT id::text AS id FROM users WHERE id = ${userId}::uuid LIMIT 1`;
  if (!users.length) throw new CommunicationError("A valid client session is required.");
  return userId;
}

async function requireAdmin(adminToken: string): Promise<void> {
  try {
    await requireAdminToken(adminToken);
  } catch {
    throw new CommunicationError("Administrator authentication is required.");
  }
}

async function requireAdminSender(): Promise<{ id: string; name: string }> {
  let adminUserId: string;
  try {
    adminUserId = serverEnvironmentValue("ADMIN_USER_ID");
  } catch {
    throw new CommunicationError("Administrator messaging is not configured.");
  }
  if (!adminUserId || !z.string().uuid().safeParse(adminUserId).success) {
    throw new CommunicationError("Administrator messaging is not configured.");
  }

  const sql = database();
  const users = (await sql`
    SELECT id::text AS id, full_name AS name
    FROM users
    WHERE id = ${adminUserId}::uuid AND status = 'Active'
    LIMIT 1
  `) as { id: string; name: string }[];
  if (!users.length) throw new CommunicationError("The configured support account is unavailable.");
  return users[0]!;
}

async function countRecentClientMessages(userId: string): Promise<number> {
  const sql = database();
  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM chat_messages
    WHERE sender_id = ${userId}::uuid
      AND sender_role = 'client'
      AND message_type = 'text'
      AND created_at >= NOW() - INTERVAL '1 minute'
  `) as { count: number }[];
  return Number(rows[0]?.count ?? 0);
}

export async function listClientConversations({ sessionToken }: { sessionToken: string }) {
  const userId = await requireClient(sessionToken);
  const sql = database();
  return (await sql`
    SELECT c.id::text AS id, c.subject, c.status, c.priority,
           c.last_message_at::text AS last_message_at,
           c.created_at::text AS created_at,
           COALESCE((
             SELECT LEFT(m.message, 180)
             FROM chat_messages m
             WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
             ORDER BY m.created_at DESC, m.id DESC
             LIMIT 1
           ), '') AS latest_message,
           EXISTS (
             SELECT 1
             FROM chat_messages m
             WHERE m.conversation_id = c.id
               AND m.sender_role = 'admin'
               AND m.message_type = 'text'
               AND m.deleted_at IS NULL
               AND m.created_at > COALESCE(c.client_last_read_at, '-infinity'::timestamptz)
           ) AS unread
    FROM chat_conversations c
    WHERE c.user_id = ${userId}::uuid
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  `) as ConversationRow[];
}

export async function createClientConversation(data: {
  sessionToken: string;
  conversationId: string;
  messageId: string;
  subject: string;
  message: string;
}) {
  const userId = await requireClient(data.sessionToken);
  const sql = database();
  const existing = (await sql`
    SELECT c.id::text AS id, m.id::text AS message_id
    FROM chat_conversations c
    JOIN chat_messages m
      ON m.id = ${data.messageId}::uuid
      AND m.conversation_id = c.id
      AND m.sender_id = ${userId}::uuid
    WHERE c.id = ${data.conversationId}::uuid AND c.user_id = ${userId}::uuid
    LIMIT 1
  `) as { id: string; message_id: string }[];
  if (existing.length) return { id: existing[0]!.id };

  if ((await countRecentClientMessages(userId)) >= CLIENT_MESSAGE_LIMIT_PER_MINUTE) {
    throw new CommunicationError("Please wait before sending another support message.");
  }

  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}::text, 0))`,
    sql`
      INSERT INTO chat_conversations (
        id, user_id, subject, status, priority, last_message_at, created_at, updated_at
      )
      SELECT ${data.conversationId}::uuid, ${userId}::uuid, ${data.subject},
             'Open', 'Normal', NOW(), NOW(), NOW()
      WHERE (
        SELECT COUNT(*) FROM chat_messages
        WHERE sender_id = ${userId}::uuid
          AND sender_role = 'client'
          AND message_type = 'text'
          AND created_at >= NOW() - INTERVAL '1 minute'
      ) < ${CLIENT_MESSAGE_LIMIT_PER_MINUTE}
      ON CONFLICT (id) DO NOTHING
    `,
    sql`
      INSERT INTO chat_messages (
        id, conversation_id, sender_id, sender_role, message_type, message
      )
      SELECT ${data.messageId}::uuid, c.id, c.user_id, 'client', 'text', ${data.message}
      FROM chat_conversations c
      WHERE c.id = ${data.conversationId}::uuid AND c.user_id = ${userId}::uuid
        AND (
          SELECT COUNT(*) FROM chat_messages
          WHERE sender_id = ${userId}::uuid
            AND sender_role = 'client'
            AND message_type = 'text'
            AND created_at >= NOW() - INTERVAL '1 minute'
        ) < ${CLIENT_MESSAGE_LIMIT_PER_MINUTE}
      ON CONFLICT (id) DO NOTHING
    `,
  ]);

  const result = (await sql`
    SELECT c.id::text AS id, m.id::text AS message_id
    FROM chat_conversations c
    LEFT JOIN chat_messages m
      ON m.id = ${data.messageId}::uuid
      AND m.conversation_id = c.id
      AND m.sender_id = ${userId}::uuid
    WHERE c.id = ${data.conversationId}::uuid AND c.user_id = ${userId}::uuid
    LIMIT 1
  `) as { id: string; message_id: string | null }[];
  if (!result[0]?.message_id) {
    if ((await countRecentClientMessages(userId)) >= CLIENT_MESSAGE_LIMIT_PER_MINUTE) {
      throw new CommunicationError("Please wait before sending another support message.");
    }
    throw new CommunicationError("The conversation could not be created. Refresh and try again.");
  }
  return { id: result[0].id };
}

async function loadConversationMessages(conversationId: string) {
  const sql = database();
  return (await sql`
    SELECT id::text AS id, sender_role, message_type, message, created_at::text AS created_at
    FROM chat_messages
    WHERE conversation_id = ${conversationId}::uuid AND deleted_at IS NULL
    ORDER BY created_at ASC, id ASC
  `) as MessageRow[];
}

export async function getClientConversation(data: ClientConversationInput) {
  const userId = await requireClient(data.sessionToken);
  const sql = database();
  const conversations = (await sql`
    SELECT id::text AS id, subject, status, priority,
           last_message_at::text AS last_message_at,
           created_at::text AS created_at
    FROM chat_conversations
    WHERE id = ${data.conversationId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `) as ConversationRow[];
  if (!conversations.length) throw new CommunicationError("Conversation not found.");

  await sql`
    UPDATE chat_conversations
    SET client_last_read_at = NOW()
    WHERE id = ${data.conversationId}::uuid AND user_id = ${userId}::uuid
  `;
  return {
    conversation: conversations[0],
    messages: await loadConversationMessages(data.conversationId),
  };
}

export async function sendClientMessage(data: {
  sessionToken: string;
  conversationId: string;
  messageId: string;
  message: string;
}) {
  const userId = await requireClient(data.sessionToken);
  const sql = database();
  const existing = (await sql`
    SELECT id::text AS id FROM chat_messages
    WHERE id = ${data.messageId}::uuid
      AND conversation_id = ${data.conversationId}::uuid
      AND sender_id = ${userId}::uuid
    LIMIT 1
  `) as { id: string }[];
  if (existing.length) return { id: existing[0]!.id };

  if ((await countRecentClientMessages(userId)) >= CLIENT_MESSAGE_LIMIT_PER_MINUTE) {
    throw new CommunicationError("Please wait before sending another support message.");
  }

  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}::text, 0))`,
    sql`
      INSERT INTO chat_messages (
        id, conversation_id, sender_id, sender_role, message_type, message
      )
      SELECT ${data.messageId}::uuid, c.id, c.user_id, 'client', 'text', ${data.message}
      FROM chat_conversations c
      WHERE c.id = ${data.conversationId}::uuid
        AND c.user_id = ${userId}::uuid
        AND c.status IN ('Open', 'Pending')
        AND (
          SELECT COUNT(*) FROM chat_messages
          WHERE sender_id = ${userId}::uuid
            AND sender_role = 'client'
            AND message_type = 'text'
            AND created_at >= NOW() - INTERVAL '1 minute'
        ) < ${CLIENT_MESSAGE_LIMIT_PER_MINUTE}
      ON CONFLICT (id) DO NOTHING
    `,
  ]);

  const result = (await sql`
    SELECT id::text AS id FROM chat_messages
    WHERE id = ${data.messageId}::uuid
      AND conversation_id = ${data.conversationId}::uuid
      AND sender_id = ${userId}::uuid
    LIMIT 1
  `) as { id: string }[];
  if (!result.length) {
    if ((await countRecentClientMessages(userId)) >= CLIENT_MESSAGE_LIMIT_PER_MINUTE) {
      throw new CommunicationError("Please wait before sending another support message.");
    }
    throw new CommunicationError("This conversation is closed or the message could not be sent.");
  }
  return { id: result[0]!.id };
}

function adminInboxConditions({
  search,
  status,
  priority,
}: {
  search: string;
  status: string;
  priority: string;
}) {
  return {
    pattern: search ? `%${search}%` : null,
    status,
    priority,
  };
}

export async function listAdminConversations(data: {
  adminToken: string;
  search: string;
  status: string;
  priority: string;
  page: number;
}) {
  await requireAdmin(data.adminToken);
  const sql = database();
  const conditions = adminInboxConditions(data);
  const offset = (data.page - 1) * PAGE_SIZE;
  const [rows, counts] = await Promise.all([
    sql`
      SELECT c.id::text AS id, c.user_id::text AS user_id, c.subject, c.status, c.priority,
             c.assigned_admin_id::text AS assigned_admin_id,
             assigned.full_name AS assigned_admin_name,
             client.full_name AS client_name, client.email AS client_email,
             latest.message AS latest_message,
             c.last_message_at::text AS last_message_at,
             c.created_at::text AS created_at,
             EXISTS (
               SELECT 1
               FROM chat_messages m
               WHERE m.conversation_id = c.id
                 AND m.sender_role = 'client'
                 AND m.message_type = 'text'
                 AND m.deleted_at IS NULL
                 AND m.created_at > COALESCE(c.admin_last_read_at, '-infinity'::timestamptz)
             ) AS unread
      FROM chat_conversations c
      JOIN users client ON client.id = c.user_id
      LEFT JOIN users assigned ON assigned.id = c.assigned_admin_id
      LEFT JOIN LATERAL (
        SELECT LEFT(m.message, 180) AS message
        FROM chat_messages m
        WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) latest ON true
      WHERE (${conditions.status} = 'All' OR c.status = ${conditions.status})
        AND (${conditions.priority} = 'All' OR c.priority = ${conditions.priority})
        AND (
          ${conditions.pattern}::text IS NULL
          OR client.full_name ILIKE ${conditions.pattern}
          OR client.email ILIKE ${conditions.pattern}
          OR c.subject ILIKE ${conditions.pattern}
        )
      ORDER BY CASE WHEN c.status IN ('Open', 'Pending') THEN 0 ELSE 1 END,
               c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM chat_conversations c
      JOIN users client ON client.id = c.user_id
      WHERE (${conditions.status} = 'All' OR c.status = ${conditions.status})
        AND (${conditions.priority} = 'All' OR c.priority = ${conditions.priority})
        AND (
          ${conditions.pattern}::text IS NULL
          OR client.full_name ILIKE ${conditions.pattern}
          OR client.email ILIKE ${conditions.pattern}
          OR c.subject ILIKE ${conditions.pattern}
        )
    `,
  ]);
  const conversations = rows as ConversationRow[];
  const total = Number((counts as { count: number }[])[0]?.count ?? 0);
  return { conversations, total, page: data.page, pageSize: PAGE_SIZE };
}

export async function getAdminConversation(data: { adminToken: string; conversationId: string }) {
  await requireAdmin(data.adminToken);
  const sql = database();
  const conversations = (await sql`
    SELECT c.id::text AS id, c.user_id::text AS user_id, c.subject, c.status, c.priority,
           c.assigned_admin_id::text AS assigned_admin_id,
           assigned.full_name AS assigned_admin_name,
           client.full_name AS client_name, client.email AS client_email,
           c.last_message_at::text AS last_message_at,
           c.created_at::text AS created_at
    FROM chat_conversations c
    JOIN users client ON client.id = c.user_id
    LEFT JOIN users assigned ON assigned.id = c.assigned_admin_id
    WHERE c.id = ${data.conversationId}::uuid
    LIMIT 1
  `) as ConversationRow[];
  if (!conversations.length) throw new CommunicationError("Conversation not found.");

  await sql`
    UPDATE chat_conversations SET admin_last_read_at = NOW()
    WHERE id = ${data.conversationId}::uuid
  `;
  return {
    conversation: conversations[0],
    messages: await loadConversationMessages(data.conversationId),
  };
}

export async function sendAdminMessage(data: {
  adminToken: string;
  conversationId: string;
  messageId: string;
  message: string;
}) {
  await requireAdmin(data.adminToken);
  const admin = await requireAdminSender();
  const sql = database();
  const existing = (await sql`
    SELECT id::text AS id FROM chat_messages
    WHERE id = ${data.messageId}::uuid
      AND conversation_id = ${data.conversationId}::uuid
      AND sender_id = ${admin.id}::uuid
    LIMIT 1
  `) as { id: string }[];
  if (existing.length) return { id: existing[0]!.id };

  await sql`
    INSERT INTO chat_messages (
      id, conversation_id, sender_id, sender_role, message_type, message
    )
    SELECT ${data.messageId}::uuid, c.id, ${admin.id}::uuid, 'admin', 'text', ${data.message}
    FROM chat_conversations c
    WHERE c.id = ${data.conversationId}::uuid
      AND c.status IN ('Open', 'Pending')
    ON CONFLICT (id) DO NOTHING
  `;

  const result = (await sql`
    SELECT id::text AS id FROM chat_messages
    WHERE id = ${data.messageId}::uuid
      AND conversation_id = ${data.conversationId}::uuid
      AND sender_id = ${admin.id}::uuid
    LIMIT 1
  `) as { id: string }[];
  if (!result.length) {
    throw new CommunicationError("This conversation is closed or the message could not be sent.");
  }
  return { id: result[0]!.id };
}

export async function updateAdminConversation(data: {
  adminToken: string;
  conversationId: string;
  status?: string | undefined;
  priority?: string | undefined;
}) {
  await requireAdmin(data.adminToken);
  const admin = await requireAdminSender();
  if (!data.status && !data.priority) {
    throw new CommunicationError("Select a conversation setting to update.");
  }
  const status = data.status ? chatStatusSchema.parse(data.status) : null;
  const priority = data.priority ? chatPrioritySchema.parse(data.priority) : null;
  const events = [
    ...(status ? [`Status changed to ${status}.`] : []),
    ...(priority ? [`Priority changed to ${priority}.`] : []),
  ];
  const sql = database();
  const statements = [
    sql`
      UPDATE chat_conversations
      SET status = COALESCE(${status}, status),
          priority = COALESCE(${priority}, priority),
          updated_at = NOW()
      WHERE id = ${data.conversationId}::uuid
    `,
    ...events.map(
      (message) => sql`
        INSERT INTO chat_messages (
          id, conversation_id, sender_id, sender_role, message_type, message
        )
        SELECT ${crypto.randomUUID()}::uuid, c.id, ${admin.id}::uuid, 'admin', 'system', ${message}
        FROM chat_conversations c
        WHERE c.id = ${data.conversationId}::uuid
      `,
    ),
  ];
  await sql.transaction(statements);

  const result = (await sql`
    SELECT id::text AS id, subject, status, priority,
           last_message_at::text AS last_message_at,
           created_at::text AS created_at
    FROM chat_conversations
    WHERE id = ${data.conversationId}::uuid
    LIMIT 1
  `) as ConversationRow[];
  if (!result.length) throw new CommunicationError("Conversation not found.");
  return result[0];
}
