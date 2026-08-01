import { DocumentsWorkspace } from "@/app/ui/platform-workspace";
import { StagingDocumentsWorkspace } from "@/app/ui/staging-platform-workspaces";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (isDemoMode()) return <DocumentsWorkspace />;
  const { slug } = await params;
  await requireStagingWorkspace(slug);
  return <StagingDocumentsWorkspace />;
}
