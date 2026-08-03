import { notFound } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { acceptReadyQuote, setQuoteStatus } from "../../ready-actions";

export default async function QuotePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { membership } = await requireStagingWorkspace(slug);
  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
  if (!quote) notFound();
  const margin = Number(
    quote.amountCents - (quote.estimatedCarrierCostCents || 0n),
  );
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">Quote</p>
          <h1>{quote.quoteNumber || "Draft quote"}</h1>
          <p>{quote.status.replaceAll("_", " ")}</p>
        </div>
        <a className="button" href={`/api/org/${slug}/quotes/${quote.id}/pdf`}>
          Download PDF
        </a>
      </header>
      <div className="ready-two">
        <section className="panel ready-facts">
          <h2>Customer quote</h2>
          <dl>
            <dt>Contact</dt>
            <dd>
              {quote.contactName || "—"} · {quote.contactEmail || "—"}
            </dd>
            <dt>Lane</dt>
            <dd>
              {quote.pickupAddress} → {quote.deliveryAddress}
            </dd>
            <dt>Dates</dt>
            <dd>
              {quote.pickupDate?.toLocaleDateString()} →{" "}
              {quote.deliveryDate?.toLocaleDateString()}
            </dd>
            <dt>Freight</dt>
            <dd>
              {quote.commodity} · {quote.weightPounds?.toLocaleString()} lb ·{" "}
              {quote.palletCount || 0} pallets
            </dd>
            <dt>Equipment</dt>
            <dd>{quote.equipmentType}</dd>
            <dt>Customer price</dt>
            <dd>${(Number(quote.amountCents) / 100).toFixed(2)}</dd>
            <dt>Estimated cost</dt>
            <dd>
              $
              {(Number(quote.estimatedCarrierCostCents || 0n) / 100).toFixed(2)}
            </dd>
            <dt>Estimated margin</dt>
            <dd>${(margin / 100).toFixed(2)}</dd>
            <dt>Instructions</dt>
            <dd>{quote.specialInstructions || "None"}</dd>
          </dl>
        </section>
        <section className="panel ready-actions">
          <h2>Next step</h2>
          {quote.status === "DRAFT" && (
            <StatusForm
              slug={slug}
              quoteId={id}
              status="SENT"
              label="Mark sent"
            />
          )}
          {["SENT", "AWAITING_CUSTOMER"].includes(quote.status) && (
            <form action={acceptReadyQuote}>
              <input type="hidden" name="organizationSlug" value={slug} />
              <input type="hidden" name="quoteId" value={id} />
              <label>
                Acceptance evidence
                <input
                  name="evidence"
                  placeholder="Email received Aug 2"
                  required
                />
              </label>
              <button className="button button-primary">
                Accept and create load
              </button>
            </form>
          )}
          {quote.status !== "ACCEPTED" && (
            <StatusForm
              slug={slug}
              quoteId={id}
              status="DECLINED"
              label="Mark declined"
            />
          )}
          {quote.status === "ACCEPTED" && (
            <p>Accepted. The uncovered load has been created.</p>
          )}
        </section>
      </div>
    </div>
  );
}
function StatusForm({
  slug,
  quoteId,
  status,
  label,
}: {
  slug: string;
  quoteId: string;
  status: string;
  label: string;
}) {
  return (
    <form action={setQuoteStatus}>
      <input type="hidden" name="organizationSlug" value={slug} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="status" value={status} />
      <button className="button">{label}</button>
    </form>
  );
}
