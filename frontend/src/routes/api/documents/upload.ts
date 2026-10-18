import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/documents/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleDocumentUpload } = await import("@/lib/google-drive.server");
        return handleDocumentUpload(request);
      },
    },
  },
});
