import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const manualAccountServer = () => import("@/lib/manual-account.server");

const holdingSchema = z.object({
  fundName: z.string(),
  ticker: z.string(),
  marketValue: z.number().finite().nonnegative(),
  changePct: z.string(),
});

const transactionSchema = z.object({
  date: z.string(),
  type: z.enum(["Deposit", "Withdrawal"]),
  method: z.string(),
  status: z.enum(["Completed", "Rejected"]),
  amount: z.number().finite().nonnegative(),
});

const accountSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().max(64),
  country: z.string().max(100),
  address: z.string().max(500),
  registeredDate: z.string().min(1),
  accountType: z.string().min(1).max(100),
  company: z.string().trim().max(200).default(""),
  status: z.enum(["Active", "Pending", "Suspended", "Deactivated"]),
  accountPlatform: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(100),
  balance: z.number().finite().nonnegative(),
  portfolioValue: z.number().finite().nonnegative(),
  totalInvested: z.number().finite().nonnegative(),
  holdings: z.array(holdingSchema).max(500),
  transactions: z.array(transactionSchema).max(2000),
});

const registrationSchema = z.object({
  account: accountSchema,
  password: z.string().min(8).max(1024),
});

const adminPinSchema = z.object({ pin: z.string().min(1).max(128) });
const adminTokenSchema = z.object({ adminToken: z.string().min(1).max(256) });
const adminRegistrationSchema = adminTokenSchema.extend({ registration: registrationSchema });
const adminAccountUpdateSchema = adminTokenSchema.extend({
  account: accountSchema,
  password: z.string().min(8).max(1024).optional(),
});
const adminAccountStatusUpdateSchema = adminTokenSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["Active", "Pending", "Suspended", "Deactivated"]),
});
const adminAccountDeleteSchema = adminTokenSchema.extend({ id: z.string().uuid() });
const accountIdSchema = z.object({
  id: z.string().uuid(),
  sessionToken: z.string().min(1).max(500),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1024),
  company: z.string().trim().min(1).max(200),
});
const deactivateAccountSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(1).max(1024),
});
const changePasswordSchema = z.object({
  id: z.string().uuid(),
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(8).max(1024),
});

export const authenticateAdminServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminPinSchema.parse(data))
  .handler(async ({ data }) => (await manualAccountServer()).authenticateAdminServerFn({ data }));

export const getManualAccountsServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => (await manualAccountServer()).getManualAccountsServerFn({ data }));

export const getManualAccountServerFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => accountIdSchema.parse(data))
  .handler(async ({ data }) => (await manualAccountServer()).getManualAccountServerFn({ data }));

export const registerManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => registrationSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).registerManualAccountServerFn({ data }),
  );

export const registerAdminManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminRegistrationSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).registerAdminManualAccountServerFn({ data }),
  );

export const updateAdminManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminAccountUpdateSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).updateAdminManualAccountServerFn({ data }),
  );

export const updateAdminManualAccountStatusServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminAccountStatusUpdateSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).updateAdminManualAccountStatusServerFn({ data }),
  );

export const deleteAdminManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminAccountDeleteSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).deleteAdminManualAccountServerFn({ data }),
  );

export const authenticateManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).authenticateManualAccountServerFn({ data }),
  );

export const deactivateManualAccountServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => deactivateAccountSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).deactivateManualAccountServerFn({ data }),
  );

export const changeManualAccountPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => changePasswordSchema.parse(data))
  .handler(async ({ data }) =>
    (await manualAccountServer()).changeManualAccountPasswordServerFn({ data }),
  );
