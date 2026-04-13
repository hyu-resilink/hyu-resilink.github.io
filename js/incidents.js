// js/incidents.js
import { db } from "./firebase.js";
import { compressImage } from "./utils.js";
import {
  map,
  blueIcon,
  grayIcon,
  orangeIcon,
  getSelectedLocation,
  setSelectedLocation,
  clearTempMarker,
  placeMarkerAt,
  requestGpsLocation,
  clearAccuracyCircle,
  incidentLayer
} from "./map.js";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  getDocs,
  Timestamp,
  arrayUnion,
  increment as fsIncrement
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Vercel notify endpoint ─────────────────────────────────────
const NOTIFY_URL = "https://hyu-resilink-github-io.vercel.app/api/notify";

// ── STATE ──────────────────────────────────────────────────────
export let currentUserRole = null;
let currentUserId = null;

export function setUserRole(role) {
  currentUserRole = (role || "community").toLowerCase();
}

// Called from auth.js right after login resolves
export function setCurrentUser(uid) {
  currentUserId = uid;
}

// ── CONSTANTS ──────────────────────────────────────────────────
const RATE_LIMIT_COUNT  = 3;
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes in ms

const CATEGORY_ICONS = {
  "Incident / Hazard":     "⚠️",
  "Evacuation Update":     "🏕️",
  "Relief Goods Location": "📦",
  "Road Blockage":         "🚧",
  "Missing Person":        "🔍",
  "Rescue Needed":         "🆘",
  "Water Source":          "💧",
  "Electricity":           "⚡"
};

// ══════════════════════════════════════════════════════════════
// ANTI-ABUSE — RATE LIMITER
// ══════════════════════════════════════════════════════════════
async function checkRateLimit(uid) {
  try {
    const windowStart = Timestamp.fromDate(new Date(Date.now() - RATE_LIMIT_WINDOW));
    const q    = query(
      collection(db, "incidents"),
      where("userId",    "==", uid),
      where("createdAt", ">=", windowStart)
    );
    const snap = await getDocs(q);
    return snap.size < RATE_LIMIT_COUNT;
  } catch (err) {
    console.warn("checkRateLimit error:", err);
    return true;
  }
}

// ══════════════════════════════════════════════════════════════
// ANTI-ABUSE — TRUST SCORE UPDATER
// ══════════════════════════════════════════════════════════════
async function updateReporterTrust(reporterId, delta) {
  if (!reporterId) return;
  try {
    const userRef  = doc(db, "users", reporterId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const current  = userSnap.data().trustScore ?? 0.5;
    const newScore = Math.min(1.0, Math.max(0.0,
      parseFloat((current + delta).toFixed(3))
    ));
    await updateDoc(userRef, {
      trustScore:   newScore,
      shadowBanned: newScore < 0.2
    });
  } catch (err) {
    console.warn("updateReporterTrust:", err);
  }
}

// ══════════════════════════════════════════════════════════════
// CONFIDENCE SCORE
// ══════════════════════════════════════════════════════════════
function computeConfidence(data) {
  if (data.verified === true) return 0.95;
  if (data.flagged  === true && data.source === "lgu") return 0.05;

  let score = data.reporterTrustScore ?? 0.5;
  score += (data.confirmedBy || []).length * 0.08;
  score -= (data.flaggedBy   || []).length * 0.12;

  return Math.min(0.95, Math.max(0.05, parseFloat(score.toFixed(3))));
}

// ══════════════════════════════════════════════════════════════
// SUBMIT ERROR DISPLAY
// ══════════════════════════════════════════════════════════════
function showSubmitError(message, durationMs = 6000) {
  let el = document.getElementById("submitRateLimitMsg");
  if (!el) {
    el = document.createElement("div");
    el.id = "submitRateLimitMsg";
    el.style.cssText = [
      "display:none",
      "margin-top:10px",
      "padding:10px 13px",
      "border-radius:10px",
      "background:rgba(249,115,22,0.12)",
      "border:1px solid rgba(249,115,22,0.3)",
      "color:#fb923c",
      "font-size:12.5px",
      "font-weight:500",
      "line-height:1.5"
    ].join(";");
    const btn = document.getElementById("submitIncident");
    if (btn?.parentNode) btn.parentNode.insertBefore(el, btn.nextSibling);
  }
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.style.display = "none"; }, durationMs);
}

