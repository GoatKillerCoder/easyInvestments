import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/documents/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleDocumentDownload } = await import("@/lib/google-drive.server");
        return handleDocumentDownload(request);
      },
    },
  },
});
