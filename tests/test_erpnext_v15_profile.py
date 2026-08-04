"""Contract coverage for the ERPNext v15 visual profile on the v16 runtime."""

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
V15_CSS = ROOT / "solvronix_desk" / "public" / "css" / "erpnext_v15.css"
STUDIO_CSS = ROOT / "solvronix_desk" / "public" / "css" / "theme_studio.css"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"
README = ROOT / "README.md"
THEME_GUIDE = ROOT / "docs" / "theme-studio.md"


class ERPNextV15ProfileTest(unittest.TestCase):
    def test_v15_styles_are_profile_scoped(self):
        css = V15_CSS.read_text(encoding="utf-8")
        scope = '[data-st-theme-profile="builtin-erpnext-v15"]'
        self.assertIn(f"html{scope}", css)

        without_comments = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
        selector_end_lines = re.findall(
            r"(?m)^\s*(?!@)([^{}\n]+)\s*\{\s*$", without_comments
        )
        for selector in selector_end_lines:
            self.assertIn(scope, selector, f"Unscoped v15 selector group: {selector}")

    def test_v15_styles_cover_primary_surfaces_and_states(self):
        css = V15_CSS.read_text(encoding="utf-8")
        for selector in (
            ".navbar", ".body-sidebar", ".page-head", ".widget",
            ".form-control", ".list-row", ".datatable", ".modal-content",
            ".dropdown-menu", ".for-login", ":hover", ":focus-visible", ":disabled",
        ):
            self.assertIn(selector, css)
        self.assertIn("@media (max-width:", css)
        self.assertIn('html[data-theme="dark"]', css)

    def test_v15_styles_cover_secondary_desk_surfaces(self):
        css = V15_CSS.read_text(encoding="utf-8")
        for selector in (
            ".nav-tabs", ".kanban-column", ".kanban-card", ".fc-unthemed",
            ".timeline-content", ".tree-link", ".toast-message", ".pagination",
            ".filter-box", ".st-cp-modal", "#st-notif-panel",
        ):
            self.assertIn(selector, css)

    def test_v15_preview_styles_use_the_preview_profile_marker(self):
        css = STUDIO_CSS.read_text(encoding="utf-8")
        scope = '.sts-preview-frame[data-st-theme-profile="builtin-erpnext-v15"]'
        for selector in (
            ".sts-preview-nav", ".sts-preview-sidebar", ".sts-block",
            ".sts-form-grid input", ".sts-table-card", ".sts-login-shell",
        ):
            self.assertIn(f"{scope} {selector}", css)

    def test_v15_asset_is_last_in_desk_and_web_cascades(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        asset = '"/assets/solvronix_desk/css/erpnext_v15.css?v=1"'
        self.assertEqual(hooks.count(asset), 2)

        web_block = hooks.split("web_include_css = [", 1)[1].split("]", 1)[0]
        desk_block = hooks.split("app_include_css = [", 1)[1].split("]", 1)[0]
        self.assertLess(web_block.index("login.css"), web_block.index("erpnext_v15.css"))
        self.assertLess(desk_block.index("theme_studio.css"), desk_block.index("erpnext_v15.css"))
        self.assertIn('theme_runtime.js?v=9', hooks)
        self.assertIn('login_theme.js?v=9', hooks)
        self.assertIn('theme_studio.css?v=17', hooks)

    def test_v15_profile_is_documented_as_visual_only(self):
        readme = README.read_text(encoding="utf-8")
        guide = THEME_GUIDE.read_text(encoding="utf-8")
        self.assertIn("ERPNext v15", readme)
        self.assertIn("v16 runtime", readme)
        self.assertIn("ERPNext v15", guide)
        self.assertIn("visual profile", guide.lower())


if __name__ == "__main__":
    unittest.main()
