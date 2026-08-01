"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  demoNavigation,
  navigationIsActive,
  workspaceNavigation,
} from "@/lib/demo-navigation";

export function SidebarNav() {
  const pathname = usePathname();
  const item = (entry: {
    label: string;
    icon: string;
    href: string;
    count?: string;
    exact?: boolean;
  }) => {
    const active = navigationIsActive(pathname, entry.href, entry.exact);
    return (
      <Link
        className={`nav-item ${active ? "active" : ""}`}
        href={entry.href}
        key={entry.href}
      >
        <span className="nav-icon">{entry.icon}</span>
        {entry.label}
        {entry.count && <span className="nav-count">{entry.count}</span>}
      </Link>
    );
  };
  return (
    <>
      <nav className="primary-nav" aria-label="Primary navigation">
        {demoNavigation.map(item)}
      </nav>
      <div className="sidebar-section">
        <p>Workspace</p>
        {workspaceNavigation.map(item)}
      </div>
    </>
  );
}
