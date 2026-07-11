import { redirect } from "next/navigation";
import { SIGNUP_PATH } from "@/lib/auth/paths";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

/** Legacy invite route — onboarding now lives at `/signup`. */
export default async function InviteAcceptRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const destination = params.error
    ? `${SIGNUP_PATH}?error=${encodeURIComponent(params.error)}`
    : SIGNUP_PATH;
  redirect(destination);
}
