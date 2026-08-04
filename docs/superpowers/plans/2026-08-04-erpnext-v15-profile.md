# ERPNext v15 Visual Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selectable ERPNext v15 visual profile to Solvronix Desk on Frappe/ERPNext v16 while retaining all v16 behavior.

**Architecture:** Register `builtin-erpnext-v15` in the existing server-side profile engine, carry its resolved identifier through Desk and public-login runtimes, and gate a focused compatibility stylesheet with `data-st-theme-profile`. Theme Studio will carry the same marker on its synthetic preview so selection, preview, runtime switching, and login remain consistent.

**Tech Stack:** Python 3, Frappe v16 hooks/API conventions, vanilla JavaScript, CSS custom properties and attribute selectors, Python `unittest`/`pytest`, Node.js `node:test`.

## Global Constraints

- Frappe/ERPNext v16 functionality, APIs, accessibility, permissions, and upgrade compatibility take priority over pixel matching.
- Official `version-15` Frappe and ERPNext sources are temporary read-only references and must be absent at handoff.
- Do not copy v15 server logic or replace v16 templates wholesale.
- All v15 compatibility behavior must be gated by `builtin-erpnext-v15` and reversible when profiles switch.
- No v15 source or generated artifact may be required at runtime.
- Preserve all existing themes and unrelated user changes.
- Do not commit and do not push; provide one suggested commit message at handoff.

## File Structure

- Modify `solvronix_desk/theme_engine.py`: define the validated built-in v15 profile tokens.
- Modify `solvronix_desk/api.py`: expose the resolved profile identifier to public login branding.
- Modify `solvronix_desk/public/js/theme_runtime.js`: own the Desk document-level profile marker.
- Modify `solvronix_desk/public/js/login_theme.js`: own the public-page profile marker.
- Create `solvronix_desk/public/css/erpnext_v15.css`: contain all profile-scoped Desk and login compatibility rules.
- Modify `solvronix_desk/hooks.py`: load the new stylesheet and bump changed asset cache versions.
- Modify `solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js`: set the selected profile marker on the preview frame.
- Modify `solvronix_desk/public/css/theme_studio.css`: mirror the v15 profile on synthetic preview components where live Desk selectors cannot apply.
- Modify `tests/test_theme_engine.py`: verify profile registration, tokens, contrast, and rendered CSS compatibility.
- Create `tests/erpnext_v15_runtime.test.js`: verify boot, live switching, profile removal, and public-login activation.
- Create `tests/test_erpnext_v15_profile.py`: verify style isolation, representative surface coverage, hooks, cache versions, and preview wiring.
- Modify `README.md` and `docs/theme-studio.md`: document the new profile and safe-fidelity boundary.

---

### Task 1: Capture authoritative v15 references without polluting the repository

**Files:**
- Temporary only: a path returned by PowerShell under the operating-system temporary directory
- Reference: official `frappe/frappe` branch `version-15`
- Reference: official `frappe/erpnext` branch `version-15`

**Interfaces:**
- Consumes: official v15 CSS/SCSS, JS, Vue, HTML, and workspace files.
- Produces: concrete token and selector notes used directly in Tasks 2 and 5; no retained repository file.

- [x] **Step 1: Create an explicit temporary reference directory outside the repository**

```powershell
$v15ReferenceRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("solvronix-v15-reference-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $v15ReferenceRoot | Out-Null
$v15ReferenceRoot
```

Expected: an absolute path under `[System.IO.Path]::GetTempPath()` and not under `C:\Users\am102\Downloads\Solvronix-Desk`.

- [x] **Step 2: Shallow-clone both official v15 branches**

```powershell
git clone --depth 1 --branch version-15 https://github.com/frappe/frappe.git (Join-Path $v15ReferenceRoot "frappe")
git clone --depth 1 --branch version-15 https://github.com/frappe/erpnext.git (Join-Path $v15ReferenceRoot "erpnext")
git -C (Join-Path $v15ReferenceRoot "frappe") rev-parse HEAD
git -C (Join-Path $v15ReferenceRoot "erpnext") rev-parse HEAD
```

