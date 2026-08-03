import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { simplePdf } from "@/lib/simple-pdf";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { slug, id } = await params;
  const quote = await prisma.quote.findFirst({
    where: {
      id,
      organization: {
        slug,
        memberships: { some: { userId, status: "ACTIVE" } },
      },
    },
  });
  if (!quote) return new Response("Not found", { status: 404 });
  const pdf = simplePdf(`READY FREIGHT - QUOTE ${quote.quoteNumber || ""}`, [
    "Ready Operations",
    `Contact: ${quote.contactName || ""} ${quote.contactEmail || ""}`,
    `Pickup: ${quote.pickupAddress || ""}`,
    `Delivery: ${quote.deliveryAddress || ""}`,
    `Dates: ${quote.pickupDate?.toLocaleDateString() || ""} to ${quote.deliveryDate?.toLocaleDateString() || ""}`,
    `Equipment: ${quote.equipmentType || ""}`,
    `Commodity: ${quote.commodity || ""}`,
    `Weight: ${quote.weightPounds || 0} lb`,
    `Customer price: $${(Number(quote.amountCents) / 100).toFixed(2)}`,
    `Instructions: ${quote.specialInstructions || "None"}`,
  ]);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.quoteNumber || "quote"}.pdf"`,
    },
  });
}
