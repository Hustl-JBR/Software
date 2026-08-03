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
  const load = await prisma.load.findFirst({
    where: {
      id,
      organization: {
        slug,
        memberships: { some: { userId, status: "ACTIVE" } },
      },
    },
    include: {
      carrier: true,
      stops: { orderBy: { sequence: "asc" } },
      driverAssignment: true,
    },
  });
  if (!load) return new Response("Not found", { status: 404 });
  const pdf = simplePdf(
    `READY FREIGHT - RATE CONFIRMATION ${load.loadNumber}`,
    [
      `Carrier: ${load.carrier?.legalName || "NOT BOOKED"}`,
      `MC: ${load.carrier?.mcNumber || ""}  USDOT: ${load.carrier?.usdotNumber || ""}`,
      `Carrier rate: $${(Number(load.carrierCostCents || 0n) / 100).toFixed(2)}`,
      `Pickup: ${address(load.stops[0])}`,
      `Delivery: ${address(load.stops.at(-1))}`,
      `Equipment: ${load.equipmentType}`,
      `Commodity: ${load.commodity}`,
      `Weight: ${load.weightPounds} lb`,
      `Driver: ${load.driverAssignment?.driverName || "To be provided"}`,
      `Instructions: ${load.specialInstructions || "None"}`,
      "Carrier agrees to provide safe, lawful transportation and return signed paperwork and POD promptly.",
      "Authorized carrier signature: ____________________  Date: __________",
    ],
  );
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rate-confirmation-${load.loadNumber}.pdf"`,
    },
  });
}
function address(
  stop:
    | {
        addressLine1: string | null;
        city: string;
        state: string;
        postalCode: string;
      }
    | undefined,
) {
  return stop
    ? [stop.addressLine1, stop.city, stop.state, stop.postalCode]
        .filter(Boolean)
        .join(", ")
    : "";
}
