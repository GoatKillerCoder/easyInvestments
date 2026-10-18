import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const driveServer = () => import("@/lib/google-drive.server");
const adminTokenSchema = z.object({ adminToken: z.string().min(1).max(256) });

export const startGoogleDriveAuthServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => (await driveServer()).startGoogleDriveAuth(data));

export const getGoogleDriveStatusServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => (await driveServer()).getGoogleDriveStatus(data));

export const listDepositDocumentsAdminServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminTokenSchema.parse(data))
  .handler(async ({ data }) => (await driveServer()).listDepositDocumentsAdmin(data));
