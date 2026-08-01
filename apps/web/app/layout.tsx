import Link from "next/link";
import { isDemoMode } from "@/lib/demo-store";
import { SidebarNav } from "@/app/ui/sidebar-nav";

import "./styles.css";

export const metadata = {
  title: "Project Atlas",
  description: "Human-reviewed freight operations",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const demo = isDemoMode();
  const commandHref = demo ? "/org/atlas-north" : "/";
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-top">
              <Link className="brand" href={commandHref}>
                <span className="brand-mark">A</span>
                <span className="brand-word">ATLAS</span>
              </Link>
              {demo && <span className="demo-label">DEMO MODE</span>}
            </div>
            {demo ? (
              <SidebarNav />
            ) : (
              <nav className="primary-nav">
                <Link className="nav-item active" href={commandHref}>
                  <span className="nav-icon">⌂</span> Command center
                </Link>
              </nav>
            )}
            <div className="sidebar-profile">
              <span className="avatar">DA</span>
              <span>
                <strong>Demo Approver</strong>
                <small>Atlas North</small>
              </span>
              <span className="presence" title="Online" />
            </div>
          </aside>
          <div className="workspace">
            <header className="topbar">
              <div className="global-search">
                ⌕ <span>Search loads, customers, lanes…</span>
                <kbd>⌘ K</kbd>
              </div>
              <div className="topbar-actions">
                <span className="system-status">
                  <i /> All systems operational
                </span>
                <button className="icon-button" aria-label="Notifications">
                  ♢<span className="notification-dot" />
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
