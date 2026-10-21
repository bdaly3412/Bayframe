# Interface design system

Updated: 21 October 2026. Implemented across entry, staff sign-in, requests,
resources, schedule, work orders, absences, history and customer decisions.
Shared styles live in `src/app/globals.css`.

## Identity and hierarchy

The interface follows an allocation sheet: booked time, vehicle registration,
bay and technician identify the appointment. A quiet mineral frame surrounds the
white work surface. Work orders use a job sheet with context, tasks, current
estimate and earlier versions. Customer pages use the same typography and controls
with a reading column and supporting guidance.

Schedule, work orders, resources, absences and history have separate destinations.
The schedule retains both the resource timeline and detailed appointment table.
The day control selects the timeline day; the table explicitly covers all dates
and can filter booking state. Selecting a reservation restores its booking row,
including when a table filter previously hid it. History links open the owning
view and focus the exact record or task after streamed content arrives.

## Tokens

| Role | Value / rule |
| --- | --- |
| Frame | `#eef1f2` |
| Work surface | `#ffffff` |
| Primary text | `#202b30` |
| Supporting text | `#56656b` |
| Allocation / focus | `#176b68` |
| Allocation fill | `#e4f2ef` |
| Quiet rule | `#dce2e3` |
| Control boundary | `#7c898e` |
| Waiting text / fill | `#805017` / `#fbf1dc` |
| Error text / fill | `#9c3530` / `#fcf0ee` |
| Spacing | 4, 8, 12, 16, 20, 24 and 32px |
| Corners | Controls 3px; job sheets 4px; outer surface 6px |

IBM Plex Sans carries headings, prose, controls and data at weights 400, 500 and
600. Three unmodified WOFF2 files are self-hosted through the framework's local
font loader with swap delivery. The full copyright and SIL Open Font License
remain in [the font directory](../public/fonts/README.md). No external font
service is contacted at runtime. Body text is 16px; operational rows and controls
are 14px; secondary labels are 12–13px. Headings use a fixed rem scale, reaching
28px on desktop and 24px on narrow screens. Numerical columns use tabular figures
and right alignment; monospace is unnecessary.

## Controls and feedback

Shared buttons and alerts use Material UI with application-specific sizing,
colours, typography and explicit success/error styling. The streaming style cache
places component styles in the document head. Inputs, selects, disclosures and
confirmation dialogs retain native behaviour. Controls have a 44px minimum height.
There is no decorative motion, resting shadow, gradient or drag-only interaction.

Status always includes text. Colour reinforces waiting, active, completed and
rejected states. Reservation bars use text and a solid boundary; absences use a
dashed boundary and a visible interval list. Accessible reservation names include
vehicle, booking reference, resource and full interval in workshop time.

Forms disable duplicate submission while pending. Failures retain entered values,
focus the error summary and announce it as an alert. Named server-validation
errors mark the relevant field invalid and link back to it. Successful operations
use a distinct status announcement. Failed sign-in preserves the email; passwords
are not returned in action state. Cancellation and rejection require an explicit
confirmation. Booking and work rules remain enforced on the server.

Issuing freezes the estimate version and displays its capability link once.
Copy it before using **Refresh after copying link**; refreshing removes the link
and updates the work state. Customer decisions show exact version, complete line
items, quantity, unit price, net, VAT and total. Acceptance and rejection are equally
discoverable and state their consequences without visual pressure. Expired,
replaced and invalid links display the service's controlled failure and recovery
guidance. The capability remains outside paths, query strings and stored UI state.

## Responsive and accessible structure

Desktop staff navigation uses a 13.5rem frame. At 1100px and below it becomes a
compact top frame with a native Navigation disclosure and visible current
destination. At 700px and below job and customer layouts stack. A native work-order selector replaces the desktop job list; essential job context remains on the selected sheet. Two-dimensional schedule, resource and history tables
scroll inside named, keyboard-focusable regions. The short customer estimate
table fits quantity and price columns within narrow screens while descriptions wrap.

The skip link targets the main landmark. Controls have labels, visible focus,
logical source order and no essential hover-only information. Reduced-motion
preferences disable incidental library transitions. Focused records use a visible
outline and scroll margin. Long contact names, registrations and task descriptions
wrap without widening the document.

Calculated palette contrast against white: primary text 14.49:1, supporting text
6.05:1, focus/link teal 6.29:1 and control boundaries 3.60:1. Waiting/error text on
their fills exceed 6:1. Reservation boundaries exceed 3:1 against their adjoining
surfaces. These token calculations supplement browser checks; they do not prove
whole-application accessibility conformance.

[The roadmap](../ROADMAP.md) owns executed browser, workflow and verification
evidence, including viewport/text-resize coverage and remaining limitations.
