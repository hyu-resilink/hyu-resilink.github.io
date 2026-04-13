// js/heritage.js
import { db } from "./firebase.js";
import { compressImage } from "./utils.js";
import { heritageLayer } from "./map.js";
import { currentUserRole } from "./incidents.js";

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── CONSTANTS ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  intact: {
    label: "Intact",
    color: "#9c5fe6",
    bg:    "rgba(156,95,230,0.15)",
    border:"rgba(156,95,230,0.35)"
  },
  damaged: {
    label: "Damaged",
    color: "#e65f8a",
    bg:    "rgba(230,95,138,0.15)",
    border:"rgba(230,95,138,0.35)"
  },
  under_restoration: {
    label: "Under Restoration",
    color: "#7c82d4",
    bg:    "rgba(124,130,212,0.15)",
    border:"rgba(124,130,212,0.35)"
  }
};

const RISK_CONFIG = {
  low: {
    label: "Low",
    color: "#5db88a",
    bg:    "rgba(93,184,138,0.15)",
    border:"rgba(93,184,138,0.35)"
  },
  moderate: {
    label: "Moderate",
    color: "#d4a054",
    bg:    "rgba(212,160,84,0.15)",
    border:"rgba(212,160,84,0.35)"
  },
  high: {
    label: "High",
    color: "#f4845f",
    bg:    "rgba(244,132,95,0.15)",
    border:"rgba(244,132,95,0.35)"
  },
  critical: {
    label: "Critical",
    color: "#e05252",
    bg:    "rgba(224,82,82,0.15)",
    border:"rgba(224,82,82,0.35)"
  }
};

// ── STATE ──────────────────────────────────────────────────────
let currentSiteId      = null;
let currentSiteName    = null;
let reportsUnsubscribe = null;

// ── LOAD HERITAGE SITES ────────────────────────────────────────
export function loadHeritageSites() {
  onSnapshot(collection(db, "heritage_sites"), (snapshot) => {
    heritageLayer.clearLayers();

    snapshot.forEach((docSnap) => {
      const data   = docSnap.data();
      const id     = docSnap.id;
      const status = data.status || "intact";
      const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.intact;

      const marker = L.circleMarker([data.lat, data.lng], {
        radius:      8,
        fillColor:   cfg.color,
        color:       "#000",
        weight:      1,
        fillOpacity: 0.9
      });

      marker.bindPopup(buildHoverPopup(data));
      marker.on("mouseover", function () { this.openPopup(); });
      marker.on("mouseout",  function () { this.closePopup(); });
      marker.on("click", function (e) {
        L.DomEvent.stopPropagation(e);
        openHeritagePanel(id, data);
      });

      marker.addTo(heritageLayer);
    });
  });
}

// ── HOVER POPUP (lightweight — click opens full panel) ─────────
function buildHoverPopup(data) {
  const status  = data.status || "intact";
  const risk    = data.risk_level || "low";
  const sCfg    = STATUS_CONFIG[status]  || STATUS_CONFIG.intact;
  const rCfg    = RISK_CONFIG[risk]      || RISK_CONFIG.low;
  const imgHTML = data.base64
    ? `<img src="${data.base64}" class="heritage-popup-image">`
    : "";
  const dateStr = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleString("en-PH", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })
    : null;

  return `
    <div class="heritage-popup">
      <div class="heritage-title">${data.name}</div>
      ${imgHTML}
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;">
        <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--mono);background:${sCfg.bg};color:${sCfg.color};border:1px solid ${sCfg.border}">
          ${sCfg.label}
        </span>
        <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--mono);background:${rCfg.bg};color:${rCfg.color};border:1px solid ${rCfg.border}">
          ⚠ ${rCfg.label} Risk
        </span>
      </div>
      ${dateStr ? `<div class="popup-timestamp">🕐 ${dateStr}</div>` : ""}
      <div style="margin-top:8px;font-size:11px;color:#5c7490;">
        Click marker to view details &amp; reports
      </div>
      ${data.updatedAt?.toDate ? `<div style="font-size:10px;color:#5c7490;font-family:var(--mono);margin-top:4px;">Updated ${data.updatedAt.toDate().toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>` : ""}
      <a class="nav-directions-btn"
        href="https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}"
        target="_blank" rel="noopener noreferrer"
        style="margin-top:8px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Get Directions
      </a>
    </div>`;
}

