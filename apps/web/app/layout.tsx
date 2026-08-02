import Link from "next/link";
import { isDemoMode } from "@/lib/demo-store";
import { SidebarNav } from "@/app/ui/sidebar-nav";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@atlas/db/client";
import { MobileNavigation } from "@/app/ui/mobile-navigation";

import "./styles.css";

export const metadata = {
  title: "Project Atlas",
  description: "Human-reviewed freight operations",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const demo = isDemoMode();
  const userId = demo ? null : await getSessionUserId();
  const membership = userId
    ? await prisma.organizationMembership.findFirst({
        where: { userId, status: "ACTIVE", user: { active: true } },
        include: { organization: true, user: true },
      })
    : null;
  const slug = demo ? "atlas-north" : membership?.organization.slug;
  const commandHref = slug ? `/org/${slug}` : "/sign-in";
  const loadCount = membership
    ? await prisma.load.count({
        where: { organizationId: membership.organizationId },
      })
    : demo
      ? 12
      : undefined;
  const profile = demo
    ? { name: "Demo Approver", organization: "Atlas North", initials: "DA" }
    : membership
      ? {
          name: membership.user.name,
          organization: membership.organization.name,
          initials: membership.user.name
            .split(" ")
            .map((part: string) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        }
      : null;

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <MobileNavigation
            slug={slug}
            commandHref={commandHref}
            loadCount={loadCount}
            demo={demo}
            profile={profile}
          />
          <aside className="sidebar">
            <div className="sidebar-top">
              <Link className="brand" href={commandHref}>
                <span className="brand-mark">A</span>
                <span className="brand-word">ATLAS</span>
              </Link>
              <span className={`demo-label ${demo ? "" : "staging-label"}`}>
                {demo ? "DEMO" : "STAGING · POSTGRESQL"}
              </span>
            </div>
            {slug && <SidebarNav slug={slug} loadCount={loadCount} />}
            {profile && (
              <div className="sidebar-profile">
                <span className="avatar">{profile.initials}</span>
                <span>
                  <strong>{profile.name}</strong>
                  <small>{profile.organization}</small>
                </span>
                <span className="presence" title="Online" />
              </div>
            )}
          </aside>
          <div className="workspace">
            <header className="topbar">
              <div className="global-search" aria-label="Search availability">
                ⌕ <span>Search loads, customers, lanes…</span>
                <kbd>Ctrl K</kbd>
              </div>
              <div className="topbar-actions">
                <span className="system-status">
                  <i /> {demo ? "Demo systems ready" : "Atlas systems online"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Notifications"
                  disabled
                >
                  ◇
                </button>
              </div>
            </header>
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
