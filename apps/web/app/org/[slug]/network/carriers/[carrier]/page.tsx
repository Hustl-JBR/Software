import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@atlas/db/client";
import {
  EnvironmentChip,
  InactiveState,
  StatusBadge,
} from "@/app/ui/atlas-primitives";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { money, relativeTime } from "@/lib/atlas-view-models";
export default async function CarrierProfile({
  params,
}: {
  params: Promise<{ slug: string; carrier: string }>;
}) {
  const { slug, carrier } = await params;
  if (!isDemoMode()) {
    const { membership } = await requireStagingWorkspace(slug);
    const candidate = await prisma.carrierCandidate.findFirst({
      where: { id: carrier, organizationId: membership.organizationId },
      include: { load: true, driverAssignment: true },
    });
    if (!candidate) notFound();
    return <StagingCarrierProfile slug={slug} candidate={candidate} />;
  }
  const name = carrier
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
  const review = name.includes("Oak")
    ? "Manual review required"
    : name.includes("Granite")
      ? "Temporarily blocked"
      : name.includes("Legacy")
        ? "Do not use"
        : "Approved";
  return (
    <>
      <div className="breadcrumb">
        <Link href="/org/atlas-north/network">Network</Link>
        <span>/</span>
        <strong>{name}</strong>
      </div>
      <div className="page-heading">
        <div>
          <p className="overline">Synthetic carrier profile</p>
          <h1>{name}</h1>
          <p className="page-subtitle">
            Legal identity, operational capability, compliance evidence, and
            internal performance.
          </p>
        </div>
        <span
          className={`status-pill ${review === "Approved" ? "green" : "amber"}`}
        >
          {review}
        </span>
      </div>
      <div className="carrier-profile-layout">
        <section className="panel profile-section">
          <div className="panel-heading">
            <div>
              <p className="overline">Identity</p>
              <h2>Company information</h2>
            </div>
            <span className="synthetic-chip">Not official FMCSA data</span>
          </div>
          <ProfileGrid
            values={[
              ["Legal company", "Summit Freight Logistics LLC"],
              ["DBA", name],
              ["MC / USDOT", "MC-1048XX / DOT-38XX21"],
              ["Carrier type", "For-hire property carrier"],
              ["Authority", "Active · synthetic verification"],
              ["Effective date", "Mar 14, 2018"],
              ["Physical address", "7240 Logistics Park Dr, Nashville, TN"],
              ["Website", "summit-freight.example"],
              ["Primary phone", "615-555-0100"],
              ["Dispatch phone", "615-555-0133"],
              ["After-hours", "615-555-0100"],
              ["Dispatch email", "dispatch@summit.example"],
            ]}
          />
        </section>
        <section className="panel profile-section">
          <div className="panel-heading">
            <div>
              <p className="overline">Compliance review</p>
              <h2>Separate evidence checks</h2>
            </div>
            <span className="status-pill green">Reviewed</span>
          </div>
          <div className="compliance-checks">
            {[
              [
                "Identity",
                "Pass",
                "Legal name and synthetic identifiers match.",
              ],
              [
                "Operating authority",
                "Pass",
                "Active in synthetic source as of today.",
              ],
              [
                "Insurance",
                "Pass",
                "$1M auto liability · $100k cargo · expires Dec 18.",
              ],
              [
                "Safety information",
                "Conditional",
                "No official safety determination; future adapter required.",
              ],
              [
                "Contact consistency",
                "Pass",
                "Dispatch and company contacts align.",
              ],
              [
                "Banking / factoring",
                "Review",
                "Bank changes always require manual review.",
              ],
              [
                "Carrier agreement",
                "Pass",
                "Signed synthetic agreement on file.",
              ],
              ["Equipment suitability", "Pass", "53′ dry van available."],
              ["Tracking capability", "Pass", "99% internal demo compliance."],
            ].map(([label, status, evidence]) => (
              <div key={label}>
                <span
                  className={`status-pill ${status === "Pass" ? "green" : "amber"}`}
                >
                  {status}
                </span>
                <p>
                  <b>{label}</b>
                  <small>{evidence}</small>
                </p>
              </div>
            ))}
          </div>
          <div className="review-decision">
            <span>✓</span>
            <p>
              <b>{review}</b>
              <small>
                Reviewed by Maya Chen · Recheck in 30 days · Human approval
                required for overrides.
              </small>
            </p>
          </div>
        </section>
        <section className="panel profile-section">
          <div className="panel-heading">
            <div>
              <p className="overline">Operations</p>
              <h2>Capabilities</h2>
            </div>
          </div>
          <ProfileGrid
            values={[
              ["Equipment", "Dry van, reefer"],
              ["Preferred lanes", "Southeast regional"],
              ["Service regions", "TN, GA, AL, NC, SC"],
              ["Team drivers", "Available by request"],
              ["Hazmat", "Not approved"],
              ["Temperature control", "Available"],
              ["Maximum cargo value", "$100,000"],
              ["Tracking methods", "App link, ELD concept, driver check-in"],
              ["Factoring", "Northstar Capital (synthetic)"],
              ["Payment terms", "Net 21"],
              ["Quick pay", "Preferred · 2%"],
              ["After-hours support", "24/7 dispatch"],
            ]}
          />
        </section>
        <section className="panel profile-section">
          <div className="panel-heading">
            <div>
              <p className="overline">Performance</p>
              <h2>Internal operating history</h2>
            </div>
          </div>
          <ProfileGrid
            values={[
              ["On-time pickup", "97%"],
              ["On-time delivery", "96%"],
              ["Tracking compliance", "99%"],
              ["Cancellation rate", "1.2%"],
              ["Claims rate", "0.3%"],
              ["Tender acceptance", "82%"],
              ["Average response", "11 minutes"],
              ["Average negotiated rate", "$2.14 / mile"],
              ["Lane experience", "18 Nashville–Atlanta loads"],
              ["Relationship score", "94 / 100"],
              ["Do not use", "No"],
              ["Last verified", "Today · synthetic review"],
            ]}
          />
        </section>
      </div>
    </>
  );
}

