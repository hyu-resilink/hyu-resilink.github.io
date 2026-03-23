// js/main.js
import "./firebase.js";
import "./map.js";
import "./incidents.js";
import "./auth.js";       // auth.js handles: setSidebarUser + initAnnouncements
import { loadHeritageSites }     from "./heritage.js";
import { loadEvacuationCenters } from "./evacuation.js";
import { initSidebar }           from "./sidebar.js";
import { initGuides }            from "./guides.js";
import { logError }              from "./utils.js";

// Wrap each module init in try/catch so one failure doesn't break everything
try { loadHeritageSites();     } catch (e) { logError("main:loadHeritageSites", e); }
try { loadEvacuationCenters(); } catch (e) { logError("main:loadEvacuationCenters", e); }
try { initSidebar();           } catch (e) { logError("main:initSidebar", e); }
try { initGuides();            } catch (e) { logError("main:initGuides", e); }

// Global uncaught error handler — catches anything that slips through
window.addEventListener("error", (event) => {
  logError("window:uncaughtError", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  logError("window:unhandledPromise", event.reason);
});