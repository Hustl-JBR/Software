import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  if (process.env.SEED_DEVELOPMENT_DATA !== "true") {
    throw new Error(
      "Refusing to seed. Set SEED_DEVELOPMENT_DATA=true only for a disposable local or test database.",
    );
  }
  const north = await prisma.organization.upsert({
    where: { slug: "atlas-north" },
    update: {},
    create: { slug: "atlas-north", name: "Atlas North Demo" },
  });
  const south = await prisma.organization.upsert({
    where: { slug: "atlas-south" },
    update: {},
    create: { slug: "atlas-south", name: "Atlas South Demo" },
  });
  const users = [
    {
      email: "approver@atlas.local",
      name: "Avery Approver",
      role: "APPROVER" as const,
      org: north,
    },
    {
      email: "operator@atlas.local",
      name: "Olivia Operator",
      role: "OPERATOR" as const,
      org: north,
    },
    {
      email: "viewer@atlas.local",
      name: "Victor Viewer",
      role: "VIEWER" as const,
      org: north,
    },
    {
      email: "south@atlas.local",
      name: "Sam South",
      role: "APPROVER" as const,
      org: south,
    },
  ];
  for (const item of users) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {},
      create: { email: item.email, name: item.name },
    });
    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: { organizationId: item.org.id, userId: user.id },
      },
      update: { role: item.role, status: "ACTIVE" },
      create: { organizationId: item.org.id, userId: user.id, role: item.role },
    });
  }
  console.log("Seeded two organizations and four synthetic development users.");
}
main()
  .catch((error: unknown) => {
    console.error("Development seed failed.");
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
