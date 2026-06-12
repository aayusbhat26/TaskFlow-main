import { z } from "zod";

export const textNodeSchema = z.object({
  text: z.string().min(1, "Text must not be empty"),
});

export type TextNodeSchema = z.infer<typeof textNodeSchema>;
