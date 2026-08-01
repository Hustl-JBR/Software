import { notFound } from "next/navigation";
import { LoadsWorkspace } from "@/app/ui/loads-workspace";
import { DEMO_ORGANIZATION, isDemoMode } from "@/lib/demo-store";

export default async function LoadsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isDemoMode() || slug !== DEMO_ORGANIZATION.slug) notFound();
  return <LoadsWorkspace slug={slug} />;
}
