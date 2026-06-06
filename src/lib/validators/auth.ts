import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const phoneSchema = z
  .string()
  .trim()
  .max(32, "Phone number is too long")
  .regex(/^[0-9+()\-\s]*$/, "Use only phone characters");

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: phoneSchema.optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const passwordResetUpdateSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const inviteAcceptSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    phone: phoneSchema.optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetUpdateInput = z.infer<typeof passwordResetUpdateSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
