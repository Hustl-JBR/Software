CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACCEPTED');
CREATE TYPE "CarrierCandidateStatus" AS ENUM ('ENTERED', 'BLOCKED', 'QUALIFIED', 'SELECTED');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'COMPLETED');
CREATE TYPE "CommunicationChannel" AS ENUM ('PHONE', 'EMAIL', 'SMS', 'INTERNAL_NOTE');

ALTER TABLE users
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN image TEXT,
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX auth_sessions_user_id_idx ON auth_sessions("userId");

CREATE TABLE auth_accounts (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_accounts_user_id_idx ON auth_accounts("userId");

CREATE TABLE auth_verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_verifications_identifier_idx ON auth_verifications(identifier);

CREATE TABLE organization_membership_roles (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role "MembershipRole" NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(membership_id, role)
);
CREATE INDEX organization_membership_roles_org_user_idx ON organization_membership_roles(organization_id, user_id);

CREATE TABLE customer_calls (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  shipment_request_id UUID,
  customer_name TEXT NOT NULL,
  contact_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id, shipment_request_id) REFERENCES shipment_requests(organization_id, id)
);
CREATE INDEX customer_calls_org_occurred_idx ON customer_calls(organization_id, occurred_at);

CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  shipment_request_id UUID NOT NULL,
  status "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  amount_cents BIGINT NOT NULL CHECK(amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  assumptions TEXT,
  created_by_id UUID NOT NULL REFERENCES users(id),
  approved_by_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  acceptance_evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, id),
  FOREIGN KEY(organization_id, shipment_request_id) REFERENCES shipment_requests(organization_id, id)
);
CREATE INDEX quotes_org_request_idx ON quotes(organization_id, shipment_request_id);

ALTER TABLE loads
  ADD COLUMN primary_owner_id UUID REFERENCES users(id),
  ADD COLUMN next_action TEXT;
ALTER TABLE load_stops ADD COLUMN appointment_confirmed_at TIMESTAMPTZ;

CREATE TABLE carrier_candidates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  load_id UUID NOT NULL,
  carrier_name TEXT NOT NULL,
  status "CarrierCandidateStatus" NOT NULL DEFAULT 'ENTERED',
  authority_confirmed BOOLEAN NOT NULL DEFAULT false,
  insurance_confirmed BOOLEAN NOT NULL DEFAULT false,
  cargo_coverage_cents BIGINT CHECK(cargo_coverage_cents >= 0),
  quoted_cost_cents BIGINT CHECK(quoted_cost_cents >= 0),
  block_reason TEXT,
  selected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, id),
  FOREIGN KEY(organization_id, load_id) REFERENCES loads(organization_id, id)
);
CREATE INDEX carrier_candidates_org_load_idx ON carrier_candidates(organization_id, load_id);
CREATE UNIQUE INDEX one_selected_carrier_per_load ON carrier_candidates(organization_id, load_id) WHERE status = 'SELECTED';

CREATE TABLE driver_assignments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  load_id UUID UNIQUE NOT NULL,
  carrier_candidate_id UUID UNIQUE NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT,
  dispatcher_name TEXT NOT NULL,
  dispatcher_phone TEXT,
  tractor_number TEXT,
  trailer_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, load_id),
  UNIQUE(organization_id, carrier_candidate_id),
  FOREIGN KEY(organization_id) REFERENCES organizations(id),
  FOREIGN KEY(organization_id, load_id) REFERENCES loads(organization_id, id),
  FOREIGN KEY(organization_id, carrier_candidate_id) REFERENCES carrier_candidates(organization_id, id)
);

CREATE TABLE tracking_updates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  load_id UUID NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id, load_id) REFERENCES loads(organization_id, id)
);
CREATE INDEX tracking_updates_org_load_time_idx ON tracking_updates(organization_id, load_id, occurred_at);

CREATE TABLE communication_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  load_id UUID NOT NULL,
  channel "CommunicationChannel" NOT NULL,
  party_type TEXT NOT NULL,
  party_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('INBOUND', 'OUTBOUND')),
  summary TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id, load_id) REFERENCES loads(organization_id, id)
);
CREATE INDEX communication_logs_org_load_time_idx ON communication_logs(organization_id, load_id, occurred_at);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  load_id UUID,
  title TEXT NOT NULL,
  status "TaskStatus" NOT NULL DEFAULT 'OPEN',
  due_at TIMESTAMPTZ,
  assignee_id UUID NOT NULL REFERENCES users(id),
  completed_by_id UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, id),
  FOREIGN KEY(organization_id) REFERENCES organizations(id),
  FOREIGN KEY(organization_id, load_id) REFERENCES loads(organization_id, id)
);
CREATE INDEX tasks_org_status_due_idx ON tasks(organization_id, status, due_at);
