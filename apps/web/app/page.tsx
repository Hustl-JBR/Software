import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { DEMO_ORGANIZATION, isDemoMode } from "@/lib/demo-store";
export default async function Home() {
  if (isDemoMode()) redirect(`/org/${DEMO_ORGANIZATION.slug}`);
  redirect((await getSessionUserId()) ? "/dashboard" : "/sign-in");
}