Expected: both clones succeed and print immutable commit hashes for the final handoff.

Observed: Frappe `95444a13d13bfaefda943a8597e1de3cf1f2b218`; ERPNext `7098602dccf012a88683da862828899e245e5525`.

- [x] **Step 3: Inventory the authoritative visual sources**

```powershell
rg -n --glob '*.scss' --glob '*.css' --glob '*.html' --glob '*.js' --glob '*.vue' "navbar|layout-side-section|desk-sidebar|widget|page-head|form-control|modal|dropdown|list-row|datatable|login" (Join-Path $v15ReferenceRoot "frappe\frappe")
rg -n --glob '*.json' --glob '*.js' --glob '*.py' "Workspace|Number Card|Dashboard Chart" (Join-Path $v15ReferenceRoot "erpnext\erpnext")
```

Expected: matches identify the v15 Desk, workspace, form, list, overlay, and login source files used to derive exact values.

- [x] **Step 4: Record the temporary path and hashes in the working notes, not in product files**

Use the task plan checkbox state or turn notes to retain the path and two hashes. Do not add clone paths, copied source files, or generated inventories to Git.

### Task 2: Register the validated built-in ERPNext v15 profile

**Files:**
- Modify: `tests/test_theme_engine.py`
- Modify: `solvronix_desk/theme_engine.py`

**Interfaces:**
- Consumes: `_profile(profile_id, name, overrides, description, builtin=True)`.
- Produces: `builtin_profiles()` entry with `id == "builtin-erpnext-v15"` and a complete sanitized `config` mapping.

- [ ] **Step 1: Write the failing profile contract test**

```python
def test_builtin_profiles_include_erpnext_v15_visual_profile(self):
    profiles = {profile["id"]: profile for profile in ENGINE.builtin_profiles()}
    profile = profiles["builtin-erpnext-v15"]
    self.assertEqual(profile["name"], "ERPNext v15")
    self.assertTrue(profile["builtin"])
    self.assertEqual(profile["config"]["preferred_mode"], "Light")
    self.assertEqual(profile["config"]["shadow_style"], "Soft")
    self.assertEqual(profile["config"]["sidebar_mode"], "Expanded")
    self.assertFalse(ENGINE.wcag_failures(profile["config"]))
```

- [ ] **Step 2: Run the focused test and confirm the missing profile failure**

Run: `python -m pytest tests/test_theme_engine.py::ThemeEngineTests::test_builtin_profiles_include_erpnext_v15_visual_profile -q`

Expected: FAIL with `KeyError: 'builtin-erpnext-v15'`.

- [ ] **Step 3: Add the profile beside `builtin-frappe` using values verified from Task 1**

```python
_profile(
    "builtin-erpnext-v15", "ERPNext v15",
    {
        "preferred_mode": "Light",
        "brand_color": "#171717",
        "accent_color": "#171717",
        "navbar_background": "#FFFFFF",
        "toolbar_text_color": "#383838",
        "sidebar_background": "#FFFFFF",
        "sidebar_active_color": "#F3F3F3",
        "sidebar_hover_color": "#F3F3F3",
        "page_background": "#FFFFFF",
        "card_background": "#FFFFFF",
        "text_color": "#383838",
        "muted_text_color": "#525252",
        "border_color": "#EDEDED",
        "primary_button_color": "#171717",
        "focus_color": "#171717",
        "shadow_style": "Soft",
        "sidebar_mode": "Expanded",
        "sidebar_auto_collapse": False,
        "sticky_navbar": True,
        "corner_radius": 8,
        "card_radius": 12,
        "font_family": "Inter",
    },
    "ERPNext v15-inspired Desk presentation on the v16 runtime.",
),
```

These literals come from Frappe v15 `espresso/_colors.scss`, `_borders.scss`, `_typography.scss`, `common/css_variables.scss`, and `desk/variables.scss` at the recorded reference commit.

