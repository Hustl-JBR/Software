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
      { label: "Today", icon: "⌂", href: root, exact: true },
      { label: "Quotes", icon: "Q", href: `${root}/quotes` },
      {
        label: "Loads",
        icon: "↗",
        href: `${root}/loads`,
        count: loadCount === undefined ? undefined : String(loadCount),
      },
      { label: "Companies", icon: "C", href: `${root}/companies` },
      { label: "Money", icon: "$", href: `${root}/money` },
    ] satisfies AtlasNavigationItem[],
    workspace: [] satisfies AtlasNavigationItem[],
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
