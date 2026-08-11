/* =============================================================================
   Solvronix Desk — route isolation
   Keeps the global Desk theme out of independently themed full-screen apps.
   ============================================================================= */
(function () {
  "use strict";

  var ST = (window.solvronix_desk = window.solvronix_desk || {});
  var EXCLUDED_PAGE_ROUTES = { posapp: true };
  var STYLE_SELECTOR =
    'link[rel~="stylesheet"][href*="/assets/solvronix_desk/css/"], style#st-dynamic-theme';
  var originalMedia = new Map();

  function currentRoute() {
    try {
      var route = window.frappe && frappe.get_route ? frappe.get_route() : [];
      if (Array.isArray(route) && route.length) return String(route[0] || "").toLowerCase();
    } catch (e) {}

    var path = String((window.location && window.location.pathname) || "").toLowerCase();
    var match = path.match(/^\/(?:app|desk)\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function isRouteExcluded() {
    return EXCLUDED_PAGE_ROUTES[currentRoute()] === true;
  }

  function isThemeStyle(element) {
    if (!element || !element.tagName) return false;
    if (element.tagName.toLowerCase() === "style") return element.id === "st-dynamic-theme";
    return element.tagName.toLowerCase() === "link" &&
      String(element.rel || "").toLowerCase().split(/\s+/).indexOf("stylesheet") !== -1 &&
      String(element.href || "").indexOf("/assets/solvronix_desk/css/") !== -1;
  }

  function suspendStyle(element) {
    if (!isThemeStyle(element)) return;
    if (!originalMedia.has(element)) originalMedia.set(element, element.getAttribute("media"));
    element.setAttribute("media", "not all");
  }

  function restoreStyle(element) {
    if (!originalMedia.has(element)) return;
    var media = originalMedia.get(element);
    if (media === null) element.removeAttribute("media");
    else element.setAttribute("media", media);
    originalMedia.delete(element);
  }

  function themeStyles(root) {
    if (!root || !root.querySelectorAll) return [];
    return Array.prototype.slice.call(root.querySelectorAll(STYLE_SELECTOR));
  }

  function sync() {
    var excluded = isRouteExcluded();
    var html = document.documentElement;
    if (excluded) html.setAttribute("data-st-theme-suspended", "1");
    else html.removeAttribute("data-st-theme-suspended");

    themeStyles(document).forEach(excluded ? suspendStyle : restoreStyle);
    document.dispatchEvent(new CustomEvent("st:route-isolation-change", {
      detail: { excluded: excluded, route: currentRoute() }
    }));
    return excluded;
  }

  ST.isRouteExcluded = isRouteExcluded;
  ST.routeGuard = { sync: sync, suspendStyle: suspendStyle };

  var guardStyle = document.getElementById("st-route-guard-style") || document.createElement("style");
  guardStyle.id = "st-route-guard-style";
  guardStyle.textContent = [
    'html[data-st-theme-suspended="1"] #st-top-toolbar',
    'html[data-st-theme-suspended="1"] #st-icon-rail',
    'html[data-st-theme-suspended="1"] #st-module-switcher',
    'html[data-st-theme-suspended="1"] #st-options-panel',
    'html[data-st-theme-suspended="1"] .st-cp-overlay',
    'html[data-st-theme-suspended="1"] .st-notification-panel',
    '{display:none!important}'
  ].join(",");
  if (!guardStyle.parentNode) document.head.appendChild(guardStyle);

  var observer = new MutationObserver(function (mutations) {
    if (!isRouteExcluded()) return;
    mutations.forEach(function (mutation) {
      Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
        suspendStyle(node);
        themeStyles(node).forEach(suspendStyle);
      });
    });
  });
  observer.observe(document.head, { childList: true, subtree: true });

  /* These combinations belong to Solvronix's command palette and module
     switcher. Do not let them capture focus inside an excluded application. */
  document.addEventListener("keydown", function (event) {
    if (!isRouteExcluded() || !(event.ctrlKey || event.metaKey)) return;
    var key = String(event.key || "").toLowerCase();
    if (key === "k" || key === "m") event.stopImmediatePropagation();
  }, true);

  function bindRouter() {
    if (window.frappe && frappe.router && frappe.router.on) {
      frappe.router.on("change", sync);
    }
  }

  sync();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindRouter();
      sync();
    });
  } else {
    bindRouter();
  }
  window.addEventListener("popstate", sync);
}());
