import { redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { DEMO_ORGANIZATION, isDemoMode } from "@/lib/demo-store";
export default async function Dashboard() {
  if (isDemoMode()) redirect(`/org/${DEMO_ORGANIZATION.slug}`);
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { organization: true },
  });
  if (!membership) redirect("/sign-in");
  redirect(`/org/${membership.organization.slug}`);
}
