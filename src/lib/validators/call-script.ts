import { z } from "zod";

export const CALL_SCRIPT_BODY_MAX_LENGTH = 10_000;

export const callScriptRowSchema = z.object({
  body: z.string(),
  updated_at: z.string().nullable(),
});

export type CallScriptRow = z.infer<typeof callScriptRowSchema>;

export const callScriptResponseSchema = callScriptRowSchema;

export type CallScriptResponse = z.infer<typeof callScriptResponseSchema>;

export const updateCallScriptBodySchema = z.object({
  body: z
    .string()
    .max(
      CALL_SCRIPT_BODY_MAX_LENGTH,
      `Script must be at most ${CALL_SCRIPT_BODY_MAX_LENGTH} characters`,
    ),
});

export type UpdateCallScriptBody = z.infer<typeof updateCallScriptBodySchema>;