// ── OPEN HERITAGE PANEL ────────────────────────────────────────
function openHeritagePanel(siteId, data) {
  currentSiteId   = siteId;
  currentSiteName = data.name;

  const status = data.status     || "intact";
  const risk   = data.risk_level || "low";
  const sCfg   = STATUS_CONFIG[status]  || STATUS_CONFIG.intact;
  const rCfg   = RISK_CONFIG[risk]      || RISK_CONFIG.low;

  // Header
  document.getElementById("heritagePanelTitle").textContent = data.name;

  // Status badge
  const statusBadge = document.getElementById("heritagePanelStatus");
  statusBadge.textContent = sCfg.label;
  statusBadge.style.background = sCfg.bg;
  statusBadge.style.color      = sCfg.color;
  statusBadge.style.border     = `1px solid ${sCfg.border}`;

  // Risk badge
  const riskBadge = document.getElementById("heritagePanelRisk");
  riskBadge.textContent = `⚠ ${rCfg.label} Risk`;
  riskBadge.style.background = rCfg.bg;
  riskBadge.style.color      = rCfg.color;
  riskBadge.style.border     = `1px solid ${rCfg.border}`;

  // Damage notes
  const notesEl = document.getElementById("heritageDamageNotes");
  if (notesEl) {
    notesEl.textContent = data.damage_notes || "";
    notesEl.style.display = data.damage_notes ? "block" : "none";
  }

  // Last updated
  const updatedEl = document.getElementById("heritageLastUpdated");
  if (updatedEl) {
    if (data.updatedAt?.toDate) {
      updatedEl.textContent = "Updated " + data.updatedAt.toDate().toLocaleString("en-PH", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
      updatedEl.style.display = "block";
    } else {
      updatedEl.style.display = "none";
    }
  }

  // ── LGU edit section ──
  const isLgu = (typeof currentUserRole === "string") && currentUserRole === "lgu";
  const editSection = document.getElementById("heritageEditSection");
  if (editSection) {
    editSection.style.display = isLgu ? "block" : "none";

    if (isLgu) {
      // Pre-select current status buttons
      document.querySelectorAll(".hs-status-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.status === status);
      });
      // Pre-select current risk buttons
      document.querySelectorAll(".hs-risk-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.risk === risk);
      });
      // Pre-fill damage notes input
      const notesInput = document.getElementById("hsDamageNotesInput");
      if (notesInput) notesInput.value = data.damage_notes || "";
    }
  }

  // Reset report form
  document.getElementById("heritageObservation").value          = "";
  document.getElementById("heritageImageFile").value            = "";
  document.getElementById("heritageImagePreview").style.display = "none";
  document.getElementById("heritageImagePreview").src           = "";
  resetSubmitBtn();

  document.getElementById("heritagePanel").classList.add("open");
  loadHeritageReports(siteId);
}

// ── LOAD REPORTS (REAL-TIME) ───────────────────────────────────
function loadHeritageReports(siteId) {
  if (reportsUnsubscribe) {
    reportsUnsubscribe();
    reportsUnsubscribe = null;
  }

  const container = document.getElementById("heritageReportsList");
  container.innerHTML = `<div class="hr-loading">Loading reports…</div>`;

  const q = query(
    collection(db, "site_reports"),
    where("siteId", "==", siteId),
    orderBy("createdAt", "desc")
  );

  reportsUnsubscribe = onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="hr-empty">
          <span>📋</span>
          <p>No reports yet for this site.<br>Be the first to submit one!</p>
        </div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const r    = docSnap.data();
      const date = r.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "Just now";

      const card = document.createElement("div");
      card.className = "hr-card";
      card.innerHTML = `
        ${r.imageBase64 ? `<img src="${r.imageBase64}" class="hr-card-img" loading="lazy">` : ""}
        <p class="hr-card-obs">${r.observation}</p>
        <span class="hr-card-date">🕐 ${date}</span>
      `;
      container.appendChild(card);
    });
  });
}

// ── LGU STATUS / RISK BUTTON WIRING ───────────────────────────
document.addEventListener("click", (e) => {
  // Status buttons
  const statusBtn = e.target.closest(".hs-status-btn");
  if (statusBtn) {
    document.querySelectorAll(".hs-status-btn").forEach(b => b.classList.remove("active"));
    statusBtn.classList.add("active");
    return;
  }
  // Risk buttons
  const riskBtn = e.target.closest(".hs-risk-btn");
  if (riskBtn) {
    document.querySelectorAll(".hs-risk-btn").forEach(b => b.classList.remove("active"));
    riskBtn.classList.add("active");
  }
});

