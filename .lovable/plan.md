# Move "Report a bug" to its own page

## Files

1. **New — `src/routes/_authenticated/report-bug.tsx`**
   Route `/report-bug`, wrapped in `DashboardLayout title={t("nav.reportBug")}`, rendering `<ReportBugCard />` in a `max-w-2xl mx-auto` container. Available to all authenticated users (no owner gate).

2. **`src/components/carenest/ReportBugCard.tsx`** — kept (not orphaned; it is the page body). Only change: `page_context` fallback `"/settings"` → `"/report-bug"`. Submit logic, validation (1–5000 chars), success state unchanged.

3. **`src/routes/_authenticated/settings.tsx`** — remove the `ReportBugCard` import and its render block.

4. **`src/components/carenest/AppSidebar.tsx`** — import `Bug` from lucide; add `reportBugItem = { title: t("nav.reportBug"), url: "/report-bug", icon: Bug }`; add a `SidebarMenuItem` in `SidebarFooter` directly after the Settings item, same markup (`asChild`, `isActive`, `rounded-xl h-11`, `tooltip`, `Link` + icon + label). Not owner-gated.

5. **`src/lib/i18n/en.ts` / `sv.ts`** — add `nav.reportBug` ("Report a bug" / "Rapportera bugg"). All existing `settingsPage.bugReport.*` keys stay (reused by the new page) — none become orphaned.

## Diff sketch

```text
AppSidebar.tsx (SidebarFooter, after Settings item)
+ <SidebarMenuItem>
+   <SidebarMenuButton asChild isActive={isActive(reportBugItem.url)}
+     className="rounded-xl h-11" tooltip={reportBugItem.title}>
+     <Link to={reportBugItem.url} className="flex items-center gap-3">
+       <reportBugItem.icon className="size-5" />
+       {!collapsed && <span className="font-semibold">{reportBugItem.title}</span>}
+     </Link>
+   </SidebarMenuButton>
+ </SidebarMenuItem>

settings.tsx
- {/* Report a bug */}
- <ReportBugCard />
```

## Verify

`tsgo --noEmit`, en/sv key parity, sidebar screenshot showing the item under Settings.