- [ ] **Step 4: Run the focused and complete engine tests**

Run: `python -m pytest tests/test_theme_engine.py -q`

Expected: all tests PASS, including the built-in WCAG loop.

- [ ] **Step 5: Record a no-commit checkpoint**

Run: `git diff --check && git status --short`

Expected: only the intended test and engine changes plus approved design/plan documentation; do not commit.

### Task 3: Apply and remove the resolved profile marker at runtime

**Files:**
- Create: `tests/erpnext_v15_runtime.test.js`
- Modify: `solvronix_desk/public/js/theme_runtime.js`
- Modify: `solvronix_desk/api.py`
- Modify: `solvronix_desk/public/js/login_theme.js`

**Interfaces:**
- Consumes: `frappe.boot.st_active_theme_profile`, runtime payload `active_profile`, branding JSON `active_profile`.
- Produces: `html[data-st-theme-profile="builtin-erpnext-v15"]` on Desk and public login; empty values remove the attribute.

- [ ] **Step 1: Add failing static/runtime marker tests**

```javascript
test("Desk runtime applies and clears the resolved profile marker", () => {
  const runtime = loadThemeRuntime({ activeProfile: "builtin-erpnext-v15" });
  assert.equal(runtime.attributes["data-st-theme-profile"], "builtin-erpnext-v15");
  runtime.refresh({ active_profile: "builtin-light", config: {} });
  assert.equal(runtime.attributes["data-st-theme-profile"], "builtin-light");
  runtime.refresh({ active_profile: "", config: {} });
  assert.equal(runtime.attributes["data-st-theme-profile"], undefined);
});

test("public login applies the profile returned by branding", async () => {
  const runtime = await loadLoginRuntime({ active_profile: "builtin-erpnext-v15" });
  assert.equal(runtime.attributes["data-st-theme-profile"], "builtin-erpnext-v15");
});
```

- [ ] **Step 2: Run the Node tests and confirm marker assertions fail**

Run: `node --test tests/erpnext_v15_runtime.test.js`

Expected: FAIL because neither runtime sets `data-st-theme-profile`.

- [ ] **Step 3: Add one fail-soft marker helper to the Desk runtime**

```javascript
function applyProfileMarker(profileId) {
  var html = document.documentElement;
  var value = String(profileId || "").trim();
  if (value) html.setAttribute("data-st-theme-profile", value);
  else html.removeAttribute("data-st-theme-profile");
}
```

Call it during initial boot with `frappe.boot.st_active_theme_profile` and in `applyRuntime(runtime)` whenever `active_profile` is present.

- [ ] **Step 4: Include the resolved public profile in branding**

```python
"active_profile": theme_engine.resolve_profile_id(
    s, getattr(frappe.session, "user", None)
),
```

Add this field to `get_branding()` beside `preferred_mode`.

- [ ] **Step 5: Apply the public marker after branding resolves**

```javascript
function applyProfileMarker(profileId) {
  var value = String(profileId || "").trim();
  if (value) document.documentElement.setAttribute("data-st-theme-profile", value);
  else document.documentElement.removeAttribute("data-st-theme-profile");
}
```

Invoke it from the successful branding application path before component normalization.

- [ ] **Step 6: Run runtime and related existing tests**

Run: `node --test tests/erpnext_v15_runtime.test.js tests/dark_mode.test.js`

Expected: all tests PASS.

### Task 4: Make Theme Studio preview selection profile-aware

**Files:**
- Modify: `tests/theme_studio_behavior.test.js`
- Modify: `solvronix_desk/solvronix_desk/page/theme_studio/theme_studio.js`

**Interfaces:**
- Consumes: `this.active_profile` and `this.$preview`.
- Produces: preview-frame attribute `data-st-theme-profile`, synchronized during render, built-in apply, reset, and profile changes.

- [ ] **Step 1: Add a failing preview-marker behavior test**

