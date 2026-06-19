import { z } from "zod";

export const rdoTextSuggestionSchema = z.object({
  category: z.string().trim().min(1).optional(),
  context: z.string().trim().min(1).optional(),
});

export type RdoTextSuggestionInput = z.infer<typeof rdoTextSuggestionSchema>;
