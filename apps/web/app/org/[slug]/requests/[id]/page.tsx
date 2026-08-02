import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { approve, saveCorrection } from "@/app/actions";
import { ShipmentForm } from "@/app/ui/shipment-form";
import { ErrorAlert } from "@/app/ui/error-alert";
import { effectiveRoles } from "@atlas/auth/membership";
import { z } from "zod";
import {
  DEMO_ORGANIZATION,
  DEMO_USER,
  getDemoRequest,
  isDemoMode,
} from "@/lib/demo-store";

type ReviewIssue = {
  id: string;
  type: string;
  field: string;
  message: string;
  sourceReference?: string | null;
};
type ReviewRevision = {
  id: string;
  revisionNumber: number;
  originalText: string;
  structuredData: Record<string, unknown>;
  issues: ReviewIssue[];
  createdAt: Date;
};
type ReviewView = {
  role: string;
  canApprove: boolean;
  request: { id: string; loadId?: string; revisions: ReviewRevision[] };
};

export default async function Review({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { slug, id } = await params;
  const demo = isDemoMode();
  const view = demo ? demoReviewView(slug, id) : await realReviewView(slug, id);
  if (!view) notFound();
  const { request, role } = view;
  if (request.loadId) redirect(`/org/${slug}/loads/${request.loadId}`);
  const revision = request.revisions[0];
  const values = revision.structuredData;
  const query = await searchParams;
  const valid = revision.issues.length === 0;
  const confidence = demo
    ? valid
      ? 100
      : Math.max(72, 96 - revision.issues.length * 4)
    : undefined;
  return (
    <>
      <div className="breadcrumb">
        <a href={`/org/${slug}`}>Command center</a>
        <span>/</span>
        <a href={`/org/${slug}`}>Requests</a>
        <span>/</span>
        <strong>{request.id.slice(0, 8)}</strong>
      </div>
      <div className="page-heading compact-heading review-heading">
        <div>
          <div className="title-line">
            <p className="overline">
              Shipment request · Revision {revision.revisionNumber}
            </p>
            <span className={`status-pill ${valid ? "green" : "amber"}`}>
              {valid ? "Ready for approval" : "Action required"}
            </span>
          </div>
          <h1>{demo ? "Review Atlas analysis" : "Review shipment details"}</h1>
          <p className="page-subtitle">
            {demo
              ? "Atlas structured the request and highlighted what still needs human judgment."
              : "Deterministic extraction organized the submitted facts and highlighted fields that require human review."}
          </p>
        </div>
        <div className="revision-meta">
          <span>Immutable revision</span>
          <strong>#{revision.revisionNumber}</strong>
        </div>
      </div>
      <ErrorAlert code={query.error} />
      {query.saved && (
        <div className="toast success-toast">
          <span>✓</span>
          <div>
            <b>Revision {revision.revisionNumber} saved</b>
            <small>
              All corrections are preserved in the immutable history.
            </small>
          </div>
        </div>
      )}

      <nav className="content-tabs" aria-label="Shipment sections">
        <a className="active" href="#overview">
          Overview
        </a>
        <a href="#shipment-details">Shipment details</a>
        <a href="#approval">Approval</a>
        <a href="#timeline">Timeline</a>
        <span>
          Documents <b>0</b>
        </span>
        <span>
          Communications <b>0</b>
        </span>
      </nav>

      <section className="review-grid" id="overview">
        <div className="review-main">
          <article className="panel ai-analysis">
            <div className="analysis-header">
              <div className="analysis-title">
                <span className="ai-orb large">✦</span>
                <div>
                  <p className="overline violet">
                    {demo ? "Atlas intelligence" : "Deterministic extraction"}
                  </p>
                  <h2>
                    {demo
                      ? "AI shipment analysis"
                      : "Extracted shipment details"}
                  </h2>
                </div>
              </div>
              {confidence !== undefined && (
                <div className="confidence">
                  <span>Synthetic confidence</span>
                  <strong>{confidence}%</strong>
                  <i>
                    <b style={{ width: `${confidence}%` }} />
                  </i>
                </div>
              )}
            </div>
            <div className="shipment-summary">
              <span className="summary-icon">↗</span>
              <div>
                <p>Shipment summary</p>
                <h3>{summary(values)}</h3>
              </div>
            </div>
            <div className="analysis-facts">
              <AnalysisFact
                label="Detected equipment"
                value={equipmentLabel(values.equipmentType)}
                icon="▣"
              />
              <AnalysisFact
                label="Estimated transit"
                value={demo ? "1 day · 248 mi (synthetic)" : "Not calculated"}
                icon="◷"
              />
              <AnalysisFact
                label="Freight profile"
                value={`${number(values.palletCount)} pallets · ${number(values.weightPounds)} lb`}
                icon="◫"
              />
            </div>
            <div className="analysis-columns">
              <div>
                <p className="analysis-label">Potential risks</p>
                <div className="signal-list">
                  {demo && (
                    <span className="signal amber">
                      <i>!</i>
                      <b>Synthetic capacity example: 62%</b>
                    </span>
                  )}
                  <span className="signal neutral">
                    <i>◷</i>
                    <b>Appointment windows not specified</b>
                  </span>
                </div>
              </div>
              <div>
                <p className="analysis-label">Atlas recommendation</p>
                <div className="recommendation">
                  <span>✦</span>
                  <p>
                    <b>
                      {valid
                        ? "Approve this shipment"
                        : "Complete the missing location details"}
                    </b>
                    <small>
                      {valid
                        ? "Required data is complete and passes deterministic validation."
                        : "Atlas needs exact facility and postal data before approval."}
                    </small>
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="panel source-panel">
            <div className="panel-heading">
              <div>
                <p className="overline">Source</p>
                <h2>Original request</h2>
              </div>
              <span className="source-chip">Plain text</span>
            </div>
            <blockquote>
              {revision.originalText ||
                "No plain-English request was supplied."}
            </blockquote>
          </article>

          <form
            action={saveCorrection}
            className="panel correction-form"
            id="shipment-details"
          >
            <input type="hidden" name="organizationSlug" value={slug} />
            <input type="hidden" name="requestId" value={id} />
            <div className="panel-heading">
              <div>
                <p className="overline">Human review</p>
                <h2>Shipment details</h2>
                <p>
                  Correct or complete any field. Saving creates a new immutable
                  revision.
                </p>
              </div>
              <span className="reviewed-by">◉ Reviewed by you</span>
            </div>
            <ShipmentForm values={values} />
            <div className="form-actions">
              <span>Changes are tracked in the revision history.</span>
              <button className="button button-secondary" type="submit">
                Save as new revision
              </button>
            </div>
          </form>
        </div>

        <aside className="review-aside">
          <section className={`panel issue-summary ${valid ? "complete" : ""}`}>
            <div className="issue-summary-head">
              <span>{valid ? "✓" : revision.issues.length}</span>
              <div>
                <h2>{valid ? "Analysis complete" : "Information needed"}</h2>
                <p>
                  {valid
                    ? "Ready for final approval"
                    : `${revision.issues.length} required fields need attention`}
                </p>
              </div>
            </div>
            {valid ? (
              <div className="all-clear">
                <span>✓</span>
                <p>
                  <b>Deterministic validation passed</b>
                  <small>Every required field has been reviewed.</small>
                </p>
              </div>
            ) : (
              <div className="modern-issues">
                {revision.issues.map((issue) => (
                  <article key={issue.id}>
                    <span>!</span>
                    <div>
                      <b>{fieldLabel(issue.field)}</b>
                      <p>{issue.message}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <a className="jump-link" href="#shipment-details">
              {valid ? "Review shipment details" : "Complete missing fields"} ↓
            </a>
          </section>

          <section className="panel approval-panel" id="approval">
            <div className="approval-icon">✓</div>
            <p className="overline">Final action</p>
            <h2>Approve revision {revision.revisionNumber}</h2>
            <p>
              Creates one draft load and two stops. This action is idempotent
              and fully audited.
            </p>
            {view.canApprove ? (
              <form action={approve}>
                <input type="hidden" name="organizationSlug" value={slug} />
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="revisionId" value={revision.id} />
                <input
                  type="hidden"
                  name="idempotencyKey"
                  value={randomUUID()}
                />
                <label className="approval-check">
                  <input required type="checkbox" />
                  <span>
                    <b>I reviewed this exact revision</b>
                    <small>
                      Revision {revision.revisionNumber}
                      {confidence !== undefined
                        ? ` · ${confidence}% synthetic confidence`
                        : " · deterministic validation"}
                    </small>
                  </span>
                </label>
                <button
                  className="button button-primary full-button"
                  type="submit"
                  disabled={!valid}
                >
                  Approve & create draft load <span>→</span>
                </button>
                {!valid && (
                  <small className="disabled-reason">
                    Complete required fields before approval
                  </small>
                )}
              </form>
            ) : (
              <div className="alert warning">
                Your {role.toLowerCase()} role cannot approve this request.
              </div>
            )}
          </section>

          <section className="panel mini-timeline" id="timeline">
            <div className="panel-heading">
              <div>
                <p className="overline">History</p>
                <h2>Revision timeline</h2>
              </div>
            </div>
            {request.revisions.map((item, index) => (
              <div className="mini-event" key={item.id}>
                <i className={index === 0 ? "current" : ""} />
                <p>
                  <b>Revision {item.revisionNumber}</b>
                  <small>
                    {item.createdAt.toLocaleString()} · {item.issues.length}{" "}
                    issue{item.issues.length === 1 ? "" : "s"}
                  </small>
                </p>
                {index === 0 && <span>Current</span>}
              </div>
            ))}
          </section>
        </aside>
      </section>
    </>
  );
}

function AnalysisFact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div>
      <span>{icon}</span>
      <p>
        <small>{label}</small>
        <b>{value}</b>
      </p>
    </div>
  );
}
function number(value: unknown) {
  return Number(value ?? 0).toLocaleString();
}
function summary(values: Record<string, unknown>) {
  return `Move ${number(values.palletCount)} pallets of ${String(values.commodity ?? "freight").toLowerCase()} from ${String(values.originCity ?? "origin")} to ${String(values.destinationCity ?? "destination")}.`;
}
function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    customerName: "Customer or shipper",
    originFacilityName: "Pickup facility name",
    originCity: "Pickup city",
    originState: "Pickup state",
    originPostalCode: "Pickup ZIP code",
    destinationFacilityName: "Delivery facility name",
    destinationCity: "Delivery city",
    destinationState: "Delivery state",
    destinationPostalCode: "Delivery ZIP code",
    weightPounds: "Shipment weight",
    equipmentType: "Equipment",
    originalText: "Original request",
  };
  if (labels[field]) return labels[field];
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function demoReviewView(slug: string, id: string): ReviewView | undefined {
  if (slug !== DEMO_ORGANIZATION.slug) return undefined;
  const request = getDemoRequest(id);
  if (!request) return undefined;
  return {
    role: DEMO_USER.role,
    canApprove: true,
    request: {
      id: request.id,
      loadId: request.loadId,
      revisions: request.revisions,
    },
  };
}
async function realReviewView(
  slug: string,
  id: string,
): Promise<ReviewView | undefined> {
  if (!z.string().uuid().safeParse(id).success) return undefined;
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
    include: { roles: true },
  });
  if (!membership) return undefined;
  const request = await prisma.shipmentRequest.findUnique({
    where: {
      organizationId_id: { organizationId: membership.organizationId, id },
    },
    include: {
      revisions: {
        orderBy: { revisionNumber: "desc" },
        include: { issues: true },
      },
      load: true,
    },
  });
  if (!request) return undefined;
  const roles = effectiveRoles(
    membership.role,
    membership.roles.map((item) => item.role),
  );
  return {
    role: roles.join(" + "),
    canApprove: roles.includes("APPROVER"),
    request: {
      id: request.id,
      loadId: request.load?.id,
      revisions: request.revisions.map((revision) => ({
        ...revision,
        structuredData: revision.structuredData as Record<string, unknown>,
      })),
    },
  };
}

function equipmentLabel(value: unknown) {
  if (typeof value !== "string" || !value) return "Not provided";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