```javascript
test("profile application scopes the Theme Studio preview", () => {
  const studio = makeStudio();
  studio.active_profile = "builtin-erpnext-v15";
  studio._sync_preview_profile();
  assert.equal(studio.$preview.attributes["data-st-theme-profile"], "builtin-erpnext-v15");
  studio.active_profile = "";
  studio._sync_preview_profile();
  assert.equal(studio.$preview.attributes["data-st-theme-profile"], undefined);
});
```

- [ ] **Step 2: Run the focused behavior suite and verify failure**

Run: `node --test tests/theme_studio_behavior.test.js`

Expected: FAIL because `_sync_preview_profile` does not exist.

- [ ] **Step 3: Implement the preview marker helper**

```javascript
_sync_preview_profile() {
    if (!this.$preview || !this.$preview.length) return;
    if (this.active_profile) {
        this.$preview.attr("data-st-theme-profile", this.active_profile);
    } else {
        this.$preview.removeAttr("data-st-theme-profile");
    }
}
```

Call it from the existing preview refresh path after `this.$preview` exists and after profile/reset state changes.

- [ ] **Step 4: Run the complete Theme Studio behavior suite**

Run: `node --test tests/theme_studio_behavior.test.js`

Expected: all tests PASS.

### Task 5: Build the isolated v15 visual compatibility stylesheet

**Files:**
- Create: `tests/test_erpnext_v15_profile.py`
- Create: `solvronix_desk/public/css/erpnext_v15.css`
- Modify: `solvronix_desk/public/css/theme_studio.css`
- Modify: `solvronix_desk/hooks.py`

**Interfaces:**
- Consumes: `html[data-st-theme-profile="builtin-erpnext-v15"]` and `.sts-preview-frame[data-st-theme-profile="builtin-erpnext-v15"]`.
- Produces: isolated v15 styling for navigation, workspace, forms, data views, overlays, authentication, dark mode, and responsive states.

- [ ] **Step 1: Add failing isolation and surface-coverage tests**

```python
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
V15_CSS = ROOT / "solvronix_desk" / "public" / "css" / "erpnext_v15.css"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"
README = ROOT / "README.md"
THEME_GUIDE = ROOT / "docs" / "theme-studio.md"

def test_v15_styles_are_profile_scoped(self):
    css = V15_CSS.read_text(encoding="utf-8")
    self.assertIn('html[data-st-theme-profile="builtin-erpnext-v15"]', css)
    self.assertNotRegex(css, r'(?m)^\s*(body|\.navbar|\.page-head)\s*\{')

def test_v15_styles_cover_primary_surfaces_and_states(self):
    css = V15_CSS.read_text(encoding="utf-8")
    for selector in (
        ".navbar", ".body-sidebar", ".page-head", ".widget",
        ".form-control", ".list-row", ".datatable", ".modal-content",
        ".dropdown-menu", ".for-login", ':hover', ':focus-visible', ':disabled'
    ):
        self.assertIn(selector, css)
    self.assertIn('@media (max-width:', css)
    self.assertIn('html[data-theme="dark"]', css)

def test_v15_asset_is_loaded_for_desk_and_web(self):
    hooks = HOOKS.read_text(encoding="utf-8")
    self.assertIn('/assets/solvronix_desk/css/erpnext_v15.css?v=1', hooks)
    self.assertGreater(hooks.index('erpnext_v15.css'), hooks.index('theme_studio.css'))
    self.assertGreater(hooks.index('erpnext_v15.css'), hooks.index('login.css'))
```

- [ ] **Step 2: Run focused Python tests and confirm missing-file/asset failures**

Run: `python -m pytest tests/test_erpnext_v15_profile.py -q`

Expected: FAIL because `erpnext_v15.css` and its hook entries do not exist.

- [ ] **Step 3: Create the stylesheet with one reusable scope convention**

