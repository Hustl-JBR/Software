import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, type MembershipRole } from "@prisma/client";

const prisma = new PrismaClient();

const people = [
  {
    email: "alex.sales@atlas-staging.invalid",
    name: "Alex Sales",
    passwordVariable: "ATLAS_SEED_PASSWORD_ALEX",
    primaryRole: "APPROVER" as MembershipRole,
    roles: ["APPROVER", "OPERATOR"] as MembershipRole[],
  },
  {
    email: "blair.approver@atlas-staging.invalid",
    name: "Blair Approver",
    passwordVariable: "ATLAS_SEED_PASSWORD_BLAIR",
    primaryRole: "APPROVER" as MembershipRole,
    roles: ["APPROVER", "VIEWER"] as MembershipRole[],
  },
  {
    email: "casey.operations@atlas-staging.invalid",
    name: "Casey Operations",
    passwordVariable: "ATLAS_SEED_PASSWORD_CASEY",
    primaryRole: "OPERATOR" as MembershipRole,
    roles: ["OPERATOR"] as MembershipRole[],
  },
  {
    email: "devon.admin@atlas-staging.invalid",
    name: "Devon Admin",
    passwordVariable: "ATLAS_SEED_PASSWORD_DEVON",
    primaryRole: "APPROVER" as MembershipRole,
    roles: ["APPROVER", "OPERATOR", "VIEWER"] as MembershipRole[],
  },
];

async function main() {
  if (process.env.SEED_STAGING_DATA !== "true") {
    throw new Error(
      "Refusing to seed. Set SEED_STAGING_DATA=true for Atlas staging only.",
    );
  }
  const missing = people
    .map((person) => person.passwordVariable)
    .filter((name) => !process.env[name] || process.env[name]!.length < 12);
  if (missing.length) {
    throw new Error(
      `Missing staging password variables: ${missing.join(", ")}`,
    );
  }

  const organization = await prisma.organization.upsert({
    where: { slug: "atlas-staging" },
    update: { name: "Project Atlas Staging" },
    create: { slug: "atlas-staging", name: "Project Atlas Staging" },
  });

  for (const person of people) {
    const existing = await prisma.user.findUnique({
      where: { email: person.email },
    });
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, active: true, emailVerified: true },
      create: {
        email: person.email,
        name: person.name,
        active: true,
        emailVerified: true,
      },
    });
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (!account) {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: await hashPassword(process.env[person.passwordVariable]!),
        },
      });
    }
    const membership = await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: { status: "ACTIVE", role: person.primaryRole },
      create: {
        organizationId: organization.id,
        userId: user.id,
        status: "ACTIVE",
        role: person.primaryRole,
      },
    });
    for (const role of person.roles) {
      await prisma.organizationMembershipRole.upsert({
        where: { membershipId_role: { membershipId: membership.id, role } },
        update: {},
        create: {
          organizationId: organization.id,
          membershipId: membership.id,
          userId: user.id,
          role,
        },
      });
    }
    if (!existing) {
      await prisma.auditEvent.create({
        data: {
          organizationId: organization.id,
          actorType: "SYSTEM",
          action: "STAGING_ACCOUNT_PROVISIONED",
          entityType: "User",
          entityId: user.id,
          afterState: { email: user.email, roles: person.roles },
          metadata: {
            synthetic: true,
            passwordVariable: person.passwordVariable,
          },
          correlationId: randomUUID(),
        },
      });
    }
  }
  console.log(
    "Seeded four synthetic Atlas staging accounts without printing credentials.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Staging seed failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