// ── VERIFICATION BANNER ────────────────────────────────────────
function buildVerificationBanner(data) {
  if (data.verified === true) {
    return `<div class="trust-banner trust-verified">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>LGU Verified Report
    </div>`;
  }
  if (data.flagged === true) {
    const count = data.flagCount || 1;
    return `<div class="trust-banner trust-flagged">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94
          a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9"  x2="12"    y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>Flagged as Possibly False (${count} report${count > 1 ? "s" : ""})
    </div>`;
  }
  return "";
}

// ── CONFIDENCE LABEL ───────────────────────────────────────────
function buildConfidenceLabel(data) {
  if (data.verified) return "";
  if (data.flagged)  return "";

  const c = data.confidenceScore ?? 0.5;
  let text, color, bg;
  if (c >= 0.75) {
    text = "✓ High Confidence";
    color = "#22c55e"; bg = "rgba(34,197,94,0.12)";
  } else if (c >= 0.45) {
    text = "Community Reported";
    color = "#f59e0b"; bg = "rgba(245,158,11,0.10)";
  } else {
    text = "⚠ Under Review";
    color = "#f97316"; bg = "rgba(249,115,22,0.10)";
  }

  return `<div style="display:inline-block;padding:2px 9px;border-radius:20px;
    font-size:10px;font-weight:700;letter-spacing:0.04em;margin:4px 0;
    color:${color};background:${bg};border:1px solid ${color}33;">
    ${text}
  </div>`;
}

// ── TRUST ACTION BUTTONS ───────────────────────────────────────
function buildTrustActions(docId, data) {
  const isLgu = currentUserRole === "lgu";

  if (isLgu) {
    const alreadyVerified = data.verified === true;
    const alreadyFlagged  = data.flagged  === true;
    return `<div class="trust-actions">
      ${!alreadyVerified
        ? `<button class="trust-btn trust-verify-btn"
            data-action="verify" data-id="${docId}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              style="width:11px;height:11px">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>Verify
           </button>`
        : `<button class="trust-btn trust-unverify-btn"
            data-action="unverify" data-id="${docId}">
            Unverify
           </button>`}
      ${!alreadyFlagged
        ? `<button class="trust-btn trust-dismiss-btn"
            data-action="flag-lgu" data-id="${docId}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              style="width:11px;height:11px">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94
                a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>False Alert
           </button>`
        : `<button class="trust-btn trust-unflag-btn"
            data-action="unflag" data-id="${docId}">
            Remove Flag
           </button>`}
    </div>`;
  }

  const flaggedBy   = data.flaggedBy   || [];
  const confirmedBy = data.confirmedBy || [];
  const isOwnReport      = currentUserId && data.userId === currentUserId;
  const alreadyFlagged   = currentUserId && flaggedBy.includes(currentUserId);
  const alreadyConfirmed = currentUserId && confirmedBy.includes(currentUserId);
  const confirmCount = confirmedBy.length;
  const flagCount    = flaggedBy.length;

  if (isOwnReport) {
    return `<div class="trust-actions">
      <span style="font-size:10px;color:#888;padding:4px 0;display:block;">
        Your report
      </span>
    </div>`;
  }

  return `<div class="trust-actions">
    <button class="trust-btn trust-confirm-btn ${alreadyConfirmed ? "already-confirmed" : ""}"
      data-action="confirm-report" data-id="${docId}"
      ${alreadyConfirmed ? "disabled" : ""}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      ${alreadyConfirmed
        ? `Confirmed${confirmCount > 0 ? " ("+confirmCount+")" : ""}`
        : `Confirm${confirmCount   > 0 ? " ("+confirmCount+")" : ""}`}
    </button>
    <button class="trust-btn trust-flag-btn ${alreadyFlagged ? "already-flagged" : ""}"
      data-action="flag-community" data-id="${docId}"
      ${alreadyFlagged ? "disabled" : ""}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
      ${alreadyFlagged
        ? `Flagged${flagCount > 0 ? " ("+flagCount+")" : ""}`
        : "Flag as False"}
    </button>
  </div>`;
}

