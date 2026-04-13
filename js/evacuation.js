// js/evacuation.js
// Evacuation center markers with real-time status, capacity, and resource management.
// LGU can update status/capacity/resources directly from the map popup.
// Community users see a read-only at-a-glance summary.

import { db } from "./firebase.js";
import { evacuationLayer } from "./map.js";
import { currentUserRole } from "./incidents.js";

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── CONSTANTS ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:    { label: "Open",    color: "#00C853", pulse: true  },
  limited: { label: "Limited", color: "#FF9800", pulse: false },
  full:    { label: "Full",    color: "#FF5722", pulse: false },
  closed:  { label: "Closed",  color: "#D50000", pulse: false }
};

const RESOURCES = [
  { id: "food",    icon: "🍱", label: "Food"     },
  { id: "water",   icon: "💧", label: "Water"    },
  { id: "medical", icon: "🏥", label: "Medical"  },
  { id: "power",   icon: "⚡", label: "Power"    },
  { id: "shelter", icon: "🏕️", label: "Shelter"  }
];

const RESOURCE_LEVELS = {
  ok:       { label: "OK",       color: "#00C853", bg: "rgba(0,200,83,0.15)",   border: "rgba(0,200,83,0.35)"   },
  low:      { label: "Low",      color: "#FF9800", bg: "rgba(255,152,0,0.15)",  border: "rgba(255,152,0,0.35)"  },
  critical: { label: "Critical", color: "#D50000", bg: "rgba(213,0,0,0.15)",    border: "rgba(213,0,0,0.35)"    }
};

// ── LOAD & RENDER ──────────────────────────────────────────────
export function loadEvacuationCenters() {
  onSnapshot(collection(db, "evacuation_centers"), (snapshot) => {
    evacuationLayer.clearLayers();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id   = docSnap.id;

      const status     = data.status     || "open";
      const cfg        = STATUS_CONFIG[status] || STATUS_CONFIG.open;
      const capacity   = data.capacity   || 0;
      const occupants  = data.occupants  || 0;
      const resources  = data.resources  || {};

      // ── Circle marker — color reflects status ──
      const marker = L.circleMarker([data.lat, data.lng], {
        radius:      9,
        fillColor:   cfg.color,
        color:       "#000",
        weight:      1.5,
        fillOpacity: 0.92
      });

      marker.bindPopup(buildPopup(id, data), {
        maxWidth: 320,
        minWidth: 280,
        className: "evac-popup-wrap"
      });

      // Re-bind popup with fresh data whenever it opens
      // (in case LGU updated another center and this one's data changed)
      marker.on("popupopen", () => {
        marker.setPopupContent(buildPopup(id, data));
      });

      marker.addTo(evacuationLayer);
    });
  });
}

// ── BUILD POPUP ────────────────────────────────────────────────
function buildPopup(id, data) {
  const status    = data.status    || "open";
  const cfg       = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const capacity  = data.capacity  || 0;
  const occupants = data.occupants || 0;
  const resources = data.resources || {};
  const isLgu     = (typeof currentUserRole === "string")
    ? currentUserRole === "lgu"
    : false;

  const fillPct   = capacity > 0 ? Math.min(100, Math.round((occupants / capacity) * 100)) : 0;
  const fillColor = fillPct >= 90 ? "#D50000" : fillPct >= 70 ? "#FF9800" : "#00C853";

  // Last updated
  const updatedStr = data.updatedAt?.toDate
    ? data.updatedAt.toDate().toLocaleString("en-PH", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      })
    : null;

  // Resource badges
  const resourceBadges = RESOURCES.map(r => {
    const level = resources[r.id] || "ok";
    const lvlCfg = RESOURCE_LEVELS[level] || RESOURCE_LEVELS.ok;
    return `
      <div class="evac-resource-badge" style="background:${lvlCfg.bg};border-color:${lvlCfg.border}">
        <span>${r.icon}</span>
        <span class="evac-res-name">${r.label}</span>
        <span class="evac-res-level" style="color:${lvlCfg.color}">${lvlCfg.label}</span>
      </div>`;
  }).join("");

  // ── LGU EDIT FORM ──
  const lguEditPanel = isLgu ? `
    <div class="evac-divider"></div>
    <div class="evac-edit-section">
      <div class="evac-edit-title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        LGU Update
      </div>

      <div class="evac-field-label">Center Status</div>
      <div class="evac-status-btns" id="evac-status-${id}">
        ${Object.entries(STATUS_CONFIG).map(([key, val]) => `
          <button class="evac-status-btn ${status === key ? "active" : ""}"
            data-evac-id="${id}" data-status="${key}"
            style="--sc:${val.color}">
            ${val.label}
          </button>`).join("")}
      </div>

      <div class="evac-field-label" style="margin-top:10px;">Capacity</div>
      <div class="evac-capacity-row">
        <input type="number" id="evac-cap-${id}" class="evac-num-input"
          placeholder="Max" value="${capacity || ""}" min="0">
        <span class="evac-capacity-slash">/</span>
        <input type="number" id="evac-occ-${id}" class="evac-num-input"
          placeholder="Now" value="${occupants || ""}" min="0">
        <span class="evac-capacity-hint">max / current</span>
      </div>

      <div class="evac-field-label" style="margin-top:10px;">Resources</div>
      <div class="evac-resource-grid" id="evac-res-${id}">
        ${RESOURCES.map(r => {
          const current = resources[r.id] || "ok";
          return `
            <div class="evac-res-row">
              <span class="evac-res-icon">${r.icon}</span>
              <span class="evac-res-label">${r.label}</span>
              <div class="evac-res-levels">
                ${Object.entries(RESOURCE_LEVELS).map(([lvlKey, lvlVal]) => `
                  <button class="evac-level-btn ${current === lvlKey ? "active" : ""}"
                    data-evac-id="${id}" data-res="${r.id}" data-level="${lvlKey}"
                    style="--lc:${lvlVal.color};--lb:${lvlVal.bg};--lbr:${lvlVal.border}">
                    ${lvlVal.label}
                  </button>`).join("")}
              </div>
            </div>`;
        }).join("")}
      </div>

      <button class="evac-save-btn" data-evac-id="${id}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        Save Changes
      </button>
    </div>` : "";

  return `
    <div class="evac-popup">
      <div class="evac-popup-header">
        <div class="evac-popup-name">${data.name}</div>
        <div class="evac-status-pill" style="background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44">
          <span class="evac-status-dot" style="background:${cfg.color}"></span>
          ${cfg.label}
        </div>
      </div>

      <div class="evac-info-row">
        <span>📍</span>
        <span>${data.barangay}${data.municipality ? ", " + data.municipality : ""}</span>
      </div>

      ${capacity > 0 ? `
      <div class="evac-capacity-block">
        <div class="evac-capacity-label">
          <span>Capacity</span>
          <span style="color:${fillColor};font-weight:700">${occupants} / ${capacity} people</span>
        </div>
        <div class="evac-capacity-bar-bg">
          <div class="evac-capacity-bar-fill" style="width:${fillPct}%;background:${fillColor}"></div>
        </div>
        <div class="evac-capacity-pct" style="color:${fillColor}">${fillPct}% occupied</div>
      </div>` : ""}

      <div class="evac-resources-label">Resources</div>
      <div class="evac-resource-grid-view">${resourceBadges}</div>

      ${updatedStr ? `<div class="evac-updated">Last updated: ${updatedStr}</div>` : ""}

      <a class="nav-directions-btn"
        href="https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}"
        target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Get Directions
      </a>

      ${lguEditPanel}
    </div>`;
}

