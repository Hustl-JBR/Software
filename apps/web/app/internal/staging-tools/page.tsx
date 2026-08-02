import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@atlas/db/client";
import { StagingToolsWorkspace } from "@/app/ui/staging-tools-workspace";

export default async function InternalStagingTools({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", user: { active: true } },
    include: { organization: true },
    orderBy: { organization: { slug: "asc" } },
  });
  if (!membership) redirect("/sign-in");
  return (
    <StagingToolsWorkspace
      params={Promise.resolve({ slug: membership.organization.slug })}
      searchParams={searchParams}
    />
  );
}