```css
html[data-st-theme-profile="builtin-erpnext-v15"] {
  --st-v15-control-height: 28px;
  --st-v15-section-gap: 15px;
  --st-v15-transition: 0.15s ease;
  --st-v15-bg: #ffffff;
  --st-v15-subtle: #f3f3f3;
  --st-v15-border: #ededed;
  --st-v15-text: #383838;
  --st-v15-muted: #525252;
  --st-v15-strong: #171717;
  --st-v15-radius: 8px;
  --st-v15-card-radius: 12px;
  --st-v15-card-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

html[data-st-theme-profile="builtin-erpnext-v15"] .navbar {
  min-height: 48px;
  background: var(--st-v15-bg) !important;
  border-bottom: 1px solid var(--st-v15-border) !important;
  box-shadow: none !important;
}

html[data-st-theme-profile="builtin-erpnext-v15"] .page-head {
  min-height: 60px;
  background: var(--st-v15-bg) !important;
  border-bottom: 1px solid var(--st-v15-border);
  box-shadow: none !important;
}

html[data-st-theme-profile="builtin-erpnext-v15"] .form-control,
html[data-st-theme-profile="builtin-erpnext-v15"] .btn {
  min-height: var(--st-v15-control-height);
  border-radius: var(--st-v15-radius) !important;
  transition: none !important;
}

html[data-st-theme-profile="builtin-erpnext-v15"] .widget,
html[data-st-theme-profile="builtin-erpnext-v15"] .modal-content,
html[data-st-theme-profile="builtin-erpnext-v15"] .dropdown-menu {
  background: var(--st-v15-bg) !important;
  border: 1px solid var(--st-v15-border) !important;
  border-radius: var(--st-v15-card-radius) !important;
  box-shadow: var(--st-v15-card-shadow) !important;
}
```

The file is organized into explicit, separately commented sections for base tokens, navbar/page head, sidebar, workspace/dashboard, forms/grids, lists/reports, overlays/menus, login, interaction states, dark mode, and responsive behavior. Translate the matching declarations from the inventoried v15 files to the current v16 selectors. Every selector group begins with the profile scope; `:has()` is not the only activation mechanism.

- [ ] **Step 4: Add preview-only equivalents to Theme Studio CSS**

```css
.sts-preview-frame[data-st-theme-profile="builtin-erpnext-v15"] .sts-preview-nav,
.sts-preview-frame[data-st-theme-profile="builtin-erpnext-v15"] .sts-preview-sidebar,
.sts-preview-frame[data-st-theme-profile="builtin-erpnext-v15"] .sts-preview-card,
.sts-preview-frame[data-st-theme-profile="builtin-erpnext-v15"] .sts-preview-field {
  border-radius: 8px;
  box-shadow: none;
}
```

The four listed synthetic class names are already emitted by `theme_studio.js`; each added rule remains under the preview marker.

- [ ] **Step 5: Load the new asset last in both Desk and public-web cascades**

```python
web_include_css = [
    "/assets/solvronix_desk/css/login.css?v=12",
    "/assets/solvronix_desk/css/erpnext_v15.css?v=1",
]

app_include_css = [
    # existing entries remain in their current order
    "/assets/solvronix_desk/css/theme_studio.css?v=17",
    "/assets/solvronix_desk/css/erpnext_v15.css?v=1",
]
```

Bump `theme_runtime.js`, `login_theme.js`, and any modified CSS cache versions once, following existing tests that pin versions.

- [ ] **Step 6: Run focused CSS/hook tests and static validation**

Run: `python -m pytest tests/test_erpnext_v15_profile.py tests/test_theme_studio.py -q`

Expected: all tests PASS and every previous pinned cache-version expectation is updated intentionally.

### Task 6: Document profile usage and fidelity boundaries

**Files:**
- Modify: `README.md`
- Modify: `docs/theme-studio.md`
- Modify: `tests/test_erpnext_v15_profile.py`

**Interfaces:**
- Consumes: final profile name and selection route.
- Produces: user-facing instructions and an explicit statement that this is v15 presentation on the v16 runtime.

