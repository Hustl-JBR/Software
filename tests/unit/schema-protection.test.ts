import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("packages/db/prisma/schema.prisma", "utf8");
const equipmentMigration = readFileSync(
  "packages/db/prisma/migrations/20260802000100_equipment_types/migration.sql",
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
});
