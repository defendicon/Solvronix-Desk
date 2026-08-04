# ERPNext v15 Visual Profile for Solvronix Desk v16

## Goal

Add a built-in `ERPNext v15` visual profile to Solvronix Desk so users running Frappe/ERPNext v16 can opt into the visual character of the v15 Desk without downgrading the framework or replacing v16 business logic.

## Scope

The profile will reproduce the v15 look across the authenticated Desk and login experience while preserving v16 behavior, APIs, accessibility, permissions, and upgrade compatibility. The work covers:

- global colors, typography, spacing, borders, radii, and shadows;
- navbar, workspace sidebar, breadcrumbs, page heads, and action controls;
- workspace shortcuts, cards, number cards, charts, and dashboard surfaces;
- forms, tabs, fields, controls, grids, lists, reports, filters, and pagination;
- dialogs, dropdowns, popovers, menus, notifications, and command surfaces;
- login and public authentication surfaces;
- light and dark modes, compact/comfortable density, and responsive layouts;
- Theme Studio profile discovery, selection, preview, persistence, and assignment.

The profile will not copy v15 server logic, replace v16 templates wholesale, or remove any existing Solvronix profile.

## Reference Sources

During implementation, shallow clones of the official Frappe v15 and ERPNext v15 branches will be created in a temporary reference directory. Frappe is the primary source for Desk structure and styling; ERPNext supplies application-specific workspace and component references.

The clones are read-only implementation references. They will not be committed, vendored, or retained after verification. The repository must be clean of both clones at handoff.

## Architecture

### Built-in profile

Add a stable `builtin-erpnext-v15` entry to the existing built-in profile registry. Its configuration will use the current validated Theme Studio schema so it works with existing profile resolution, user/role/company assignment, scheduling, boot payloads, import/export boundaries, and preview tooling.

### Profile activation marker

Expose the resolved profile identifier as a stable document-level marker, for example `data-theme-profile="builtin-erpnext-v15"`. The marker must update when the active profile changes without requiring an asset rebuild. Existing profiles will continue through their current path.

### Scoped compatibility styles

Implement v15-specific styles under the activation marker. Rules will target the existing v16 DOM and Solvronix component surfaces; they will not globally replace Frappe v16 assets. Shared visual values should be expressed as profile tokens, while structural differences should live in a focused v15 compatibility stylesheet or an equivalently isolated section of the theme renderer.

### Minimal behavior adaptation

Use JavaScript only where CSS and existing profile settings cannot reproduce a visible v15 interaction. Any adaptation must be gated by the v15 profile marker, reversible when another profile is selected, and must not override v16 permissions, routing, data fetching, or document lifecycle behavior.

## Visual Fidelity Rules

The implementation will derive exact values and selectors from the checked-out v15 references rather than relying on memory. Fidelity is evaluated by surface and state, including hover, focus, active, disabled, selected, loading, empty, error, and mobile states.

When v15 structure conflicts with v16 functionality, v16 functionality wins and the closest safe v15 presentation is used. Accessibility requirements also take priority over pixel matching; focus visibility, readable contrast, reduced motion, keyboard navigation, and touch targets must remain usable.

## Data and Control Flow

1. Theme Studio or assignment logic selects `builtin-erpnext-v15`.
2. Existing server-side profile resolution returns the profile and its validated configuration.
3. Boot/runtime profile application sets tokens and the document-level profile marker.
4. Scoped v15 styles restyle the current v16 UI.
5. Optional gated behavior adapters reconcile only the remaining presentation differences.
6. Switching profiles removes the marker-specific effects and restores the newly selected profile without a rebuild.

## Compatibility and Failure Handling

- Missing or changed v16 selectors must fail visually and locally, never block Desk boot.
- A missing profile identifier falls back through the existing published/default configuration path.
- Runtime adapters must tolerate absent DOM nodes and repeated page navigation.
- Cache-version changes must follow the repository's existing asset versioning convention.
- No v15 source file or generated build artifact may be required at runtime.

## Verification

Automated coverage will verify:

- registration and completeness of the new built-in profile;
- profile validation and WCAG checks used by existing built-ins;
- activation-marker application, update, and removal;
- v15 stylesheet scoping and representative component/state coverage;
- Theme Studio discovery, preview, and persistence wiring;
- absence of regressions in existing Python and JavaScript test suites.

Manual/static comparison will cover desktop, tablet, and mobile representations of the main Desk, workspace, form, list/report, dialog/dropdown, and login surfaces in light and dark modes. If a runnable browser environment is unavailable, this limitation will be reported explicitly rather than claiming pixel-perfect runtime verification.

## Repository Hygiene and Delivery

- Temporary Frappe/ERPNext v15 clones will be deleted after reference extraction and verification.
- No source clone, temporary artifact, cache, or generated screenshot will be committed.
- Existing user changes will be preserved.
- No commit and no push will be performed.
- The handoff will include verification results, known fidelity limitations, changed-file links, and a suggested commit message.

## Acceptance Criteria

1. `ERPNext v15` appears as a selectable built-in Theme Studio profile on v16.
2. Selecting it applies a recognizably faithful v15 presentation across all in-scope surfaces without changing v16 application behavior.
3. Switching away cleanly restores the selected non-v15 profile.
4. Existing profiles and assignments continue to work.
5. Relevant automated tests pass, with any environment-bound test gap disclosed.
6. Temporary v15 clones are absent from the repository at handoff.
7. Nothing is committed or pushed; a commit message is suggested instead.