function StagingCarrierProfile({
  slug,
  candidate,
}: {
  slug: string;
  candidate: {
    carrierName: string;
    status: string;
    authorityConfirmed: boolean;
    insuranceConfirmed: boolean;
    cargoCoverageCents: bigint | null;
    quotedCostCents: bigint | null;
    blockReason: string | null;
    selectedAt: Date | null;
    updatedAt: Date;
    load: { id: string; loadNumber: string };
    driverAssignment: {
      driverName: string;
      dispatcherName: string;
      tractorNumber: string | null;
      trailerNumber: string | null;
    } | null;
  };
}) {
  const verified =
    candidate.authorityConfirmed &&
    candidate.insuranceConfirmed &&
    !candidate.blockReason;
  return (
    <>
      <div className="breadcrumb">
        <Link href={`/org/${slug}/network`}>Network</Link>
        <span>/</span>
        <strong>{candidate.carrierName}</strong>
      </div>
      <div className="page-heading">
        <div>
          <p className="overline">Persisted carrier candidate</p>
          <h1>{candidate.carrierName}</h1>
          <p className="page-subtitle">
            Evidence recorded during this organization’s load sourcing workflow.{" "}
            <EnvironmentChip mode="staging" />
          </p>
        </div>
        <StatusBadge
          label={candidate.status}
          tone={verified ? "green" : "amber"}
        />
      </div>
      <div className="carrier-profile-layout">
        <section className="panel profile-section">
          <div className="panel-heading">
            <div>
              <p className="overline">Compliance evidence</p>
              <h2>Recorded checks</h2>
            </div>
            <span>Not official FMCSA data</span>
          </div>
          <ProfileGrid
            values={[
              [
                "Authority",
                candidate.authorityConfirmed ? "Confirmed" : "Unconfirmed",
              ],
              [
                "Insurance",
                candidate.insuranceConfirmed ? "Confirmed" : "Unconfirmed",
              ],
              [
                "Cargo coverage",
                money(
                  candidate.cargoCoverageCents === null
                    ? undefined
                    : Number(candidate.cargoCoverageCents),
                ),
              ],
              ["Review result", candidate.blockReason ?? candidate.status],
              ["Last reviewed", relativeTime(candidate.updatedAt)],
            ]}
          />
        </section>
        <section className="panel profile-section">
          <div className="panel-heading">
            <div>
              <p className="overline">Current relationship</p>
              <h2>Load assignment</h2>
            </div>
          </div>
          <ProfileGrid
            values={[
              ["Load", candidate.load.loadNumber],
              [
                "Selected",
                candidate.selectedAt
                  ? relativeTime(candidate.selectedAt)
                  : "Not selected",
              ],
              [
                "Quoted cost",
                money(
                  candidate.quotedCostCents === null
                    ? undefined
                    : Number(candidate.quotedCostCents),
                ),
              ],
              [
                "Driver",
                candidate.driverAssignment?.driverName ?? "Not assigned",
              ],
              [
                "Dispatcher",
                candidate.driverAssignment?.dispatcherName ?? "Not assigned",
              ],
              [
                "Equipment",
                candidate.driverAssignment
                  ? `${candidate.driverAssignment.tractorNumber ?? "Tractor not recorded"} / ${candidate.driverAssignment.trailerNumber ?? "Trailer not recorded"}`
                  : "Not recorded",
              ],
            ]}
          />
          <Link
            className="button button-secondary"
            href={`/org/${slug}/loads/${candidate.load.id}`}
          >
            Open load operations
          </Link>
        </section>
        <section className="panel profile-section">
          <InactiveState
            title="External carrier intelligence is not active"
            body="Atlas has not connected official authority, insurance, safety, banking, or performance data providers. Unrecorded evidence stays unavailable."
          />
        </section>
      </div>
    </>
  );
}
function ProfileGrid({ values }: { values: string[][] }) {
  return (
    <div className="profile-grid">
      {values.map(([label, value]) => (
        <span key={label}>
          <small>{label}</small>
          <b>{value}</b>
        </span>
      ))}
    </div>
  );
}
