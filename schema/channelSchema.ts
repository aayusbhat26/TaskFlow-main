import { z } from "zod";
import { ChannelType } from "@prisma/client";

export const newChannelCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  workspaceId: z.string().cuid("Invalid workspace ID"),
  order: z.number().optional().default(0),
});

export const newChannelSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long").regex(/^[a-z0-9-]+$/, "Channel names can only contain lowercase letters, numbers, and hyphens"),
  type: z.nativeEnum(ChannelType).default(ChannelType.TEXT),
  workspaceId: z.string().cuid("Invalid workspace ID"),
  categoryId: z.string().cuid("Invalid category ID").optional().nullable(),
  order: z.number().optional().default(0),
});

export type NewChannelCategorySchema = z.infer<typeof newChannelCategorySchema>;
export type NewChannelSchema = z.infer<typeof newChannelSchema>;
