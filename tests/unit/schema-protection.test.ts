import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("packages/db/prisma/schema.prisma", "utf8");
const equipmentMigration = readFileSync(
  "packages/db/prisma/migrations/20260802000100_equipment_types/migration.sql",
  "utf8",
);
const facilityMigration = readFileSync(
  "packages/db/prisma/migrations/20260802000300_facilities_routing_foundation/migration.sql",
  "utf8",
);

describe("database schema protections", () => {
  it("maps every operational instant explicitly to PostgreSQL timestamptz", () => {
    const dateTimeLines = schema
      .split(/\r?\n/)
      .filter((line) => line.includes("DateTime"));
    expect(dateTimeLines.length).toBeGreaterThan(40);
    expect(
      dateTimeLines.every(
        (line) =>
          line.includes("@db.Timestamptz(6)") || line.includes("@db.Date"),
      ),
    ).toBe(true);
  });

  it("keeps the equipment migration narrow and free of timestamp rewrites", () => {
    expect(equipmentMigration).toContain("equipment_detail");
    expect(equipmentMigration).toContain("POWER_ONLY");
    expect(equipmentMigration).not.toMatch(/TIMESTAMP(?!TZ)/i);
  });

  it("enforces tenant-safe facility and route foreign keys", () => {
    expect(facilityMigration).toContain(
      'FOREIGN KEY ("organization_id", "facility_id")',
    );
    expect(facilityMigration).toContain(
      'FOREIGN KEY ("organization_id", "load_id")',
    );
    expect(facilityMigration).toContain("TIMESTAMPTZ(6)");
    expect(facilityMigration).not.toMatch(/TIMESTAMP\(6\)(?! WITH TIME ZONE)/i);
  });
});
