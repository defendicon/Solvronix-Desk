const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const guardPath = path.join(__dirname, "..", "solvronix_desk", "public", "js", "route_guard.js");

class FakeElement {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.attrs = { ...attrs };
    this.id = attrs.id || "";
    this.rel = attrs.rel || "";
    this.href = attrs.href || "";
    this.parentNode = null;
    this.textContent = "";
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  removeAttribute(name) { delete this.attrs[name]; }
  querySelectorAll() { return []; }
}

function loadGuard(initialRoute = "posapp") {
  const listeners = {};
  const routeListeners = {};
  const appendedToHead = [];
  const html = new FakeElement("html");
  const themeLink = new FakeElement("link", {
    rel: "stylesheet",
    href: "https://example.test/assets/solvronix_desk/css/solvronix_desk.css?v=53",
    media: "screen",
  });
  const styles = [themeLink];
  const head = {
    appendChild(element) { element.parentNode = head; appendedToHead.push(element); return element; },
  };
  const document = {
    readyState: "complete",
    documentElement: html,
    head,
    getElementById() { return null; },
    createElement(tag) { return new FakeElement(tag); },
    querySelectorAll() { return styles; },
    addEventListener(name, callback) { listeners[name] = callback; },
    dispatchEvent() {},
  };
  let route = [initialRoute];
  let observerCallback;
  const frappe = {
    get_route() { return route; },
    router: { on(name, callback) { routeListeners[name] = callback; } },
  };
  class MutationObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
  }
  class CustomEvent {
    constructor(name, options) { this.type = name; this.detail = options.detail; }
  }
  const window = {
    document,
    frappe,
    location: { pathname: `/app/${initialRoute}` },
    addEventListener(name, callback) { listeners[name] = callback; },
  };
  const context = { console, CustomEvent, document, frappe, Map, MutationObserver, window };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(guardPath, "utf8"), context, { filename: guardPath });
  return {
    context,
    html,
    themeLink,
    guardStyle: appendedToHead.find((element) => element.id === "st-route-guard-style"),
    setRoute(nextRoute) {
      route = [nextRoute];
      window.location.pathname = `/app/${nextRoute}`;
      routeListeners.change();
    },
    inject(element) { styles.push(element); observerCallback([{ addedNodes: [element] }]); },
  };
}

test("POS Awesome route suspends Solvronix styles", () => {
  const runtime = loadGuard("posapp");
  assert.equal(runtime.html.getAttribute("data-st-theme-suspended"), "1");
  assert.equal(runtime.themeLink.getAttribute("media"), "not all");
  assert.equal(runtime.context.window.solvronix_desk.isRouteExcluded(), true);
});

test("POS route guard emits valid CSS that hides all Solvronix chrome", () => {
  const runtime = loadGuard("posapp");
  const css = runtime.guardStyle.textContent;
  assert.match(css, /#st-icon-rail/);
  assert.match(css, /#st-user-dropdown/);
  assert.match(css, /#st-options-overlay/);
  assert.match(css, /#st-options-panel/);
  assert.match(css, /#st-module-switcher-dropdown/);
  assert.match(css, /#st-notif-panel/);
  assert.match(css, /\.st-cp-overlay/);
  assert.match(css, /\{display:none!important\}$/);
  assert.doesNotMatch(css, /,\{display/);
});

test("leaving POS restores the exact original stylesheet media", () => {
  const runtime = loadGuard("posapp");
  runtime.setRoute("sales-invoice");
  assert.equal(runtime.html.getAttribute("data-st-theme-suspended"), null);
  assert.equal(runtime.themeLink.getAttribute("media"), "screen");
  assert.equal(runtime.context.window.solvronix_desk.isRouteExcluded(), false);
});

test("dynamic theme CSS injected on POS remains suspended", () => {
  const runtime = loadGuard("posapp");
  const dynamicStyle = new FakeElement("style", { id: "st-dynamic-theme" });
  runtime.inject(dynamicStyle);
  assert.equal(dynamicStyle.getAttribute("media"), "not all");
});