// ── LOAD INCIDENTS ─────────────────────────────────────────────
export function loadIncidents() {
  onSnapshot(collection(db, "incidents"), (snapshot) => {
    incidentLayer.clearLayers();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id   = docSnap.id;

      const confidence = data.confidenceScore ?? 0.5;
      if (currentUserRole !== "lgu" && confidence < 0.2) return;

      const markerIcon = data.status === "resolved"
        ? grayIcon
        : data.source === "lgu" ? blueIcon : orangeIcon;

      const imageHTML = data.imageBase64
        ? `<img src="${data.imageBase64}" class="popup-image">` : "";

      const statusBadge = data.status === "active"
        ? `<span class="badge badge-active">Active</span>`
        : `<span class="badge badge-resolved">Resolved</span>`;

      const sourceBadge = data.source === "lgu"
        ? `<span class="badge badge-lgu">LGU</span>`
        : `<span class="badge badge-community">Community</span>`;

      const categoryBadge = data.category
        ? `<span class="badge badge-category">
            ${CATEGORY_ICONS[data.category] || "📋"} ${data.category}
           </span>`
        : "";

      const dateStr = data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleString("en-PH", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : null;
      const timestampHTML = dateStr
        ? `<div class="popup-timestamp">🕐 ${dateStr}</div>` : "";

      let actionButtons = "";
      if (currentUserRole === "lgu") {
        if (data.status === "active") {
          actionButtons += `<button class="popup-btn"
            data-action="resolve" data-id="${id}">
            Mark as Resolved
          </button>`;
        }
        actionButtons += `
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="popup-edit-btn" data-action="edit" data-id="${id}"
              data-title="${(data.title       || "").replace(/"/g, "&quot;")}"
              data-desc= "${(data.description || "").replace(/"/g, "&quot;")}"
              data-cat=  "${data.category     || ""}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                style="width:12px;height:12px">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14
                  a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>Edit
            </button>
            <button class="popup-delete" data-action="delete"
              data-id="${id}" style="flex:1;">Delete</button>
          </div>
          <div class="popup-edit-form" id="edit-form-${id}"
            style="display:none;margin-top:10px;">
            <select class="popup-edit-select" id="edit-cat-${id}">
              <option value="Incident / Hazard">⚠️ Incident / Hazard</option>
              <option value="Evacuation Update">🏕️ Evacuation Update</option>
              <option value="Relief Goods Location">📦 Relief Goods Location</option>
              <option value="Road Blockage">🚧 Road Blockage</option>
              <option value="Missing Person">🔍 Missing Person</option>
              <option value="Rescue Needed">🆘 Rescue Needed</option>
              <option value="Water Source">💧 Water Source</option>
              <option value="Electricity">⚡ Electricity</option>
            </select>
            <input class="popup-edit-input" id="edit-title-${id}"
              type="text" placeholder="Title…" maxlength="120">
            <textarea class="popup-edit-textarea" id="edit-desc-${id}"
              placeholder="Description…" rows="3"></textarea>
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button class="popup-btn" data-action="save-edit"
                data-id="${id}" style="flex:1;">Save</button>
              <button class="popup-edit-cancel" data-action="cancel-edit"
                data-id="${id}">Cancel</button>
            </div>
          </div>`;
      }

      const popupContent = `
        <div class="incident-popup
          ${data.flagged && !data.verified ? "popup-flagged" : ""}
          ${data.verified ? "popup-verified" : ""}">
          ${buildVerificationBanner(data)}
          <div class="incident-title">${data.title}</div>
          ${imageHTML}
          <div class="incident-description">${data.description}</div>
          <div style="margin-bottom:6px;">${categoryBadge}</div>
          <div>${sourceBadge} ${statusBadge}</div>
          ${timestampHTML}
          ${buildConfidenceLabel(data)}
          <a class="nav-directions-btn"
            href="https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}"
            target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>Get Directions
          </a>
          ${actionButtons}
          ${buildTrustActions(id, data)}
        </div>`;

      L.marker([data.latitude, data.longitude], { icon: markerIcon })
        .addTo(incidentLayer)
        .bindPopup(popupContent);
    });
  });
}

