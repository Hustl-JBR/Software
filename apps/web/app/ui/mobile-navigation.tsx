"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";

type MobileProfile = {
  name: string;
  organization: string;
  initials: string;
} | null;

export function MobileNavigation({
  slug,
  commandHref,
  loadCount,
  demo,
  profile,
}: {
  slug?: string;
  commandHref: string;
  loadCount?: number;
  demo: boolean;
  profile: MobileProfile;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.classList.toggle("navigation-open", open);
    return () => document.body.classList.remove("navigation-open");
  }, [open]);

  return (
    <>
      <header className="mobile-header">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-navigation-drawer"
          onClick={() => setOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <Link className="brand mobile-brand" href={commandHref}>
          <span className="brand-mark">A</span>
          <span className="brand-word">ATLAS</span>
        </Link>
        <span className={`demo-label ${demo ? "" : "staging-label"}`}>
          {demo ? "DEMO" : "STAGING · POSTGRESQL"}
        </span>
        {profile && (
          <span className="mobile-user" title={`Signed in as ${profile.name}`}>
            {profile.initials}
          </span>
        )}
      </header>
      <button
        type="button"
        aria-label="Close navigation"
        className={`navigation-scrim ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`mobile-drawer ${open ? "open" : ""}`}
        id="mobile-navigation-drawer"
        aria-hidden={!open}
      >
        <div className="mobile-drawer-heading">
          <Link className="brand" href={commandHref}>
            <span className="brand-mark">A</span>
            <span className="brand-word">ATLAS</span>
          </Link>
          <button
            type="button"
            className="drawer-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        {slug && (
          <SidebarNav
            slug={slug}
            loadCount={loadCount}
            onNavigate={() => setOpen(false)}
          />
        )}
        {profile && (
          <details className="sidebar-profile mobile-profile profile-menu">
            <summary>
              <span className="avatar">{profile.initials}</span>
              <span>
                <strong>{profile.name}</strong>
                <small>{profile.organization}</small>
              </span>
              <span className="presence" title="Online" />
            </summary>
            {slug && (
              <div className="profile-menu-items">
                <Link href={`/org/${slug}/settings`}>Settings</Link>
              </div>
            )}
          </details>
        )}
      </aside>
    </>
  );
}
