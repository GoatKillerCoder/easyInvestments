import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleGoogleCallback } = await import("@/lib/google-drive.server");
        return handleGoogleCallback(request);
      },
    },
  },
});
