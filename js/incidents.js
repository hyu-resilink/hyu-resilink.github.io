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
  increment as fsIncrement
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export let currentUserRole = null;

export function setUserRole(role) {
  currentUserRole = (role || "community").toLowerCase();
}

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

// ── TRUST HELPERS ──────────────────────────────────────────────
function buildVerificationBanner(data) {
  if (data.verified === true) {
    return `<div class="trust-banner trust-verified">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>LGU Verified Report</div>`;
  }
  if (data.flagged === true) {
    const count = data.flagCount || 1;
    return `<div class="trust-banner trust-flagged">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>Flagged as Possibly False (${count} report${count > 1 ? "s" : ""})</div>`;
  }
  return "";
}

function buildTrustActions(docId, data) {
  const isLgu           = currentUserRole === "lgu";
  const alreadyFlagged  = data.flagged   === true;
  const alreadyVerified = data.verified  === true;

  if (isLgu) {
    return `<div class="trust-actions">
      ${!alreadyVerified
        ? `<button class="trust-btn trust-verify-btn" data-action="verify" data-id="${docId}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Verify</button>`
        : `<button class="trust-btn trust-unverify-btn" data-action="unverify" data-id="${docId}">Unverify</button>`}
      ${!alreadyFlagged
        ? `<button class="trust-btn trust-dismiss-btn" data-action="flag-lgu" data-id="${docId}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>False Alert</button>`
        : `<button class="trust-btn trust-unflag-btn" data-action="unflag" data-id="${docId}">Remove Flag</button>`}
    </div>`;
  }

  return `<div class="trust-actions">
    <button class="trust-btn trust-flag-btn ${alreadyFlagged ? "already-flagged" : ""}"
      data-action="flag-community" data-id="${docId}" ${alreadyFlagged ? "disabled" : ""}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      ${alreadyFlagged ? "Already Flagged" : "Flag as False Alert"}
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

      const markerIcon = data.status === "resolved" ? grayIcon
        : data.source === "lgu" ? blueIcon : orangeIcon;

      const imageHTML   = data.imageBase64 ? `<img src="${data.imageBase64}" class="popup-image">` : "";
      const statusBadge = data.status === "active"
        ? '<span class="badge badge-active">Active</span>'
        : '<span class="badge badge-resolved">Resolved</span>';
      const sourceBadge = data.source === "lgu"
        ? '<span class="badge badge-lgu">LGU</span>'
        : '<span class="badge badge-community">Community</span>';
      const categoryBadge = data.category
        ? `<span class="badge badge-category">${CATEGORY_ICONS[data.category] || "📋"} ${data.category}</span>`
        : "";
      const dateStr = data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleString("en-PH", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" })
        : null;
      const timestampHTML = dateStr ? `<div class="popup-timestamp">🕐 ${dateStr}</div>` : "";

      // LGU actions
      let actionButtons = "";
      if (currentUserRole === "lgu") {
        if (data.status === "active") {
          actionButtons += `<button class="popup-btn" data-action="resolve" data-id="${id}">Mark as Resolved</button>`;
        }
        actionButtons += `
          <div style="display:flex;gap:6px;margin-top:4px;">
            <button class="popup-edit-btn" data-action="edit" data-id="${id}"
              data-title="${(data.title||"").replace(/"/g,"&quot;")}"
              data-desc="${(data.description||"").replace(/"/g,"&quot;")}"
              data-cat="${data.category||""}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>Edit
            </button>
            <button class="popup-delete" data-action="delete" data-id="${id}" style="flex:1;">Delete</button>
          </div>
          <div class="popup-edit-form" id="edit-form-${id}" style="display:none;margin-top:10px;">
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
            <input class="popup-edit-input" id="edit-title-${id}" type="text" placeholder="Title…" maxlength="120">
            <textarea class="popup-edit-textarea" id="edit-desc-${id}" placeholder="Description…" rows="3"></textarea>
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button class="popup-btn" data-action="save-edit" data-id="${id}" style="flex:1;">Save</button>
              <button class="popup-edit-cancel" data-action="cancel-edit" data-id="${id}">Cancel</button>
            </div>
          </div>`;
      }

      const popupContent = `
        <div class="incident-popup ${data.flagged && !data.verified ? "popup-flagged" : ""} ${data.verified ? "popup-verified" : ""}">
          ${buildVerificationBanner(data)}
          <div class="incident-title">${data.title}</div>
          ${imageHTML}
          <div class="incident-description">${data.description}</div>
          <div style="margin-bottom:6px;">${categoryBadge}</div>
          <div>${sourceBadge} ${statusBadge}</div>
          ${timestampHTML}
          <a class="nav-directions-btn"
            href="https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}"
            target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

  if      (action === "resolve")        await resolveIncident(id);
  else if (action === "delete")         await deleteIncident(id, btn);
  else if (action === "verify")         await setVerification(id, true);
  else if (action === "unverify")       await setVerification(id, false);
  else if (action === "flag-lgu")       await setFlag(id, true, true);
  else if (action === "flag-community") await setFlag(id, true, false);
  else if (action === "unflag")         await setFlag(id, false, true);
  else if (action === "edit")           openEditForm(id, btn);
  else if (action === "cancel-edit")    closeEditForm(id);
  else if (action === "save-edit")      await saveEditForm(id, btn);
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
    await setDoc(doc(db, "archived_incidents", id), { ...snap.data(), archivedAt: new Date() });
    await deleteDoc(ref);
  } catch (err) {
    console.error("deleteIncident:", err);
    alert("Failed to delete. Please try again.");
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = "Delete"; }
  }
}

// ── VERIFY ─────────────────────────────────────────────────────
async function setVerification(id, isVerified) {
  try {
    await updateDoc(doc(db, "incidents", id), {
      verified: isVerified,
      ...(isVerified ? { flagged: false, flagCount: 0 } : {})
    });
  } catch (err) { console.error("setVerification:", err); alert("Failed. Please try again."); }
}

// ── FLAG ───────────────────────────────────────────────────────
async function setFlag(id, isFlagged, isLgu) {
  try {
    if (!isFlagged) {
      await updateDoc(doc(db, "incidents", id), { flagged: false, flagCount: 0 });
    } else if (isLgu) {
      await updateDoc(doc(db, "incidents", id), { flagged: true, flagCount: fsIncrement(1), verified: false });
    } else {
      const ref  = doc(db, "incidents", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const newCount = (snap.data().flagCount || 0) + 1;
      await updateDoc(ref, { flagCount: newCount, flagged: newCount >= 3 });
    }
  } catch (err) { console.error("setFlag:", err); alert("Failed to flag. Please try again."); }
}

// ── EDIT ───────────────────────────────────────────────────────
function openEditForm(id, editBtn) {
  const form = document.getElementById(`edit-form-${id}`);
  if (!form) return;
  const titleInput = document.getElementById(`edit-title-${id}`);
  const descInput  = document.getElementById(`edit-desc-${id}`);
  const catSelect  = document.getElementById(`edit-cat-${id}`);
  if (titleInput) titleInput.value = editBtn.dataset.title || "";
  if (descInput)  descInput.value  = editBtn.dataset.desc  || "";
  if (catSelect)  catSelect.value  = editBtn.dataset.cat   || "";
  form.style.display    = "block";
  editBtn.style.display = "none";
  if (titleInput) titleInput.focus();
}

function closeEditForm(id) {
  const form    = document.getElementById(`edit-form-${id}`);
  if (form) form.style.display = "none";
  const editBtn = document.querySelector(`[data-action="edit"][data-id="${id}"]`);
  if (editBtn) editBtn.style.display = "flex";
}

async function saveEditForm(id, saveBtn) {
  const titleInput = document.getElementById(`edit-title-${id}`);
  const descInput  = document.getElementById(`edit-desc-${id}`);
  const catSelect  = document.getElementById(`edit-cat-${id}`);
  const newTitle   = titleInput?.value.trim();
  const newDesc    = descInput?.value.trim();
  const newCat     = catSelect?.value;
  if (!newTitle || !newDesc) { alert("Title and description cannot be empty."); return; }
  const origText = saveBtn?.textContent;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }
  try {
    await updateDoc(doc(db, "incidents", id), { title: newTitle, description: newDesc, category: newCat, editedAt: new Date() });
    if (saveBtn) { saveBtn.textContent = "✓ Saved!"; setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = origText; }, 1500); }
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
    gpsBtn.disabled = true;
    gpsBtn.innerHTML = `<svg class="gps-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Locating…`;
    requestGpsLocation(
      (lat, lng, accuracy) => {
        placeMarkerAt(lat, lng, "📍 Your GPS Location");
        const accEl = document.getElementById("gpsAccuracy");
        if (accEl) {
          const m = Math.round(accuracy);
          if (accuracy > 500) {
            accEl.textContent = "⚠️ Low accuracy (±" + (m >= 1000 ? (m/1000).toFixed(0)+"km" : m+"m") + ") — click the map for a precise location";
            accEl.classList.add("gps-error");
          } else {
            accEl.textContent = "✓ ±" + m + "m accuracy";
            accEl.classList.remove("gps-error");
          }
          accEl.style.display = "block";
        }
        gpsBtn.disabled = false;
        gpsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>GPS Located ✓`;
        gpsBtn.classList.add("gps-success");
        setTimeout(() => {
          gpsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Use My Location`;
          gpsBtn.classList.remove("gps-success");
        }, 3000);
      },
      (errorMessage) => {
        const accEl = document.getElementById("gpsAccuracy");
        if (accEl) { accEl.textContent = errorMessage; accEl.style.display = "block"; accEl.classList.add("gps-error"); }
        gpsBtn.disabled = false;
        gpsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Use My Location`;
      }
    );
  });
}

// ── SUBMIT REPORT ──────────────────────────────────────────────
const submitBtn = document.getElementById("submitIncident");
if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    const { lat, lng } = getSelectedLocation();
    if (lat === null || lng === null) { alert("Please click the map or use GPS to set a location."); return; }
    const category    = document.getElementById("reportCategory").value;
    const title       = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    if (!category)              { alert("Please select a report type."); return; }
    if (!title || !description) { alert("Please fill in the title and description."); return; }
    submitBtn.disabled = true; submitBtn.textContent = "Submitting…";
    try {
      let imageBase64 = null;
      const file = document.getElementById("imageFile").files[0];
      if (file) imageBase64 = await compressImage(file);
      await addDoc(collection(db, "incidents"), {
        category, title, description,
        latitude: lat, longitude: lng,
        status: "active", source: currentUserRole,
        imageBase64: imageBase64 || null, createdAt: new Date()
      });
      document.getElementById("formPanel").style.display = "none";
      document.getElementById("reportCategory").value    = "";
      document.getElementById("title").value             = "";
      document.getElementById("description").value       = "";
      document.getElementById("imageFile").value         = "";
      const accEl = document.getElementById("gpsAccuracy");
      if (accEl) { accEl.style.display = "none"; accEl.textContent = ""; accEl.classList.remove("gps-error"); }
      clearTempMarker(); clearAccuracyCircle();
    } catch (err) { console.error("submitIncident:", err); alert("Failed to submit. Please try again."); }
    finally { submitBtn.disabled = false; submitBtn.textContent = "Submit"; }
  });
}

// ── CANCEL ─────────────────────────────────────────────────────
const cancelBtn = document.getElementById("cancelIncident");
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    document.getElementById("formPanel").style.display = "none";
    document.getElementById("reportCategory").value    = "";
    document.getElementById("title").value             = "";
    document.getElementById("description").value       = "";
    const accEl = document.getElementById("gpsAccuracy");
    if (accEl) { accEl.style.display = "none"; accEl.textContent = ""; accEl.classList.remove("gps-error"); }
    clearTempMarker(); clearAccuracyCircle();
  });
}