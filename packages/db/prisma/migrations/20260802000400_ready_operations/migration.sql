ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'UNCOVERED';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'BOOKED';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'DISPATCHED';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'AT_PICKUP';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'AT_DELIVERY';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "LoadStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CUSTOMER';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

CREATE TYPE "CarrierReviewStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'DO_NOT_USE');
CREATE TYPE "DocumentType" AS ENUM ('RATE_CONFIRMATION', 'SIGNED_RATE_CONFIRMATION', 'BOL', 'POD', 'CUSTOMER_INVOICE', 'CARRIER_INVOICE', 'LUMPER_RECEIPT', 'OTHER');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'VOID');
CREATE TYPE "CarrierBillStatus" AS ENUM ('MISSING', 'RECEIVED', 'UNDER_REVIEW', 'APPROVED', 'SCHEDULED', 'PAID');

ALTER TABLE "customers"
  ADD COLUMN "contact_name" TEXT,
  ADD COLUMN "contact_email" TEXT,
  ADD COLUMN "contact_phone" TEXT,
  ADD COLUMN "billing_address" TEXT,
  ADD COLUMN "payment_terms" TEXT;

ALTER TABLE "quotes"
  ADD COLUMN "quote_number" TEXT,
  ADD COLUMN "contact_name" TEXT,
  ADD COLUMN "contact_email" TEXT,
  ADD COLUMN "pickup_address" TEXT,
  ADD COLUMN "delivery_address" TEXT,
  ADD COLUMN "pickup_date" DATE,
  ADD COLUMN "delivery_date" DATE,
  ADD COLUMN "equipment_type" TEXT,
  ADD COLUMN "commodity" TEXT,
  ADD COLUMN "weight_pounds" INTEGER,
  ADD COLUMN "pallet_count" INTEGER,
  ADD COLUMN "special_instructions" TEXT,
  ADD COLUMN "estimated_carrier_cost_cents" BIGINT,
  ADD COLUMN "sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "expires_at" TIMESTAMPTZ(6);

ALTER TABLE "loads"
  ADD COLUMN "pallet_count" INTEGER,
  ADD COLUMN "special_instructions" TEXT,
  ADD COLUMN "internal_notes" TEXT,
  ADD COLUMN "customer_price_cents" BIGINT,
  ADD COLUMN "carrier_cost_cents" BIGINT,
  ADD COLUMN "estimated_mileage" INTEGER,
  ADD COLUMN "dat_posted_at" TIMESTAMPTZ(6),
  ADD COLUMN "dat_posting_reference" TEXT,
  ADD COLUMN "delayed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "on_hold" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "exception_details" TEXT,
  ADD COLUMN "delivered_at" TIMESTAMPTZ(6),
  ADD COLUMN "delivery_receiver" TEXT,
  ADD COLUMN "carrier_id" UUID;

CREATE TABLE "carriers" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "legal_name" TEXT NOT NULL,
  "dba_name" TEXT,
  "mc_number" TEXT,
  "usdot_number" TEXT,
  "contact_name" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "insurance_expiration" DATE,
  "review_status" "CarrierReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "carriers_organization_id_id_key" ON "carriers"("organization_id", "id");
CREATE UNIQUE INDEX "carriers_organization_id_legal_name_key" ON "carriers"("organization_id", "legal_name");

CREATE TABLE "load_documents" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "load_id" UUID NOT NULL,
  "type" "DocumentType" NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "uploaded_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "load_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "load_documents_organization_id_id_key" ON "load_documents"("organization_id", "id");
CREATE INDEX "load_documents_organization_id_load_id_type_idx" ON "load_documents"("organization_id", "load_id", "type");

CREATE TABLE "customer_invoices" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "load_id" UUID NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "freight_charge_cents" BIGINT NOT NULL,
  "accessorials_cents" BIGINT NOT NULL DEFAULT 0,
  "payment_terms" TEXT,
  "due_date" DATE,
  "paid_cents" BIGINT NOT NULL DEFAULT 0,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "customer_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_invoices_load_id_key" ON "customer_invoices"("load_id");
CREATE UNIQUE INDEX "customer_invoices_organization_id_id_key" ON "customer_invoices"("organization_id", "id");
CREATE UNIQUE INDEX "customer_invoices_organization_id_load_id_key" ON "customer_invoices"("organization_id", "load_id");
CREATE UNIQUE INDEX "customer_invoices_organization_id_invoice_number_key" ON "customer_invoices"("organization_id", "invoice_number");

CREATE TABLE "carrier_bills" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "load_id" UUID NOT NULL,
  "carrier_invoice_number" TEXT,
  "status" "CarrierBillStatus" NOT NULL DEFAULT 'MISSING',
  "linehaul_cents" BIGINT NOT NULL DEFAULT 0,
  "accessorials_cents" BIGINT NOT NULL DEFAULT 0,
  "paid_cents" BIGINT NOT NULL DEFAULT 0,
  "due_date" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "carrier_bills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "carrier_bills_load_id_key" ON "carrier_bills"("load_id");
CREATE UNIQUE INDEX "carrier_bills_organization_id_id_key" ON "carrier_bills"("organization_id", "id");
CREATE UNIQUE INDEX "carrier_bills_organization_id_load_id_key" ON "carrier_bills"("organization_id", "load_id");

ALTER TABLE "carriers" ADD CONSTRAINT "carriers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loads" ADD CONSTRAINT "loads_organization_id_carrier_id_fkey" FOREIGN KEY ("organization_id", "carrier_id") REFERENCES "carriers"("organization_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "load_documents" ADD CONSTRAINT "load_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "load_documents" ADD CONSTRAINT "load_documents_organization_id_load_id_fkey" FOREIGN KEY ("organization_id", "load_id") REFERENCES "loads"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_organization_id_load_id_fkey" FOREIGN KEY ("organization_id", "load_id") REFERENCES "loads"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carrier_bills" ADD CONSTRAINT "carrier_bills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carrier_bills" ADD CONSTRAINT "carrier_bills_organization_id_load_id_fkey" FOREIGN KEY ("organization_id", "load_id") REFERENCES "loads"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
