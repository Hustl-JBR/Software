import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { createCarrier, createCustomer } from "../ready-actions";

export default async function CompaniesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const type =
    (await searchParams).type === "carriers" ? "carriers" : "customers";
  const { membership } = await requireStagingWorkspace(slug);
  const [customers, carriers] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.carrier.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { legalName: "asc" },
    }),
  ]);
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">Directory</p>
          <h1>Companies</h1>
          <p>Customers and reviewed carriers.</p>
        </div>
      </header>
      <nav className="ready-tabs">
        <Link
          className={type === "customers" ? "active" : ""}
          href={`/org/${slug}/companies?type=customers`}
        >
          Customers
        </Link>
        <Link
          className={type === "carriers" ? "active" : ""}
          href={`/org/${slug}/companies?type=carriers`}
        >
          Carriers
        </Link>
      </nav>
      {type === "customers" ? (
        <>
          <details className="panel ready-form-panel">
            <summary>Add customer</summary>
            <form action={createCustomer} className="ready-form">
              <input type="hidden" name="organizationSlug" value={slug} />
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Contact
                <input name="contactName" />
              </label>
              <label>
                Email
                <input type="email" name="contactEmail" />
              </label>
              <label>
                Phone
                <input name="contactPhone" />
              </label>
              <label className="wide">
                Billing address
                <input name="billingAddress" />
              </label>
              <label>
                Payment terms
                <input name="paymentTerms" defaultValue="Net 30" />
              </label>
              <button className="button button-primary">Save customer</button>
            </form>
          </details>
          <div className="panel">
            {customers.map((c) => (
              <div className="ready-row" key={c.id}>
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.contactName || "No contact"} ·{" "}
                    {c.contactEmail || "No email"}
                  </small>
                </span>
                <span>{c.paymentTerms || "Terms not set"}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <details className="panel ready-form-panel">
            <summary>Add carrier</summary>
            <form action={createCarrier} className="ready-form">
              <input type="hidden" name="organizationSlug" value={slug} />
              <label>
                Legal name
                <input name="legalName" required />
              </label>
              <label>
                DBA
                <input name="dbaName" />
              </label>
              <label>
                MC number
                <input name="mcNumber" />
              </label>
              <label>
                USDOT number
                <input name="usdotNumber" />
              </label>
              <label>
                Contact
                <input name="contactName" />
              </label>
              <label>
                Email
                <input type="email" name="contactEmail" />
              </label>
              <label>
                Phone
                <input name="contactPhone" />
              </label>
              <label>
                Insurance expires
                <input type="date" name="insuranceExpiration" />
              </label>
              <label>
                Review status
                <select name="reviewStatus">
                  <option value="UNREVIEWED">Unreviewed</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DO_NOT_USE">Do not use</option>
                </select>
              </label>
              <label className="wide">
                Notes
                <textarea name="notes" />
              </label>
              <button className="button button-primary">Save carrier</button>
            </form>
          </details>
          <div className="panel">
            {carriers.map((c) => (
              <div className="ready-row" key={c.id}>
                <span>
                  <strong>{c.legalName}</strong>
                  <small>
                    MC {c.mcNumber || "—"} · USDOT {c.usdotNumber || "—"}
                  </small>
                </span>
                <span>
                  {c.reviewStatus.replaceAll("_", " ")}
                  <small>
                    {c.insuranceExpiration
                      ? `Insurance ${c.insuranceExpiration.toLocaleDateString()}`
                      : "Insurance date missing"}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
