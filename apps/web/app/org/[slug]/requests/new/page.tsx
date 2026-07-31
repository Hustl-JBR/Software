import { notFound, redirect } from "next/navigation";
import { ShipmentForm } from "@/app/ui/shipment-form";
import { ErrorAlert } from "@/app/ui/error-alert";
import { submitShipment } from "@/app/actions";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@atlas/db/client";
export default async function NewRequest({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
  });
  if (!membership) notFound();
  return (
    <>
      <a className="back" href={`/org/${slug}`}>
        ← Dashboard
      </a>
      <p className="eyebrow">Shipment intake</p>
      <h1>New shipment request</h1>
      <p className="muted lead">
        Enter plain English, structured facts, or both. Atlas will never guess
        required information.
      </p>
      <ErrorAlert code={(await searchParams).error} />
      <form action={submitShipment}>
        <input type="hidden" name="organizationSlug" value={slug} />
        <label>
          Plain-English request
          <textarea
            name="originalText"
            rows={6}
            placeholder="Customer: Acme Foods; pickup: 2026-08-10; delivery: 2026-08-12; commodity: canned goods; weight: 38,000 lbs..."
          />
        </label>
        <ShipmentForm />
        <button type="submit">Extract and review</button>
      </form>
    </>
  );
}
