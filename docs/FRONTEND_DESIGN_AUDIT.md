# Frontend design audit

The persistent workspace was functionally dense and visually compressed. This milestone establishes: page titles 30–36 px; section titles 20–24 px; card titles 16–19 px; body 14 px with 1.55 line height; metadata 12 px; form controls 44 px minimum; action buttons 42 px minimum; roomier cards/tables; and clearer empty/inactive states.

The layout includes explicit adjustments at 1280, 1024, 768, and 390 px and retains a bounded wide desktop surface suitable for 1440/1920 px. At tablet widths overview grids stack and record headers reflow. At narrow mobile widths the sidebar becomes a horizontal navigation rail, dense columns collapse, and record cards use one column.

Required visual verification is 1920, 1440, 1280, 1024, 768, and 390 px, including browser-console review. Screenshots belong under `docs/screenshots/operations/` and are evidence only after the browser run completes.

Verified 2026-08-02: all six screenshots are committed in that directory; each viewport reported equal document scroll/client width, the 390 px title computed to 30 px, and the in-app browser warning/error log was empty. The 12-test demo Playwright suite also passed.

Employee language replaces database model names, raw field keys, and underscored enum constants. One `STAGING` badge communicates the environment without repeating “persistent staging” throughout the product.
