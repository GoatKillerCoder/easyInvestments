import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const withdrawalServer = () => import("@/lib/withdrawals.server");

export const createWithdrawalRequestServerFn = createServerFn({ method: "POST" })
  .validator(async (data: unknown) =>
    (await withdrawalServer()).createWithdrawalInputSchema.parse(data),
  )
  .handler(async ({ data }) => (await withdrawalServer()).createWithdrawalRequest(data));

export const listWithdrawalRequestsAdminServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ adminToken: z.string().min(1).max(256) }).parse(data))
  .handler(async ({ data }) => (await withdrawalServer()).listWithdrawalRequestsAdmin(data));

export const updateWithdrawalRequestAdminServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        adminToken: z.string().min(1).max(256),
        reference: z.string().uuid(),
        status: z.enum(["Processing", "Rejected"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => (await withdrawalServer()).updateWithdrawalRequestAdmin(data));
