# Changelog

## 2026-03-01 — Platform Integration & Polish

### New Features
- **About Page**: Added `/about` route with developer profiles (Fahad Khan), contributors (Sujal Nayak, Aman), and KokoLab shoutout.
- **Navbar**: Added "About" link to the navigation bar.
- **Send Sound Effect**: Added `mixkit-long-pop-2358.wav` on successful email send.

### Security Fixes
- **Decrypt Fix**: Resolved `InvalidCharacterError` in `atob()` by sanitizing base64 strings (stripping whitespace, converting URL-safe chars).
- **Attachment Downloads**: Fixed corrupt downloads by properly handling raw base64 vs data-URL prefixed content.

### AI Improvements
- **Priority Swap**: Backend OpenRouter API is now the primary AI engine for summarization, drafting, and polishing.
- **Puter.js Fallback**: Puter.js is now a graceful fallback instead of the primary, eliminating 401 errors.

### UI/UX
- **FallingText**: Added more spam-related words and emojis to the interactive component.
- **Footer**: Updated with "Designed and developed by Fahad Khan".
- **README**: Complete rewrite with comprehensive feature documentation.

---

## 2026-02-14 — Status Page & Legal

### Status Page Enhancements
- **Hydration Fix**: Resolved Next.js hydration mismatch by implementing stable server-side rendering for uptime bars.
- **Visual Polish**:
  - Implemented light cream theme (`#fffcf8`) for a cleaner, professional look.
  - Aligned massive hero SVG (computer icon) to the right of metrics grid.
  - Removed small duplicate SVG from navigation bar.
- **Incident Reporting**:
  - Replaced browser `alert()` with a custom `IncidentReportModal`.
  - Added new backend API route `/api/report-incident` for sending email reports.
  - Integrated full email sending capability via SMTP.

### Legal Pages Polish
- **Privacy Policy**:
  - Switched background to light cream theme.
  - Removed duplicate `Header` component to fix double navbar issue.
- **Terms of Service**:
  - Switched background to light cream theme.
  - Removed duplicate `Header` component.
