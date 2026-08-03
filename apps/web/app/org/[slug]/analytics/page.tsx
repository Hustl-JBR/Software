import { redirect } from "next/navigation";
export default async function LegacyAnalytics({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/org/${slug}/money`);
}
