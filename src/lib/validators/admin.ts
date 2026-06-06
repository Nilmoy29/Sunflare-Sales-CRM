import { z } from "zod";
import { phoneSchema } from "@/lib/validators/auth";

export const createRepSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: phoneSchema.optional(),
  start_date: z.string().optional(),
});

export const setActiveSchema = z.object({
  user_id: z.string().uuid("Invalid user id"),
  active: z.boolean(),
});

export const resetPasswordSchema = z.object({
  user_id: z.string().uuid("Invalid user id"),
});

export const inviteRepSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: phoneSchema.optional(),
  start_date: z.string().optional(),
});

export type CreateRepInput = z.infer<typeof createRepSchema>;
export type SetActiveInput = z.infer<typeof setActiveSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type InviteRepInput = z.infer<typeof inviteRepSchema>;
