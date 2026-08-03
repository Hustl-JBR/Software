import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { requireStagingWorkspace } from "@/lib/staging-workspace";

export default async function MoneyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { membership } = await requireStagingWorkspace(slug);
  const loads = await prisma.load.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      customer: true,
      carrier: true,
      customerInvoice: true,
      carrierBill: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const revenue = loads.reduce(
    (n, l) =>
      n +
      Number(
        l.customerInvoice?.freightChargeCents || l.customerPriceCents || 0n,
      ),
    0,
  );
  const cost = loads.reduce(
    (n, l) =>
      n + Number(l.carrierBill?.linehaulCents || l.carrierCostCents || 0n),
    0,
  );
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">Settlement</p>
          <h1>Money</h1>
          <p>Invoices, carrier bills, payments, and final margin.</p>
        </div>
      </header>
      <section className="ready-metrics">
        <div className="panel">
          <small>Customer revenue</small>
          <strong>${(revenue / 100).toFixed(2)}</strong>
        </div>
        <div className="panel">
          <small>Carrier cost</small>
          <strong>${(cost / 100).toFixed(2)}</strong>
        </div>
        <div className="panel">
          <small>Gross margin</small>
          <strong>${((revenue - cost) / 100).toFixed(2)}</strong>
        </div>
      </section>
      <div className="panel">
        {loads.map((load) => (
          <Link
            className="ready-row"
            href={`/org/${slug}/loads/${load.id}?tab=money`}
            key={load.id}
          >
            <span>
              <strong>{load.loadNumber}</strong> · {load.customer.name}
              <small>{load.carrier?.legalName || "Carrier not assigned"}</small>
            </span>
            <span>
              {load.customerInvoice?.status || "Invoice not created"} /{" "}
              {load.carrierBill?.status || "Bill missing"}
              <small>
                Margin $
                {(
                  (Number(load.customerPriceCents || 0n) -
                    Number(load.carrierCostCents || 0n)) /
                  100
                ).toFixed(2)}
              </small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