// ── EVENT DELEGATION ───────────────────────────────────────────
// All popup interactions (status buttons, level buttons, save) handled here
document.addEventListener("click", async (e) => {

  // ── Status button clicked ──
  const statusBtn = e.target.closest("[data-status][data-evac-id]");
  if (statusBtn) {
    const evacId = statusBtn.dataset.evacId;
    const newStatus = statusBtn.dataset.status;
    // Toggle active class locally for instant feedback
    const container = document.getElementById(`evac-status-${evacId}`);
    if (container) {
      container.querySelectorAll(".evac-status-btn").forEach(b => b.classList.remove("active"));
      statusBtn.classList.add("active");
    }
    return;
  }

  // ── Resource level button clicked ──
  const levelBtn = e.target.closest("[data-res][data-level][data-evac-id]");
  if (levelBtn) {
    const evacId = levelBtn.dataset.evacId;
    const resId  = levelBtn.dataset.res;
    const level  = levelBtn.dataset.level;
    // Toggle active within this resource's row
    const resRow = levelBtn.closest(".evac-res-levels");
    if (resRow) {
      resRow.querySelectorAll(".evac-level-btn").forEach(b => b.classList.remove("active"));
      levelBtn.classList.add("active");
    }
    return;
  }

  // ── Save button clicked ──
  const saveBtn = e.target.closest(".evac-save-btn[data-evac-id]");
  if (saveBtn) {
    const evacId = saveBtn.dataset.evacId;
    await saveEvacUpdate(evacId, saveBtn);
  }
});

// ── SAVE TO FIRESTORE ──────────────────────────────────────────
async function saveEvacUpdate(evacId, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Saving…"; }

  try {
    // Read selected status
    const statusContainer = document.getElementById(`evac-status-${evacId}`);
    const activeStatusBtn = statusContainer?.querySelector(".evac-status-btn.active");
    const newStatus = activeStatusBtn?.dataset.status || "open";

    // Read capacity inputs
    const capInput = document.getElementById(`evac-cap-${evacId}`);
    const occInput = document.getElementById(`evac-occ-${evacId}`);
    const capacity  = parseInt(capInput?.value)  || 0;
    const occupants = parseInt(occInput?.value)  || 0;

    // Read resource levels
    const resContainer = document.getElementById(`evac-res-${evacId}`);
    const resources = {};
    if (resContainer) {
      resContainer.querySelectorAll(".evac-level-btn.active").forEach(btn => {
        resources[btn.dataset.res] = btn.dataset.level;
      });
    }

    // Fill in any resources that weren't explicitly set
    RESOURCES.forEach(r => {
      if (!resources[r.id]) resources[r.id] = "ok";
    });

    await updateDoc(doc(db, "evacuation_centers", evacId), {
      status:     newStatus,
      capacity,
      occupants,
      resources,
      updatedAt:  serverTimestamp()
    });

    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Saved!`;
      setTimeout(() => {
        btnEl.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Changes`;
        btnEl.disabled = false;
      }, 2000);
    }

  } catch (err) {
    console.error("saveEvacUpdate:", err);
    alert("Failed to save. Please try again.");
    if (btnEl) {
      btnEl.disabled  = false;
      btnEl.textContent = "Save Changes";
    }
  }
}