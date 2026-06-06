import { z } from "zod";
import {
  LOST_REASONS,
  leadStageSchema,
  lostReasonSchema,
  type LostReason,
} from "@/lib/validators/enums";

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  price: "Price",
  not_interested: "Not interested",
  competitor: "Competitor",
  no_response: "No response",
};

export const updateLeadStageBodySchema = z
  .object({
    stage: leadStageSchema,
    lost_reason: lostReasonSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.stage === "lost") {
      if (!data.lost_reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lost_reason is required when stage is lost",
          path: ["lost_reason"],
        });
      }
    } else if (data.lost_reason !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lost_reason is only valid when stage is lost",
        path: ["lost_reason"],
      });
    }
  });

export type UpdateLeadStageBody = z.infer<typeof updateLeadStageBodySchema>;

export const reassignLeadBodySchema = z.object({
  rep_id: z.string().uuid(),
});

export type ReassignLeadBody = z.infer<typeof reassignLeadBodySchema>;

export { LOST_REASONS };
