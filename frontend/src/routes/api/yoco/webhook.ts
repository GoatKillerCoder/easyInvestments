import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/yoco/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { handleYocoWebhook } = await import("@/lib/yoco-payments.server");
          return await handleYocoWebhook(request);
        } catch (error) {
          console.error("Unable to process the Yoco webhook.", error);
          return new Response("Webhook processing failed.", { status: 500 });
        }
      },
    },
  },
});
