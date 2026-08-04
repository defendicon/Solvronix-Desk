const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const runtimePath = path.join(root, "solvronix_desk", "public", "js", "theme_runtime.js");
const loginPath = path.join(root, "solvronix_desk", "public", "js", "login_theme.js");
const apiPath = path.join(root, "solvronix_desk", "api.py");
const studioPath = path.join(
  root, "solvronix_desk", "solvronix_desk", "page", "theme_studio", "theme_studio.js"
);

function loadThemeRuntime(activeProfile) {
  const attributes = {};
  const documentEvents = {};
  const windowEvents = {};
  const documentElement = {
    setAttribute(name, value) { attributes[name] = String(value); },
    removeAttribute(name) { delete attributes[name]; },
  };
  const document = {
    readyState: "loading",
    documentElement,
    body: {},
    addEventListener(name, callback) { documentEvents[name] = callback; },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const frappe = {
    boot: {
      st_theme_config: {},
      st_theme_flags: {},
      st_theme_profiles: [],
      st_chart_schema: {},
      st_active_theme_profile: activeProfile,
    },
    get_route() { return []; },
    call() {},
  };
  const window = {
    document,
    frappe,
    addEventListener(name, callback) { windowEvents[name] = callback; },
  };
  const context = {
    console,
    document,
    frappe,
    window,
    MutationObserver: class MutationObserver {
      constructor(callback) { this.callback = callback; }
      observe() {}
    },
    setInterval() { return 1; },
    clearInterval() {},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(runtimePath, "utf8"), context, { filename: runtimePath });
  documentEvents.DOMContentLoaded();
  return {
    attributes,
    refresh(payload) {
      windowEvents["st-theme-runtime-refresh"]({ detail: payload });
    },
  };
}

test("Desk runtime applies, updates, and clears the resolved profile marker", () => {
  const runtime = loadThemeRuntime("builtin-erpnext-v15");
  assert.equal(runtime.attributes["data-st-theme-profile"], "builtin-erpnext-v15");

  runtime.refresh({ active_profile: "builtin-light", config: {} });
  assert.equal(runtime.attributes["data-st-theme-profile"], "builtin-light");

  runtime.refresh({ active_profile: "", config: {} });
  assert.equal(runtime.attributes["data-st-theme-profile"], undefined);
});

test("public branding and login runtime carry the resolved profile marker", () => {
  const api = fs.readFileSync(apiPath, "utf8");
  const login = fs.readFileSync(loginPath, "utf8");

  assert.match(api, /"active_profile":\s*theme_engine\.resolve_profile_id\(/);
  assert.match(login, /function applyProfileMarker\(profileId\)/);
  assert.match(login, /applyProfileMarker\(branding\.active_profile\)/);
});

test("Theme Studio publish refresh carries the newly selected profile", () => {
  const studio = fs.readFileSync(studioPath, "utf8");
  assert.match(
    studio,
    /st-theme-runtime-refresh[\s\S]{0,500}active_profile:\s*self\.active_profile/
  );
});
