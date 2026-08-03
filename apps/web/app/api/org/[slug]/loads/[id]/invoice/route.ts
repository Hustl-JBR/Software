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
  const invoice = await prisma.customerInvoice.findFirst({
    where: {
      loadId: id,
      organization: {
        slug,
        memberships: { some: { userId, status: "ACTIVE" } },
      },
    },
    include: {
      load: {
        include: { customer: true, stops: { orderBy: { sequence: "asc" } } },
      },
    },
  });
  if (!invoice) return new Response("Not found", { status: 404 });
  const total = invoice.freightChargeCents + invoice.accessorialsCents;
  const pdf = simplePdf(`READY FREIGHT - INVOICE ${invoice.invoiceNumber}`, [
    `Bill to: ${invoice.load.customer.name}`,
    `Billing address: ${invoice.load.customer.billingAddress || "Not provided"}`,
    `Load: ${invoice.load.loadNumber}`,
    `Lane: ${invoice.load.stops.map((s) => `${s.city}, ${s.state}`).join(" to ")}`,
    `Freight charge: $${(Number(invoice.freightChargeCents) / 100).toFixed(2)}`,
    `Accessorials: $${(Number(invoice.accessorialsCents) / 100).toFixed(2)}`,
    `Total due: $${(Number(total) / 100).toFixed(2)}`,
    `Terms: ${invoice.paymentTerms || "Net 30"}`,
    `Status: ${invoice.status}`,
  ]);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
