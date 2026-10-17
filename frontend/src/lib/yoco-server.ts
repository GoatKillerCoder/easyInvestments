import { createServerFn } from "@tanstack/react-start";

const yocoServer = () => import("@/lib/yoco-payments.server");

export const createYocoDepositServerFn = createServerFn({ method: "POST" })
  .validator(async (data: unknown) => (await yocoServer()).checkoutInputSchema.parse(data))
  .handler(async ({ data }) => (await yocoServer()).createYocoDeposit(data));
