import { z } from "zod";
import { MAX_FILE_SIZE, ACCEPTED_IMAGE_TYPES } from "./imageSchema";

const file = z
  .any()
  .refine((file) => file?.size <= MAX_FILE_SIZE, "SCHEMA.IMAGE.MAX")
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
    "SCHEMA.IMAGE.SUPPORTED"
  )
  .optional()
  .nullable();

export const color = z.enum([
  "PURPLE",
  "RED",
  "GREEN",
  "BLUE",
  "PINK",
  "YELLOW",
  "ORANGE",
  "CYAN",
  "LIME",
  "EMERALD",
  "INDIGO",
  "FUCHSIA",
]);

const workspaceName = z
  .string()
  .min(4, "Workspace name must be at least 4 characters")
  .max(20, "SCHEMA.WORKSPACE.LONG")
  .refine((username) => /^[a-zA-Z0-9]+$/.test(username), {
    message: "SCHEMA.WORKSPACE.SPECIAL_CHARS",
  });

export const workspaceSchema = z.object({
  workspaceName,
  file,
});

export const apiWorkspaceSchema = z.object({
  workspaceName: z
    .string()
    .min(4, "Workspace name must be at least 4 characters")
    .refine((username) => /^[a-zA-Z0-9]+$/.test(username), {
      message: "SCHEMA.WORKSPACE.SPECIAL_CHARS",
    }),
  file: z.string().optional().nullable(),
});

export const workspacePicture = z.object({
  file,
});

export const apiWorkspaceDeletePicture = z.object({
  id: z.string(),
});

export const apiWorkspacePicture = z.object({
  picture: z.string(),
  id: z.string(),
});

export const workspaceEditData = z.object({ workspaceName, color });

export const apiWorkspaceEditData = z.object({
  id: z.string(),
  workspaceName,
  color,
});

export const id = z.string();

export const apiWorkspaceDelete = z.object({
  id,
  workspaceName,
});

export type ApiWorkspaceDelete = z.infer<typeof apiWorkspaceDelete>;

export type ApiWorkspacePicture = z.infer<typeof apiWorkspacePicture>;

export type WorkspaceEditData = z.infer<typeof workspaceEditData>;
export type ApiWorkspaceEditData = z.infer<typeof apiWorkspaceEditData>;

export type WorkspacePicture = z.infer<typeof workspacePicture>;

export type ApiWorkspaceSchema = z.infer<typeof apiWorkspaceSchema>;

export type WorkspaceSchema = z.infer<typeof workspaceSchema>;
