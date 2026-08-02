import Link from "next/link";
import {
  EmptyState,
  EnvironmentChip,
  InactiveState,
  StatusBadge,
  WorkspaceHeading,
} from "./atlas-primitives";
import {
  archiveFacility,
  createFacility,
  updateFacility,
} from "@/app/org/[slug]/staging/actions";
import type {
  NetworkCarrierView,
  TrackingLoadView,
} from "@/lib/atlas-view-models";
import { humanizeCode } from "@/lib/activity-language";
import { FacilityLocationSearch } from "./facility-location-search";

export function StagingTrackingWorkspace({
  slug,
  loads,
}: {
  slug: string;
  loads: TrackingLoadView[];
}) {
  return (
    <>
      <WorkspaceHeading
        eyebrow="Operations visibility"
        title="Global tracking"
        subtitle="Manual milestones and the most recent tenant-scoped update for every active load."
        badge={<EnvironmentChip mode="staging" />}
      />
      <div
        className="filter-strip global-filters"
        aria-label="Tracking filters"
      >
        <span className="active">All active · {loads.length}</span>
        <span>Manual tracking</span>
        <span>GPS provider not connected</span>
      </div>
      {loads.length === 0 ? (
        <section className="panel">
          <EmptyState
            title="No active loads to track"
            body="Approved loads with tracking updates will appear here. Create an intake or use the operations drill data to begin."
            action={{
              href: `/org/${slug}/requests/new`,
              label: "Create intake",
            }}
          />
        </section>
      ) : (
        <div className="global-tracking-grid staging-tracking-grid">
          <section className="panel fleet-map staging-route-board">
            <div className="map-grid" />
            <span className="synthetic-watermark">
              SCHEMATIC · NO LIVE MAP PROVIDER
            </span>
            {loads.map((load, index) => (
              <Link
                key={load.id}
                className="fleet-truck"
                style={{
                  left: `${18 + ((index * 19) % 65)}%`,
                  top: `${25 + ((index * 23) % 50)}%`,
                }}
                href={load.href}
              >
                ◈<small>{load.number}</small>
              </Link>
            ))}
          </section>
          <section className="panel tracking-list staging-tracking-list">
            {loads.map((load) => (
              <Link href={load.href} key={load.id}>
                <span>
                  <b>{load.number}</b>
                  <small>{load.route}</small>
                </span>
                <span>
                  <b>{load.location}</b>
                  <small>{load.updatedAt}</small>
                </span>
                <StatusBadge label={load.status} tone="blue" />
              </Link>
            ))}
          </section>
          <aside className="panel tracking-detail">
            <p className="overline">Staging truth boundary</p>
            <h2>Manual tracking only</h2>
            <p>
              Locations and milestones shown here are persisted Atlas updates.
              They are not inferred from GPS.
            </p>
            <InactiveState
              title="Live map telemetry"
              body="No GPS, ELD, or commercial map provider is active in this environment."
            />
          </aside>
        </div>
      )}
    </>
  );
}

