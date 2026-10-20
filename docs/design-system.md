# Interface design direction

Status: requirements and proposals; no screens/components exist. Updated: 20 October 2026.

## Purpose

Staff interfaces prioritize scheduling and repair decisions. Customer interfaces
prioritize clear request/approval actions. Presentation must communicate actual
state and never suggest that advisory availability guarantees a reservation.

## Visual principles

- Restrained neutral palette, readable typography and consistent spacing; use
  hierarchy to distinguish the current task, exceptions and supporting detail.
- Dense but legible operational tables with clear column labels, alignment,
  sorting where needed and status text that does not rely on colour alone.
- Consider IBM Plex Sans/Mono only after checking legibility and font delivery.
- No generic hero panels, decorative dashboards, ornamental cards or bento
  layouts, gradients, icon-heavy controls, excessive rounding or animation
  without a functional purpose.
- Do not build a component library before actual interfaces reveal shared needs.

## Interaction and accessibility

Every significant view needs loading, empty, validation-error, permission-denied,
conflict and infrastructure-failure states where applicable. Preserve useful form
input after failures and show field-specific correction guidance.

Use semantic controls, visible keyboard focus, labels and announced errors. Do
not rely on colour alone. Prefer a usable list/table alternative to a calendar
requiring drag interactions. Confirm keyboard operation, contrast and mobile
layout against the implemented UI, not a mockup.

Prevent accidental duplicate submission in the UI, while enforcing duplicate
safety on the server. An approval view must identify the exact estimate version,
line items, totals and explicit accept/reject action without exposing other records.

## Screen delivery order

1. Minimal staff login and protected resource view.
2. Request form, staff request list, booking detail and simple resource schedule.
3. Work-order list/detail with task progress.
4. Estimate preparation and restricted customer decision.
5. Minimal settings and operational overview if needed by the validated workflow.

Customer/vehicle records can initially be handled within these workflows. Any
decision to replace the requested timeline with a simpler schedule table needs
owner acceptance. Do not develop every screen simultaneously.

For each implemented view, identify the user's decision, prioritize information,
define states, implement the smallest usable layout, run browser interactions,
inspect screenshots and fix demonstrated problems. Detailed tokens and component
rules should grow from those verified views.
