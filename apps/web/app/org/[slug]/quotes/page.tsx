import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { createReadyQuote } from "../ready-actions";

export default async function QuotesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode())
    return (
      <div className="ready-page">
        <h1>Quotes</h1>
        <p>Sign in to staging to create persistent quotes.</p>
      </div>
    );
  const { membership } = await requireStagingWorkspace(slug);
  const [quotes, customers] = await Promise.all([
    prisma.quote.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">Sales</p>
          <h1>Quotes</h1>
          <p>Price, send, record acceptance, then create the load.</p>
        </div>
      </header>
      <details className="panel ready-form-panel" open={quotes.length === 0}>
        <summary>New quote request</summary>
        <form action={createReadyQuote} className="ready-form">
          <input type="hidden" name="organizationSlug" value={slug} />
          <label>
            Customer
            <select name="customerId" required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contact name
            <input name="contactName" />
          </label>
          <label>
            Contact email
            <input type="email" name="contactEmail" />
          </label>
          <label className="wide">
            Pickup address
            <input
              name="pickupAddress"
              placeholder="Street, City, ST ZIP"
              required
            />
          </label>
          <label className="wide">
            Delivery address
            <input
              name="deliveryAddress"
              placeholder="Street, City, ST ZIP"
              required
            />
          </label>
          <label>
            Pickup date
            <input type="date" name="pickupDate" required />
          </label>
          <label>
            Delivery date
            <input type="date" name="deliveryDate" required />
          </label>
          <label>
            Equipment
            <select name="equipmentType" required>
              <option value="">Select equipment</option>
              <option value="DRY_VAN">Dry van</option>
              <option value="REEFER">Reefer</option>
              <option value="FLATBED">Flatbed</option>
              <option value="STEP_DECK">Step deck</option>
              <option value="CONESTOGA">Conestoga</option>
              <option value="LOWBOY">Lowboy</option>
              <option value="RGN">RGN</option>
              <option value="POWER_ONLY">Power only</option>
              <option value="BOX_TRUCK">Box truck</option>
              <option value="SPRINTER">Sprinter van</option>
              <option value="HOTSHOT">Hotshot</option>
              <option value="TANKER">Tanker</option>
            </select>
          </label>
          <label>
            Commodity
            <input name="commodity" required />
          </label>
          <label>
            Weight (lb)
            <input type="number" name="weightPounds" min="1" required />
          </label>
          <label>
            Pallets
            <input type="number" name="palletCount" min="0" />
          </label>
          <label>
            Customer price
            <input name="customerPrice" inputMode="decimal" required />
          </label>
          <label>
            Estimated carrier cost
            <input name="estimatedCarrierCost" inputMode="decimal" required />
          </label>
          <label className="wide">
            Special instructions
            <textarea name="specialInstructions" />
          </label>
          <button className="button button-primary" type="submit">
            Create draft quote
          </button>
        </form>
      </details>
      <div className="panel">
        {quotes.length ? (
          quotes.map((quote) => (
            <Link
              className="ready-row"
              href={`/org/${slug}/quotes/${quote.id}`}
              key={quote.id}
            >
              <span>
                <strong>{quote.quoteNumber || "Quote"}</strong>
                <small>
                  {quote.pickupAddress} → {quote.deliveryAddress}
                </small>
              </span>
              <span>
                {quote.status.replaceAll("_", " ")}
                <small>${(Number(quote.amountCents) / 100).toFixed(2)}</small>
              </span>
            </Link>
          ))
        ) : (
          <p className="ready-empty">
            Create a customer first under Companies, then start the first quote.
          </p>
        )}
      </div>
    </div>
  );
}
