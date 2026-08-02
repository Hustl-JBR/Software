CREATE TYPE "FacilityStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AddressValidationStatus" AS ENUM ('VALIDATED', 'NEEDS_REVIEW', 'MANUALLY_CONFIRMED', 'INCOMPLETE', 'PROVIDER_UNAVAILABLE');
CREATE TYPE "RouteType" AS ENUM ('GENERAL_ROAD_ESTIMATE', 'COMMERCIAL_ROUTE');
CREATE TYPE "RouteSnapshotStatus" AS ENUM ('CURRENT', 'STALE');

CREATE TABLE "facilities" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "status" "FacilityStatus" NOT NULL DEFAULT 'ACTIVE',
  "address_line_1" TEXT NOT NULL,
  "address_line_2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "country_code" TEXT NOT NULL DEFAULT 'US',
  "formatted_address" TEXT,
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "time_zone" TEXT NOT NULL,
  "external_provider" TEXT,
  "external_place_id" TEXT,
  "validation_status" "AddressValidationStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "manually_entered" BOOLEAN NOT NULL DEFAULT true,
  "phone" TEXT,
  "shipping_hours" TEXT,
  "receiving_hours" TEXT,
  "appointment_required" BOOLEAN NOT NULL DEFAULT false,
  "appointment_instructions" TEXT,
  "internal_notes" TEXT,
  "created_by_id" UUID NOT NULL,
  "updated_by_id" UUID NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "facility_contacts" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "facility_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "facility_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "route_snapshots" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "load_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_route_id" TEXT,
  "route_type" "RouteType" NOT NULL DEFAULT 'GENERAL_ROAD_ESTIMATE',
  "status" "RouteSnapshotStatus" NOT NULL DEFAULT 'CURRENT',
  "stop_coordinates" JSONB NOT NULL,
  "distance_meters" INTEGER NOT NULL,
  "duration_seconds" INTEGER NOT NULL,
  "encoded_polyline" TEXT,
  "calculated_at" TIMESTAMPTZ(6) NOT NULL,
  "provider_version" TEXT NOT NULL,
  "equipment_context" JSONB,
  "warning" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "route_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_usage_logs" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "units" INTEGER NOT NULL DEFAULT 1,
  "duration_ms" INTEGER,
  "cache_hit" BOOLEAN NOT NULL DEFAULT false,
  "actor_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facilities_organization_id_id_key" ON "facilities"("organization_id", "id");
CREATE UNIQUE INDEX "facilities_organization_id_external_provider_external_place_id_key" ON "facilities"("organization_id", "external_provider", "external_place_id");
CREATE INDEX "facilities_organization_id_status_name_idx" ON "facilities"("organization_id", "status", "name");
CREATE UNIQUE INDEX "facility_contacts_organization_id_id_key" ON "facility_contacts"("organization_id", "id");
CREATE INDEX "facility_contacts_organization_id_facility_id_idx" ON "facility_contacts"("organization_id", "facility_id");
CREATE UNIQUE INDEX "route_snapshots_organization_id_id_key" ON "route_snapshots"("organization_id", "id");
CREATE UNIQUE INDEX "route_snapshots_organization_id_load_id_request_hash_key" ON "route_snapshots"("organization_id", "load_id", "request_hash");
CREATE INDEX "route_snapshots_organization_id_load_id_status_idx" ON "route_snapshots"("organization_id", "load_id", "status");
CREATE INDEX "provider_usage_logs_organization_id_provider_operation_created_at_idx" ON "provider_usage_logs"("organization_id", "provider", "operation", "created_at");

ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "facility_contacts" ADD CONSTRAINT "facility_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "facility_contacts" ADD CONSTRAINT "facility_contacts_organization_id_facility_id_fkey" FOREIGN KEY ("organization_id", "facility_id") REFERENCES "facilities"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "route_snapshots" ADD CONSTRAINT "route_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "route_snapshots" ADD CONSTRAINT "route_snapshots_organization_id_load_id_fkey" FOREIGN KEY ("organization_id", "load_id") REFERENCES "loads"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "route_snapshots" ADD CONSTRAINT "route_snapshots_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provider_usage_logs" ADD CONSTRAINT "provider_usage_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "load_stops"
  ADD COLUMN "facility_id" UUID,
  ADD COLUMN "address_line_1" TEXT,
  ADD COLUMN "address_line_2" TEXT,
  ADD COLUMN "country_code" TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN "formatted_address" TEXT,
  ADD COLUMN "latitude" DECIMAL(9,6),
  ADD COLUMN "longitude" DECIMAL(9,6),
  ADD COLUMN "time_zone" TEXT,
  ADD COLUMN "external_provider" TEXT,
  ADD COLUMN "external_place_id" TEXT,
  ADD COLUMN "validation_status" "AddressValidationStatus" NOT NULL DEFAULT 'INCOMPLETE',
  ADD COLUMN "manually_entered" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "appointment_local_start" TEXT,
  ADD COLUMN "appointment_local_end" TEXT,
  ADD COLUMN "appointment_time_zone" TEXT;

CREATE INDEX "load_stops_organization_id_facility_id_idx" ON "load_stops"("organization_id", "facility_id");
ALTER TABLE "load_stops" ADD CONSTRAINT "load_stops_organization_id_facility_id_fkey" FOREIGN KEY ("organization_id", "facility_id") REFERENCES "facilities"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