// ── EVENT DELEGATION ───────────────────────────────────────────
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id     = btn.dataset.id;
  if (!action || !id) return;

  if      (action === "resolve")         await resolveIncident(id);
  else if (action === "delete")          await deleteIncident(id, btn);
  else if (action === "verify")          await setVerification(id, true);
  else if (action === "unverify")        await setVerification(id, false);
  else if (action === "flag-lgu")        await setFlag(id, true,  true);
  else if (action === "flag-community")  await setFlag(id, true,  false);
  else if (action === "unflag")          await setFlag(id, false, true);
  else if (action === "confirm-report")  await confirmReport(id, btn);
  else if (action === "edit")            openEditForm(id, btn);
  else if (action === "cancel-edit")     closeEditForm(id);
  else if (action === "save-edit")       await saveEditForm(id, btn);
});

// ── RESOLVE ────────────────────────────────────────────────────
async function resolveIncident(id) {
  try {
    await updateDoc(doc(db, "incidents", id), { status: "resolved" });
  } catch (err) {
    console.error("resolveIncident:", err);
    alert("Failed to resolve. Please try again.");
  }
}

// ── DELETE + ARCHIVE ───────────────────────────────────────────
async function deleteIncident(id, btnEl) {
  if (!confirm("Delete this report? It will be moved to the archive.")) return;
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = "Deleting…"; }
  try {
    const ref  = doc(db, "incidents", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await setDoc(doc(db, "archived_incidents", id), {
      ...snap.data(), archivedAt: new Date()
    });
    await deleteDoc(ref);
  } catch (err) {
    console.error("deleteIncident:", err);
    alert("Failed to delete. Please try again.");
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Delete"; }
  }
}

