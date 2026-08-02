import { notFound, redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { effectiveRoles } from "@atlas/auth/membership";

export async function requireStagingWorkspace(slug: string) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
    include: {
      organization: true,
      user: true,
      roles: true,
    },
  });
  if (!membership) notFound();
  const roles = effectiveRoles(
    membership.role,
    membership.roles.map((item) => item.role),
  );
  return { userId, membership, roles };
}