// ── SAVE HERITAGE STATUS ───────────────────────────────────────
const saveHeritageBtn = document.getElementById("saveHeritageStatus");
if (saveHeritageBtn) {
  saveHeritageBtn.addEventListener("click", async () => {
    if (!currentSiteId) return;

    const activeStatus = document.querySelector(".hs-status-btn.active")?.dataset.status;
    const activeRisk   = document.querySelector(".hs-risk-btn.active")?.dataset.risk;
    const notes        = document.getElementById("hsDamageNotesInput")?.value.trim() || "";

    if (!activeStatus || !activeRisk) {
      alert("Please select both a status and a risk level.");
      return;
    }

    saveHeritageBtn.disabled    = true;
    saveHeritageBtn.textContent = "Saving…";

    try {
      await updateDoc(doc(db, "heritage_sites", currentSiteId), {
        status:       activeStatus,
        risk_level:   activeRisk,
        damage_notes: notes,
        updatedAt:    serverTimestamp()
      });

      // Update badge colors live in the panel header
      const sCfg = STATUS_CONFIG[activeStatus];
      const rCfg = RISK_CONFIG[activeRisk];

      const statusBadge = document.getElementById("heritagePanelStatus");
      statusBadge.textContent      = sCfg.label;
      statusBadge.style.background = sCfg.bg;
      statusBadge.style.color      = sCfg.color;
      statusBadge.style.border     = `1px solid ${sCfg.border}`;

      const riskBadge = document.getElementById("heritagePanelRisk");
      riskBadge.textContent      = `⚠ ${rCfg.label} Risk`;
      riskBadge.style.background = rCfg.bg;
      riskBadge.style.color      = rCfg.color;
      riskBadge.style.border     = `1px solid ${rCfg.border}`;

      // Update damage notes display
      const notesEl = document.getElementById("heritageDamageNotes");
      if (notesEl) {
        notesEl.textContent   = notes;
        notesEl.style.display = notes ? "block" : "none";
      }

      saveHeritageBtn.textContent = "✓ Saved!";
      setTimeout(() => {
        saveHeritageBtn.disabled    = false;
        saveHeritageBtn.textContent = "Save Status";
      }, 2000);

    } catch (err) {
      console.error("saveHeritageStatus:", err);
      alert("Failed to save. Please try again.");
      saveHeritageBtn.disabled    = false;
      saveHeritageBtn.textContent = "Save Status";
    }
  });
}

// ── IMAGE PREVIEW ──────────────────────────────────────────────
const heritageImageInput = document.getElementById("heritageImageFile");
if (heritageImageInput) {
  heritageImageInput.addEventListener("change", (e) => {
    const file    = e.target.files[0];
    const preview = document.getElementById("heritageImagePreview");
    if (!file) { preview.style.display = "none"; preview.src = ""; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { preview.src = ev.target.result; preview.style.display = "block"; };
    reader.readAsDataURL(file);
  });
}

// ── SUBMIT COMMUNITY REPORT ────────────────────────────────────
const submitHeritageBtn = document.getElementById("submitHeritageReport");
if (submitHeritageBtn) {
  submitHeritageBtn.addEventListener("click", async () => {
    const observation = document.getElementById("heritageObservation").value.trim();
    if (!observation) { alert("Please write an observation before submitting."); return; }
    if (!currentSiteId) return;

    submitHeritageBtn.disabled    = true;
    submitHeritageBtn.textContent = "Submitting…";

    try {
      let imageBase64 = null;
      const file = document.getElementById("heritageImageFile").files[0];
      if (file) imageBase64 = await compressImage(file);

      await addDoc(collection(db, "site_reports"), {
        siteId:      currentSiteId,
        siteName:    currentSiteName,
        observation,
        imageBase64: imageBase64 || null,
        createdAt:   new Date()
      });

      document.getElementById("heritageObservation").value          = "";
      document.getElementById("heritageImageFile").value            = "";
      document.getElementById("heritageImagePreview").style.display = "none";
      document.getElementById("heritageImagePreview").src           = "";

      submitHeritageBtn.textContent = "✓ Submitted!";
      setTimeout(resetSubmitBtn, 2000);

    } catch (err) {
      console.error("Heritage report submit:", err);
      alert("Failed to submit. Please try again.");
      resetSubmitBtn();
    }
  });
}

// ── CLOSE PANEL ────────────────────────────────────────────────
const closeHeritageBtn = document.getElementById("closeHeritagePanel");
if (closeHeritageBtn) {
  closeHeritageBtn.addEventListener("click", () => {
    document.getElementById("heritagePanel").classList.remove("open");
    if (reportsUnsubscribe) { reportsUnsubscribe(); reportsUnsubscribe = null; }
    currentSiteId   = null;
    currentSiteName = null;
  });
}

// ── HELPERS ────────────────────────────────────────────────────
function resetSubmitBtn() {
  if (!submitHeritageBtn) return;
  submitHeritageBtn.disabled    = false;
  submitHeritageBtn.textContent = "Submit Report";
}