- [ ] **Step 1: Add a failing documentation contract**

```python
def test_v15_profile_is_documented_as_visual_only(self):
    readme = README.read_text(encoding="utf-8")
    guide = THEME_GUIDE.read_text(encoding="utf-8")
    self.assertIn("ERPNext v15", readme)
    self.assertIn("v16 runtime", readme)
    self.assertIn("ERPNext v15", guide)
    self.assertIn("visual profile", guide.lower())
```

- [ ] **Step 2: Run the documentation test and verify it fails**

Run: `python -m pytest tests/test_erpnext_v15_profile.py::ERPNextV15ProfileTests::test_v15_profile_is_documented_as_visual_only -q`

Expected: FAIL because the new profile is not documented.

- [ ] **Step 3: Add concise usage documentation**

Document that System Managers select `ERPNext v15` in Theme Studio, preview it, and publish/assign it through existing profile tools. State clearly that data models, workflows, permissions, routes, and server behavior remain v16.

- [ ] **Step 4: Run the full focused test file**

Run: `python -m pytest tests/test_erpnext_v15_profile.py -q`

Expected: all tests PASS.

### Task 7: Complete regression verification and remove both clones

**Files:**
- Verify: all changed product, test, and documentation files
- Delete: only the validated absolute temporary directory created in Task 1

**Interfaces:**
- Consumes: completed v15 profile implementation and `$v15ReferenceRoot`.
- Produces: verified clean delivery with no retained v15 clone and no commit/push.

- [ ] **Step 1: Run all Python tests**

Run: `python -m pytest -q`

Expected: all tests PASS.

- [ ] **Step 2: Run all Node test files**

```powershell
Get-ChildItem tests -Filter *.test.js | ForEach-Object { node --test $_.FullName; if ($LASTEXITCODE -ne 0) { throw "Node test failed: $($_.Name)" } }
```

Expected: every Node suite PASS.

- [ ] **Step 3: Check whitespace, source-clone leakage, and worktree scope**

```powershell
git diff --check
git status --short
rg -n --hidden --glob '!.git/**' "solvronix-v15-reference-|frappe\\.git|erpnext\\.git" .
```

Expected: no whitespace errors, only intended repository changes, and no clone-path/reference leakage.

- [ ] **Step 4: Validate the deletion target before removing it**

```powershell
$resolvedReferenceRoot = [System.IO.Path]::GetFullPath($v15ReferenceRoot)
$resolvedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$resolvedWorkspace = [System.IO.Path]::GetFullPath("C:\Users\am102\Downloads\Solvronix-Desk")
if (-not $resolvedReferenceRoot.StartsWith($resolvedTempRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Reference root is outside the temp directory" }
if ($resolvedReferenceRoot.StartsWith($resolvedWorkspace, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Reference root overlaps the workspace" }
if ((Split-Path $resolvedReferenceRoot -Leaf) -notlike "solvronix-v15-reference-*") { throw "Unexpected reference directory name" }
Get-Item -LiteralPath $resolvedReferenceRoot | Select-Object FullName
```

Expected: the exact temporary reference directory is printed and all guards pass.

- [ ] **Step 5: Remove only the validated temporary reference directory**

```powershell
Remove-Item -LiteralPath $resolvedReferenceRoot -Recurse -Force
Test-Path -LiteralPath $resolvedReferenceRoot
```

Expected: `False`.

- [ ] **Step 6: Perform the final verification pass after cleanup**

Run: `python -m pytest -q`, then run every Node test as in Step 2, then `git diff --check` and `git status --short`.

Expected: tests PASS, no whitespace errors, no temporary clone, no commit, and no push.

- [ ] **Step 7: Prepare the handoff without committing**

Report the two reference commit hashes, changed files, test counts/results, any environment-bound visual verification limitation, confirmation that the temporary clones were removed, and the suggested message:

```text
feat(theme): add ERPNext v15 visual profile for v16
```
