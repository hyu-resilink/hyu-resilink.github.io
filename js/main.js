// js/main.js
// ─────────────────────────────────────────────────────────────
// App entry point. Imports firebase.js first so the Firebase app
// and Firestore persistence are initialized before anything else runs.
// auth.js handles: onAuthStateChanged → setSidebarUser + initAnnouncements
// ─────────────────────────────────────────────────────────────

import "./firebase.js";          // ← must be first: initializes app + persistence
import "./map.js";
import "./incidents.js";
import "./auth.js";
import { loadHeritageSites }     from "./heritage.js";
import { loadEvacuationCenters } from "./evacuation.js";
import { initSidebar }           from "./sidebar.js";
import { initGuides }            from "./guides.js";

loadHeritageSites();
loadEvacuationCenters();
initSidebar();
initGuides();