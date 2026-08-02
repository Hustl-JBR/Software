import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";

const windows = new Map<string, { startedAt: number; count: number }>();

export async function requireProviderContext(slug: string) {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("UNAUTHORIZED");
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      user: { active: true },
      organization: { slug },
    },
  });
  if (!membership) throw new Error("NOT_FOUND");
  const key = `${membership.organizationId}:${userId}`;
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    windows.set(key, { startedAt: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > 30) throw new Error("RATE_LIMITED");
  }
  return { userId, organizationId: membership.organizationId };
}

export async function recordProviderUsage(input: {
  organizationId: string;
  userId: string;
  provider: string;
  operation: string;
  outcome: string;
  durationMs: number;
}) {
  await prisma.providerUsageLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.userId,
      provider: input.provider,
      operation: input.operation,
      outcome: input.outcome,
      durationMs: input.durationMs,
    },
  });
}
