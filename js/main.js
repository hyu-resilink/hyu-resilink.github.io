// js/main.js
import "./firebase.js";
import "./map.js";
import "./incidents.js";
import "./auth.js";       // auth.js handles: setSidebarUser + initAnnouncements
import { loadHeritageSites }     from "./heritage.js";
import { loadEvacuationCenters } from "./evacuation.js";
import { initSidebar }           from "./sidebar.js";
import { initGuides }            from "./guides.js";

loadHeritageSites();
loadEvacuationCenters();
initSidebar();
initGuides();