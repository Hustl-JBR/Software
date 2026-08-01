export type AtlasNavigationItem = {
  label: string;
  icon: string;
  href: string;
  count?: string;
  exact?: boolean;
};

export function atlasNavigation(slug: string, loadCount?: number) {
  const root = `/org/${slug}`;
  return {
    primary: [
      { label: "Command center", icon: "⌂", href: root, exact: true },
      {
        label: "Loads",
        icon: "↗",
        href: `${root}/loads`,
        count: loadCount === undefined ? undefined : String(loadCount),
      },
      { label: "Tracking", icon: "◎", href: `${root}/tracking` },
      { label: "Network", icon: "◇", href: `${root}/network` },
      { label: "Analytics", icon: "▤", href: `${root}/analytics` },
    ] satisfies AtlasNavigationItem[],
    workspace: [
      { label: "Documents", icon: "◫", href: `${root}/documents` },
      { label: "Settings", icon: "⚙", href: `${root}/settings` },
    ] satisfies AtlasNavigationItem[],
  };
}

export const demoNavigation = atlasNavigation("atlas-north", 12).primary;
export const workspaceNavigation = atlasNavigation("atlas-north", 12).workspace;

export function navigationIsActive(
  pathname: string,
  href: string,
  exact = false,
) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