// ── VERIFY (LGU) ───────────────────────────────────────────────
async function setVerification(id, isVerified) {
  try {
    const ref  = doc(db, "incidents", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();

    await updateDoc(ref, {
      verified:        isVerified,
      confidenceScore: isVerified
        ? 0.95
        : computeConfidence({ ...data, verified: false }),
      ...(isVerified ? { flagged: false, flagCount: 0 } : {})
    });

    if (isVerified && data.userId) {
      await updateReporterTrust(data.userId, +0.1);
    }
  } catch (err) {
    console.error("setVerification:", err);
    alert("Failed. Please try again.");
  }
}

// ── FLAG ───────────────────────────────────────────────────────
async function setFlag(id, isFlagged, isLgu) {
  try {
    const ref  = doc(db, "incidents", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();

    if (!isFlagged) {
      await updateDoc(ref, {
        flagged:         false,
        flagCount:       0,
        flaggedBy:       [],
        confidenceScore: computeConfidence({
          ...data, flagged: false, flaggedBy: []
        })
      });

    } else if (isLgu) {
      await updateDoc(ref, {
        flagged:         true,
        flagCount:       fsIncrement(1),
        verified:        false,
        confidenceScore: 0.05
      });
      if (data.userId) await updateReporterTrust(data.userId, -0.15);

    } else {
      if (!currentUserId) return;
      const flaggedBy = data.flaggedBy || [];
      if (flaggedBy.includes(currentUserId)) return;

      const newFlaggedBy = [...flaggedBy, currentUserId];
      const shouldFlag   = newFlaggedBy.length >= 3;
      const newConf      = computeConfidence({
        ...data, flaggedBy: newFlaggedBy, flagged: shouldFlag
      });

      await updateDoc(ref, {
        flaggedBy:       arrayUnion(currentUserId),
        flagCount:       newFlaggedBy.length,
        flagged:         shouldFlag,
        confidenceScore: newConf
      });

      if (shouldFlag && data.userId) {
        await updateReporterTrust(data.userId, -0.05);
      }
    }
  } catch (err) {
    console.error("setFlag:", err);
    alert("Failed to flag. Please try again.");
  }
}

// ── CONFIRM REPORT (community) ─────────────────────────────────
async function confirmReport(id, btnEl) {
  if (!currentUserId) return;
  try {
    const ref  = doc(db, "incidents", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();

    const confirmedBy = data.confirmedBy || [];
    if (confirmedBy.includes(currentUserId)) return;
    if (data.userId === currentUserId)        return;

    const newConfirmedBy = [...confirmedBy, currentUserId];
    const newConf        = computeConfidence({ ...data, confirmedBy: newConfirmedBy });

    await updateDoc(ref, {
      confirmedBy:     arrayUnion(currentUserId),
      confirmCount:    newConfirmedBy.length,
      confidenceScore: newConf
    });

    if (btnEl) {
      btnEl.disabled    = true;
      btnEl.textContent = `✓ Confirmed (${newConfirmedBy.length})`;
    }

    if (data.userId) await updateReporterTrust(data.userId, +0.03);

  } catch (err) {
    console.error("confirmReport:", err);
    alert("Failed to confirm. Please try again.");
  }
}

// ── EDIT ───────────────────────────────────────────────────────
function openEditForm(id, editBtn) {
  const form       = document.getElementById(`edit-form-${id}`);
  const titleInput = document.getElementById(`edit-title-${id}`);
  const descInput  = document.getElementById(`edit-desc-${id}`);
  const catSelect  = document.getElementById(`edit-cat-${id}`);
  if (!form) return;
  if (titleInput) titleInput.value = editBtn.dataset.title || "";
  if (descInput)  descInput.value  = editBtn.dataset.desc  || "";
  if (catSelect)  catSelect.value  = editBtn.dataset.cat   || "";
  form.style.display    = "block";
  editBtn.style.display = "none";
  if (titleInput) titleInput.focus();
}

function closeEditForm(id) {
  const form    = document.getElementById(`edit-form-${id}`);
  const editBtn = document.querySelector(`[data-action="edit"][data-id="${id}"]`);
  if (form)    form.style.display    = "none";
  if (editBtn) editBtn.style.display = "flex";
}

async function saveEditForm(id, saveBtn) {
  const titleInput = document.getElementById(`edit-title-${id}`);
  const descInput  = document.getElementById(`edit-desc-${id}`);
  const catSelect  = document.getElementById(`edit-cat-${id}`);
  const newTitle   = titleInput?.value.trim();
  const newDesc    = descInput?.value.trim();
  const newCat     = catSelect?.value;

  if (!newTitle || !newDesc) {
    alert("Title and description cannot be empty."); return;
  }

  const origText = saveBtn?.textContent;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

  try {
    await updateDoc(doc(db, "incidents", id), {
      title: newTitle, description: newDesc,
      category: newCat, editedAt: new Date()
    });
    if (saveBtn) {
      saveBtn.textContent = "✓ Saved!";
      setTimeout(() => {
        saveBtn.disabled    = false;
        saveBtn.textContent = origText;
      }, 1500);
    }
    closeEditForm(id);
  } catch (err) {
    console.error("saveEditForm:", err);
    alert("Failed to save. Please try again.");
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = origText; }
  }
}

// ── GPS BUTTON ─────────────────────────────────────────────────
const gpsBtn = document.getElementById("gpsLocateBtn");
if (gpsBtn) {
  gpsBtn.addEventListener("click", () => {
    gpsBtn.disabled  = true;
    gpsBtn.innerHTML = `<svg class="gps-spinner" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>Locating…`;

    requestGpsLocation(
      (lat, lng, accuracy) => {
        placeMarkerAt(lat, lng, "📍 Your GPS Location");
        const accEl = document.getElementById("gpsAccuracy");
        if (accEl) {
          const m = Math.round(accuracy);
          if (accuracy > 500) {
            accEl.textContent = "⚠️ Low accuracy (±" +
              (m >= 1000 ? (m / 1000).toFixed(0) + "km" : m + "m") +
              ") — click the map for a precise location";
            accEl.classList.add("gps-error");
          } else {
            accEl.textContent = "✓ ±" + m + "m accuracy";
            accEl.classList.remove("gps-error");
          }
          accEl.style.display = "block";
        }
        gpsBtn.disabled  = false;
        gpsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>GPS Located ✓`;
        gpsBtn.classList.add("gps-success");
        setTimeout(() => {
          gpsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>Use My Location`;
          gpsBtn.classList.remove("gps-success");
        }, 3000);
      },
      (errorMessage) => {
        const accEl = document.getElementById("gpsAccuracy");
        if (accEl) {
          accEl.textContent = errorMessage;
          accEl.style.display = "block";
          accEl.classList.add("gps-error");
        }
        gpsBtn.disabled  = false;
        gpsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>Use My Location`;
      }
    );
  });
}

// ── SUBMIT REPORT ──────────────────────────────────────────────
const submitBtn = document.getElementById("submitIncident");
if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    const { lat, lng } = getSelectedLocation();
    if (lat === null || lng === null) {
      alert("Please click the map or use GPS to set a location."); return;
    }

    const category    = document.getElementById("reportCategory").value;
    const title       = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    if (!category)              { alert("Please select a report type."); return; }
    if (!title || !description) { alert("Please fill in the title and description."); return; }

    submitBtn.disabled    = true;
    submitBtn.textContent = "Submitting…";

    try {
      if (currentUserId) {
        const allowed = await checkRateLimit(currentUserId);
        if (!allowed) {
          showSubmitError(
            "⚠️ You've submitted too many reports recently. Please wait before trying again."
          );
          submitBtn.disabled    = false;
          submitBtn.textContent = "Submit";
          return;
        }
      }

      if (currentUserId) {
        const userSnap = await getDoc(doc(db, "users", currentUserId));
        if (userSnap.exists() && userSnap.data().shadowBanned === true) {
          await new Promise(r => setTimeout(r, 900));
          resetForm();
          submitBtn.disabled    = false;
          submitBtn.textContent = "Submit";
          return;
        }
      }

      let reporterTrustScore = 0.5;
      if (currentUserId) {
        const userSnap = await getDoc(doc(db, "users", currentUserId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          reporterTrustScore = userData.trustScore ?? 0.5;
          if (userData.trustScore === undefined) {
            await updateDoc(doc(db, "users", currentUserId), {
              trustScore:   0.5,
              shadowBanned: false,
              reportCount:  0
            });
          }
        }
      }

      const initialConfidence = Math.min(0.7, 0.3 + reporterTrustScore * 0.4);

      let imageBase64 = null;
      const file = document.getElementById("imageFile").files[0];
      if (file) imageBase64 = await compressImage(file);

      await addDoc(collection(db, "incidents"), {
        category,
        title,
        description,
        latitude:    lat,
        longitude:   lng,
        status:      "active",
        source:      currentUserRole,
        imageBase64: imageBase64 || null,
        createdAt:   new Date(),
        userId:              currentUserId || null,
        reporterTrustScore,
        confidenceScore:     initialConfidence,
        flaggedBy:           [],
        confirmedBy:         [],
        flagCount:           0,
        confirmCount:        0,
        flagged:             false,
        verified:            false
      });

      // ── PUSH NOTIFICATION ──────────────────────────────────
      fetch(NOTIFY_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `📍 New Incident Report`,
          body:  `${category} reported — tap to view on the map.`,
          type:  "incident",
        }),
      }).catch((err) => console.warn("[FCM] notify failed:", err));

      if (currentUserId) {
        await updateDoc(doc(db, "users", currentUserId), {
          reportCount: fsIncrement(1)
        });
      }

      resetForm();

    } catch (err) {
      console.error("submitIncident:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = "Submit";
    }
  });
}

// ── CANCEL ─────────────────────────────────────────────────────
const cancelBtn = document.getElementById("cancelIncident");
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    resetForm();
  });
}

// ── RESET FORM HELPER ──────────────────────────────────────────
function resetForm() {
  const formPanel = document.getElementById("formPanel");
  if (formPanel) formPanel.style.display = "none";

  const category = document.getElementById("reportCategory");
  const title    = document.getElementById("title");
  const desc     = document.getElementById("description");
  const imgFile  = document.getElementById("imageFile");
  if (category) category.value = "";
  if (title)    title.value    = "";
  if (desc)     desc.value     = "";
  if (imgFile)  imgFile.value  = "";

  const accEl = document.getElementById("gpsAccuracy");
  if (accEl) {
    accEl.style.display = "none";
    accEl.textContent   = "";
    accEl.classList.remove("gps-error");
  }

  clearTempMarker();
  clearAccuracyCircle();
}