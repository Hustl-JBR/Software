"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  atlasNavigation,
  navigationIsActive,
  type AtlasNavigationItem,
} from "@/lib/demo-navigation";

export function SidebarNav({
  slug,
  loadCount,
  onNavigate,
}: {
  slug: string;
  loadCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const navigation = atlasNavigation(slug, loadCount);
  const item = (entry: AtlasNavigationItem) => {
    const active = navigationIsActive(pathname, entry.href, entry.exact);
    return (
      <Link
        className={`nav-item ${active ? "active" : ""}`}
        href={entry.href}
        key={entry.href}
        onClick={onNavigate}
      >
        <span className="nav-icon">{entry.icon}</span>
        {entry.label}
        {entry.count && <span className="nav-count">{entry.count}</span>}
      </Link>
    );
  };
  return (
    <div className="sidebar-navigation">
      <nav className="primary-nav" aria-label="Primary navigation">
        {navigation.primary.map(item)}
      </nav>
      <div className="sidebar-section">
        <p>Workspace</p>
        {navigation.workspace.map(item)}
      </div>
    </div>
  );
}
