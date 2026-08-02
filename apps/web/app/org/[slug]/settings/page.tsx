import { SettingsWorkspace } from "@/app/ui/platform-workspace";
import { StagingSettingsWorkspace } from "@/app/ui/staging-platform-workspaces";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (isDemoMode()) return <SettingsWorkspace />;
  const { slug } = await params;
  const { membership } = await requireStagingWorkspace(slug);
  const members = await import("@atlas/db/client").then(({ prisma }) =>
    prisma.organizationMembership.findMany({
      where: { organizationId: membership.organizationId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  );
  return (
    <StagingSettingsWorkspace
      organization={{ name: membership.organization.name, slug }}
      members={members.map((member) => ({
        name: member.user.name,
        email: member.user.email,
        role: member.role,
      }))}
    />
  );
}
