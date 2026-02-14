# Changelog - 2026-02-14

## Status Page Enhancements
- **Hydration Fix**: Resolved Next.js hydration mismatch by implementing stable server-side rendering for uptime bars.
- **Visual Polish**:
  - Implemented light cream theme (`#fffcf8`) for a cleaner, professional look.
  - Aligned massive hero SVG (computer icon) to the right of metrics grid.
  - Removed small duplicate SVG from navigation bar.
- **Incident Reporting**:
  - Replaced browser `alert()` with a custom `IncidentReportModal`.
  - Added new backend API route `/api/report-incident` for sending email reports.
  - Integrated full email sending capability via SMTP.

## Legal Pages Polish
- **Privacy Policy**:
  - Switched background to light cream theme.
  - Removed duplicate `Header` component to fix double navbar issue.
- **Terms of Service**:
  - Switched background to light cream theme.
  - Removed duplicate `Header` component.
