export const demoNavigation = [
  { label: "Command center", icon: "⌂", href: "/org/atlas-north", exact: true },
  { label: "Loads", icon: "↗", href: "/org/atlas-north/loads", count: "12" },
  { label: "Tracking", icon: "◎", href: "/org/atlas-north/tracking" },
  { label: "Network", icon: "◇", href: "/org/atlas-north/network" },
  { label: "Analytics", icon: "▤", href: "/org/atlas-north/analytics" },
] as const;
export const workspaceNavigation = [
  { label: "Documents", icon: "◫", href: "/org/atlas-north/documents" },
  { label: "Settings", icon: "⚙", href: "/org/atlas-north/settings" },
] as const;
export function navigationIsActive(
  pathname: string,
  href: string,
  exact = false,
) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
