import type { UserRole } from "@sunflare/shared";

export type MobileAuthProfile = {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  phone: string | null;
};

export const GENERIC_LOGIN_ERROR =
  "Invalid email or password. Please try again.";

export const INACTIVE_ACCOUNT_ERROR =
  "This account is deactivated. Contact your manager.";
