import Link from "next/link";
import { isDemoMode } from "@/lib/demo-store";

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
            <nav className="primary-nav" aria-label="Primary navigation">
              <Link className="nav-item active" href={commandHref}>
                <span className="nav-icon">⌂</span> Command center
              </Link>
              <Link className="nav-item" href="/org/atlas-north/loads">
                <span className="nav-icon">↗</span> Loads
                <span className="nav-count">12</span>
              </Link>
              <span className="nav-item muted-nav">
                <span className="nav-icon">◎</span> Tracking
              </span>
              <span className="nav-item muted-nav">
                <span className="nav-icon">◇</span> Network
              </span>
              <span className="nav-item muted-nav">
                <span className="nav-icon">▤</span> Analytics
              </span>
            </nav>
            <div className="sidebar-section">
              <p>Workspace</p>
              <span className="nav-item muted-nav">
                <span className="nav-icon">◫</span> Documents
              </span>
              <span className="nav-item muted-nav">
                <span className="nav-icon">⚙</span> Settings
              </span>
            </div>
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
