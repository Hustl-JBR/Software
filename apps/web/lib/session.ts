import { headers } from "next/headers";
import { prisma } from "@atlas/db/client";
import { auth } from "@/lib/auth";

export async function getSessionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { active: true },
  });
  return user?.active ? session.user.id : null;
}