export function StagingNetworkWorkspace({
  slug,
  carriers,
  drivers,
  customers,
  facilities,
  locationSearchAvailable,
}: {
  slug: string;
  carriers: NetworkCarrierView[];
  drivers: Array<{
    name: string;
    carrier: string;
    load: string;
    dispatcher: string;
  }>;
  customers: Array<{ name: string; loads: number }>;
  facilities: Array<{
    id: string;
    name: string;
    location: string;
    visits: number;
    status: string;
    timeZone: string;
    validationStatus: string;
    manuallyEntered: boolean;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    appointmentRequired: boolean;
  }>;
  locationSearchAvailable: boolean;
}) {
  return (
    <>
      <WorkspaceHeading
        eyebrow="Relationship directory"
        title="Network"
        subtitle="Operational relationships derived from this organization’s persisted loads."
        badge={<EnvironmentChip mode="staging" />}
      />
      <nav
        className="operations-tabs section-tabs"
        aria-label="Network sections"
      >
        <a href="#carriers" className="active">
          Carriers · {carriers.length}
        </a>
        <a href="#drivers">Drivers · {drivers.length}</a>
        <a href="#customers">Customers · {customers.length}</a>
        <a href="#facilities">Facilities · {facilities.length}</a>
      </nav>
      <section
        className="panel network-workspace staging-directory"
        id="carriers"
      >
        <div className="panel-heading">
          <div>
            <p className="overline">Carrier review</p>
            <h2>Carriers</h2>
          </div>
          <span>Persisted candidate records</span>
        </div>
        {carriers.length === 0 ? (
          <EmptyState
            title="No carrier candidates yet"
            body="Carrier profiles appear after a candidate is entered on a load."
          />
        ) : (
          <div className="directory-grid">
            {carriers.map((carrier) => (
              <Link
                className="directory-card"
                href={carrier.href}
                key={carrier.id}
              >
                <div>
                  <h3>{carrier.name}</h3>
                  <StatusBadge
                    label={carrier.reviewResult}
                    tone={carrier.doNotUse ? "red" : "green"}
                  />
                </div>
                <dl>
                  <div>
                    <dt>Authority</dt>
                    <dd>{carrier.authority}</dd>
                  </div>
                  <div>
                    <dt>Insurance</dt>
                    <dd>{carrier.insurance}</dd>
                  </div>
                  <div>
                    <dt>Last verified</dt>
                    <dd>{carrier.lastVerified}</dd>
                  </div>
                </dl>
                <p>{carrier.warning}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <DirectorySection
        id="drivers"
        title="Drivers"
        columns={["Driver", "Carrier", "Load", "Dispatcher"]}
        rows={drivers.map((row) => [
          row.name,
          row.carrier,
          row.load,
          row.dispatcher,
        ])}
      />
      <DirectorySection
        id="customers"
        title="Customers"
        columns={["Customer", "Approved loads"]}
        rows={customers.map((row) => [row.name, String(row.loads)])}
      />
      <section
        className="panel network-workspace staging-directory"
        id="facilities"
      >
        <div className="panel-heading">
          <div>
            <p className="overline">Reusable location records</p>
            <h2>Facilities</h2>
          </div>
          <span>Organization-scoped · immutable stop snapshots</span>
        </div>
        <details className="optional-fields">
          <summary>
            <span>＋</span> Add facility{" "}
            <small>Manual fallback is always available</small>
          </summary>
          <form
            action={createFacility}
            className="record-action-form optional-fields-body"
          >
            <input type="hidden" name="organizationSlug" value={slug} />
            <input
              type="hidden"
              name="returnPath"
              value={`/org/${slug}/network`}
            />
            <input type="hidden" name="countryCode" value="US" />
            <FacilityLocationSearch
              slug={slug}
              enabled={locationSearchAvailable}
            />
            <div className="fields-grid four-col">
              <label className="span-2">
                Facility name
                <input name="name" required />
              </label>
              <label className="span-2">
                Street address
                <input name="addressLine1" required />
              </label>
              <label className="span-2">
                Address line 2
                <input name="addressLine2" />
              </label>
              <label>
                City
                <input name="city" required />
              </label>
              <label>
                State
                <input name="state" maxLength={2} required />
              </label>
              <label>
                ZIP code
                <input name="postalCode" required />
              </label>
              <label>
                IANA time zone
                <input name="timeZone" placeholder="America/Chicago" required />
              </label>
              <label>
                Latitude
                <input
                  name="latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                />
              </label>
              <label>
                Longitude
                <input
                  name="longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                />
              </label>
              <label>
                Phone
                <input name="phone" />
              </label>
              <label>
                Shipping hours
                <input name="shippingHours" />
              </label>
              <label>
                Receiving hours
                <input name="receivingHours" />
              </label>
              <label>
                <input type="checkbox" name="appointmentRequired" /> Appointment
                required
              </label>
              <label className="span-2">
                Appointment instructions
                <input name="appointmentInstructions" />
              </label>
              <label className="span-2">
                Internal notes
                <input name="internalNotes" />
              </label>
            </div>
            <p className="muted-copy">
              Manual entries are marked “Manually confirmed.” Provider
              validation is only used when configured credentials are available.
            </p>
            <button className="button button-primary">Save facility</button>
          </form>
        </details>
        {facilities.length === 0 ? (
          <EmptyState
            title="No reusable facilities yet"
            body="Create a facility here, or continue entering a one-off address on shipment intake."
          />
        ) : (
          <div className="directory-grid">
            {facilities.map((facility) => (
              <article className="directory-card" key={facility.id}>
                <div>
                  <h3>{facility.name}</h3>
                  <StatusBadge
                    label={facility.status}
                    tone={facility.status === "ACTIVE" ? "green" : "slate"}
                  />
                </div>
                <p>{facility.location}</p>
                <dl>
                  <div>
                    <dt>Time zone</dt>
                    <dd>{facility.timeZone}</dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{humanizeCode(facility.validationStatus)}</dd>
                  </div>
                  <div>
                    <dt>Recorded stops</dt>
                    <dd>{facility.visits}</dd>
                  </div>
                </dl>
                {facility.status === "ACTIVE" && (
                  <>
                    <details className="optional-fields">
                      <summary>Edit facility</summary>
                      <form
                        action={updateFacility}
                        className="record-action-form optional-fields-body"
                      >
                        <input
                          type="hidden"
                          name="organizationSlug"
                          value={slug}
                        />
                        <input
                          type="hidden"
                          name="returnPath"
                          value={`/org/${slug}/network`}
                        />
                        <input
                          type="hidden"
                          name="facilityId"
                          value={facility.id}
                        />
                        <input type="hidden" name="countryCode" value="US" />
                        <div className="fields-grid two-col">
                          <label>
                            Name
                            <input
                              name="name"
                              defaultValue={facility.name}
                              required
                            />
                          </label>
                          <label>
                            Street address
                            <input
                              name="addressLine1"
                              defaultValue={facility.addressLine1}
                              required
                            />
                          </label>
                          <label>
                            Address line 2
                            <input
                              name="addressLine2"
                              defaultValue={facility.addressLine2 ?? ""}
                            />
                          </label>
                          <label>
                            City
                            <input
                              name="city"
                              defaultValue={facility.city}
                              required
                            />
                          </label>
                          <label>
                            State
                            <input
                              name="state"
                              defaultValue={facility.state}
                              maxLength={2}
                              required
                            />
                          </label>
                          <label>
                            ZIP code
                            <input
                              name="postalCode"
                              defaultValue={facility.postalCode}
                              required
                            />
                          </label>
                          <label>
                            IANA time zone
                            <input
                              name="timeZone"
                              defaultValue={facility.timeZone}
                              required
                            />
                          </label>
                          <label>
                            Phone
                            <input
                              name="phone"
                              defaultValue={facility.phone ?? ""}
                            />
                          </label>
                          <label>
                            Latitude
                            <input
                              name="latitude"
                              type="number"
                              step="any"
                              defaultValue={facility.latitude ?? ""}
                            />
                          </label>
                          <label>
                            Longitude
                            <input
                              name="longitude"
                              type="number"
                              step="any"
                              defaultValue={facility.longitude ?? ""}
                            />
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              name="appointmentRequired"
                              defaultChecked={facility.appointmentRequired}
                            />{" "}
                            Appointment required
                          </label>
                        </div>
                        <small>
                          Manual edits change the reusable record only; existing
                          stop snapshots stay unchanged.
                        </small>
                        <button className="button button-secondary">
                          Save changes
                        </button>
                      </form>
                    </details>
                    <form action={archiveFacility}>
                      <input
                        type="hidden"
                        name="organizationSlug"
                        value={slug}
                      />
                      <input
                        type="hidden"
                        name="returnPath"
                        value={`/org/${slug}/network`}
                      />
                      <input
                        type="hidden"
                        name="facilityId"
                        value={facility.id}
                      />
                      <button className="button button-ghost">Archive</button>
                    </form>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DirectorySection({
  id,
  title,
  columns,
  rows,
}: {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <section className="panel staging-directory-section" id={id}>
      <div className="panel-heading">
        <h2>{title}</h2>
        <span>Read-only staging directory</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          body={`Persisted ${title.toLowerCase()} will appear here as operations data is recorded.`}
        />
      ) : (
        <div className="simple-directory">
          <div className="directory-row header">
            {columns.map((column) => (
              <b key={column}>{column}</b>
            ))}
          </div>
          {rows.map((row, index) => (
            <div className="directory-row" key={`${id}-${index}`}>
              {row.map((value, cell) => (
                <span key={`${index}-${cell}`}>{value}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StagingDocumentsWorkspace() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="Document control"
        title="Documents"
        subtitle="A truthful landing area for load paperwork and document workflows."
        badge={<EnvironmentChip mode="staging" />}
      />
      <section className="panel documents-stage">
        <InactiveState
          title="Document storage is not active"
          body="No object storage, upload pipeline, or document classification provider is connected in staging. Atlas will not imply that paperwork has been received or verified."
        />
      </section>
    </>
  );
}

export function StagingAnalyticsWorkspace({
  requests,
  loads,
  openTasks,
  trackingUpdates,
}: {
  requests: number;
  loads: number;
  openTasks: number;
  trackingUpdates: number;
}) {
  return (
    <>
      <WorkspaceHeading
        eyebrow="Operational reporting"
        title="Analytics"
        subtitle="Counts calculated from this organization’s persisted staging records."
        badge={<EnvironmentChip mode="staging" />}
      />
      <section className="staging-summary analytics-summary">
        <article className="panel">
          <span>Shipment requests</span>
          <strong>{requests}</strong>
        </article>
        <article className="panel">
          <span>Approved loads</span>
          <strong>{loads}</strong>
        </article>
        <article className="panel">
          <span>Open tasks</span>
          <strong>{openTasks}</strong>
        </article>
        <article className="panel">
          <span>Tracking updates</span>
          <strong>{trackingUpdates}</strong>
        </article>
      </section>
      <section className="panel">
        <InactiveState
          title="Advanced analytics are not active"
          body="Financial trends, benchmarking, forecasting, and external BI exports require a larger verified dataset and are intentionally unavailable."
        />
      </section>
    </>
  );
}

export function StagingSettingsWorkspace({
  organization,
  members,
}: {
  organization: { name: string; slug: string };
  members: Array<{ name: string; email: string; role: string }>;
}) {
  return (
    <>
      <WorkspaceHeading
        eyebrow="Organization administration"
        title="Settings"
        subtitle="Current staging organization and access roster."
        badge={<EnvironmentChip mode="staging" />}
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <p className="overline">Organization</p>
          <h2>{organization.name}</h2>
          <dl>
            <div>
              <dt>Workspace slug</dt>
              <dd>{organization.slug}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>Staging environment</dd>
            </div>
          </dl>
        </section>
        <section className="panel settings-panel">
          <p className="overline">Active members</p>
          <div className="settings-members">
            {members.map((member) => (
              <div key={member.email}>
                <span className="avatar">
                  {member.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <p>
                  <b>{member.name}</b>
                  <small>{member.email}</small>
                </p>
                <StatusBadge label={member.role} tone="violet" />
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <InactiveState
          title="Settings changes are read-only"
          body="Invitations, role editing, billing, integrations, and notification preferences are not active in this milestone."
        />
      </section>
    </>
  );
}
