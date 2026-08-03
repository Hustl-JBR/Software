import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";

export async function GET(
  _: Request,
  {
    params,
  }: { params: Promise<{ slug: string; id: string; documentId: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { slug, id, documentId } = await params;
  const document = await prisma.loadDocument.findFirst({
    where: {
      id: documentId,
      loadId: id,
      organization: {
        slug,
        memberships: { some: { userId, status: "ACTIVE" } },
      },
    },
  });
  if (!document) return new Response("Not found", { status: 404 });
  return new Response(document.content, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${document.fileName.replaceAll('"', "")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
