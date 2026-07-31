import { ShipmentForm } from "@/app/ui/shipment-form";
import { submitShipment } from "@/app/actions";
export default async function NewRequest({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
