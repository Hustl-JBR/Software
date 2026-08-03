import { notFound } from "next/navigation";
import { prisma } from "@atlas/db/client";
import {
  parseStoredReadyAddress,
  readyAddressError,
  readyAddressIssues,
  validateReadyAddress,
} from "@/lib/ready-address";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import {
  acceptReadyQuote,
  setQuoteStatus,
  updateReadyQuoteAddresses,
} from "../../ready-actions";

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ addressError?: string; addressSaved?: string }>;
}) {
  const { slug, id } = await params;
  const query = await searchParams;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    notFound();
  const { membership } = await requireStagingWorkspace(slug);
  const quote = await prisma.quote.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
  if (!quote) notFound();
  const margin = Number(
    quote.amountCents - (quote.estimatedCarrierCostCents || 0n),
  );
  const pickupAddress = parseStoredReadyAddress(quote.pickupAddress || "");
  const deliveryAddress = parseStoredReadyAddress(quote.deliveryAddress || "");
  const addressValidations = [
    validateReadyAddress("pickup", pickupAddress),
    validateReadyAddress("delivery", deliveryAddress),
  ];
  const addressIssues = readyAddressIssues(addressValidations);
  const addressBlockingMessage = readyAddressError(addressValidations);

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
      {query.addressError && (
        <div className="alert error" role="alert">
          {query.addressError}
        </div>
      )}
      {query.addressSaved === "1" && (
        <div className="alert" role="status">
          Pickup and delivery addresses saved.
        </div>
      )}
      {addressIssues.length > 0 && (
        <div className="alert error" role="alert">
          <strong>{addressBlockingMessage}</strong>
          <ul>
            {addressIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
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
          {["SENT", "AWAITING_CUSTOMER"].includes(quote.status) &&
            !addressBlockingMessage && (
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
          {["SENT", "AWAITING_CUSTOMER"].includes(quote.status) &&
            addressBlockingMessage && (
              <p>
                Correct the missing address fields before accepting this quote.
              </p>
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
      {quote.status !== "ACCEPTED" && (
        <details
          className="panel ready-form-panel"
          open={addressIssues.length > 0}
        >
          <summary>Correct pickup and delivery addresses</summary>
          <form action={updateReadyQuoteAddresses} className="ready-form">
            <input type="hidden" name="organizationSlug" value={slug} />
            <input type="hidden" name="quoteId" value={id} />
            <AddressFields kind="pickup" values={pickupAddress} />
            <AddressFields kind="delivery" values={deliveryAddress} />
            <button className="button button-primary" type="submit">
              Save corrected addresses
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

function AddressFields({
  kind,
  values,
}: {
  kind: "pickup" | "delivery";
  values: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}) {
  const title = kind === "pickup" ? "Pickup" : "Delivery";
  return (
    <fieldset className="ready-address-fields">
      <legend>{title} address — all fields required</legend>
      <label className="wide">
        Street address
        <input
          name={`${kind}AddressLine1`}
          defaultValue={values.addressLine1}
          required
        />
      </label>
      <label>
        City
        <input name={`${kind}City`} defaultValue={values.city} required />
      </label>
      <label>
        State (2 letters)
        <input
          name={`${kind}State`}
          defaultValue={values.state}
          maxLength={2}
          pattern="[A-Za-z]{2}"
          required
        />
      </label>
      <label>
        ZIP
        <input
          name={`${kind}PostalCode`}
          defaultValue={values.postalCode}
          inputMode="numeric"
          pattern="[0-9]{5}(-[0-9]{4})?"
          required
        />
      </label>
    </fieldset>
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
