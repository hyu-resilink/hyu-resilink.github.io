// js/announcements.js
// ─────────────────────────────────────────────────────────────
// Announcements with offline support.
//
// Online:  subscribes to Firestore real-time listener AND
//          caches each snapshot to IndexedDB (per user UID).
// Offline: loads announcements from IndexedDB cache.
//          LGU delete/post buttons are hidden offline.
// Sync:    syncAnnouncements() re-subscribes when coming back online.
// ─────────────────────────────────────────────────────────────

import { db, auth } from "./firebase.js";
import { escapeHtml } from "./utils.js";
import {
  isOnline,
  saveAnnouncementsCache,
  loadAnnouncementsCache,
} from "./offline.js"; 
import {
  collection, addDoc, deleteDoc,
  doc, onSnapshot, query, orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUserRole  = null;
let currentUserId    = null;
let _unsubscribe     = null; // Firestore listener teardown

// ── INIT ────────────────────────────────────────────────────────
/**
 * Called from auth.js after the user is authenticated.
 * @param {string} role - 'lgu' | 'community' | 'sysadmin'
 * @param {string} uid  - Firebase UID (used as IndexedDB key)
 */
export function initAnnouncements(role, uid) {
  currentUserRole = (role || "community").toLowerCase();
  currentUserId   = uid || null;

  // Show/hide the LGU post form
  const form = document.getElementById("announcementFormWrap");
  if (form) {
    form.style.display = currentUserRole === "lgu" ? "block" : "none";
  }

  if (isOnline()) {
    _subscribeAnnouncements();
  } else {
    _loadOfflineAnnouncements();
  }

  _wireAnnouncementForm();
}

// ── SYNC (called by auth.js when coming back online) ───────────
export function syncAnnouncements() {
  // Tear down any stale listener first
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _subscribeAnnouncements();
}

// ── REAL-TIME LISTENER (online) ────────────────────────────────
function _subscribeAnnouncements() {
  const container = document.getElementById("announcementsList");
  const empty     = document.getElementById("announcementsEmpty");
  if (!container) return;

  const q = query(
    collection(db, "announcements"),
    orderBy("createdAt", "desc")
  );

  _unsubscribe = onSnapshot(q, async (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      if (empty) {
        empty.innerHTML = `<span>📢</span><p>No announcements yet.</p>`;
        empty.style.display = "block";
      }
      // Clear old cache so offline also shows empty
      if (currentUserId) await saveAnnouncementsCache(currentUserId, []);
      return;
    }

    if (empty) empty.style.display = "none";

    // Collect items + build cards
    const cacheItems = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      container.appendChild(_buildCard(docSnap.id, data));

      // Serialize Firestore Timestamp → ISO string for IndexedDB
      cacheItems.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : null,
      });
    });

    // Save snapshot to IndexedDB so this user can see it offline later
    if (currentUserId) {
      await saveAnnouncementsCache(currentUserId, cacheItems);
    }

  }, (err) => {
    console.error("[announcements] listener error:", err);
    container.innerHTML = `<div class="ann-error">Failed to load announcements.</div>`;
  });
}

// ── OFFLINE LOADER ─────────────────────────────────────────────
async function _loadOfflineAnnouncements() {
  const container = document.getElementById("announcementsList");
  const empty     = document.getElementById("announcementsEmpty");
  if (!container) return;

  // Guest offline (no UID) — cannot show announcements
  if (!currentUserId) {
    container.innerHTML = "";
    if (empty) {
      empty.innerHTML = `
        <span>📴</span>
        <p>Announcements are not available offline.<br>
           Log in while online so your announcements get saved for offline viewing.</p>`;
      empty.style.display = "block";
    }
    return;
  }

  container.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      Loading cached announcements…
    </div>`;

  const items = await loadAnnouncementsCache(currentUserId);

  container.innerHTML = "";

  if (!items || items.length === 0) {
    if (empty) {
      empty.innerHTML = `
        <span>📴</span>
        <p>No cached announcements found.<br>
           Connect to the internet to load the latest announcements.</p>`;
      empty.style.display = "block";
    }
    return;
  }

  if (empty) empty.style.display = "none";

  // Offline badge at the top of the list
  const badge = document.createElement("div");
  badge.style.cssText = `
    display:flex;align-items:center;gap:8px;
    padding:8px 14px;border-radius:9px;margin-bottom:14px;
    background:rgba(212,160,84,0.08);
    border:1px solid rgba(212,160,84,0.22);
    color:#e8be7a;font-size:11.5px;font-weight:600;
    font-family:'DM Mono',monospace;`;
  badge.textContent = "📴  Cached announcements — connect to see latest";
  container.appendChild(badge);

  // Rebuild cards from cached data
  // Timestamps are stored as ISO strings; reconstruct a toDate()-compatible object
  items.forEach((item) => {
    const data = {
      ...item,
      createdAt: item.createdAt
        ? { toDate: () => new Date(item.createdAt) }
        : null,
    };
    container.appendChild(_buildCard(item.id, data));
  });
}

// ── BUILD ANNOUNCEMENT CARD ────────────────────────────────────
function _buildCard(id, data) {
  const card = document.createElement("div");
  card.className = `ann-card ann-priority-${data.priority || "normal"}`;

  const date = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleString("en-PH", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "Just now";

  const priorityLabel = {
    critical: "🔴 Critical",
    warning:  "🟡 Advisory",
    normal:   "🔵 Info",
    green:    "🟢 All Clear",
  }[data.priority || "normal"] || "🔵 Info";

  // Delete button only shown to LGU users who are online
  const showDelete = currentUserRole === "lgu" && isOnline();

  card.innerHTML = `
    <div class="ann-card-header">
      <span class="ann-priority-badge ann-priority-${data.priority || "normal"}">${priorityLabel}</span>
      <span class="ann-date">${date}</span>
    </div>
    <h3 class="ann-title">${escapeHtml(data.title)}</h3>
    <p class="ann-body">${escapeHtml(data.body)}</p>
    ${data.postedBy ? `<div class="ann-footer">Posted by <strong>${escapeHtml(data.postedBy)}</strong></div>` : ""}
    ${showDelete ? `
      <button class="ann-delete-btn" data-id="${id}" title="Delete announcement">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>` : ""}
  `;

  if (showDelete) {
    card.querySelector(".ann-delete-btn").addEventListener("click", () => {
      _deleteAnnouncement(id, card);
    });
  }

  return card;
}

// ── DELETE ─────────────────────────────────────────────────────
async function _deleteAnnouncement(id, cardEl) {
  if (!confirm("Delete this announcement?")) return;
  try {
    cardEl.style.opacity       = "0.4";
    cardEl.style.pointerEvents = "none";
    await deleteDoc(doc(db, "announcements", id));
  } catch (err) {
    console.error("[announcements] delete:", err);
    alert("Failed to delete. Please try again.");
    cardEl.style.opacity       = "";
    cardEl.style.pointerEvents = "";
  }
}

// ── POST FORM ──────────────────────────────────────────────────
function _wireAnnouncementForm() {
  const submitBtn = document.getElementById("submitAnnouncement");
  if (!submitBtn || submitBtn.dataset.wired) return;
  submitBtn.dataset.wired = "true";

  submitBtn.addEventListener("click", async () => {
    if (!isOnline()) {
      alert("You need to be online to post announcements.");
      return;
    }

    const title    = document.getElementById("annTitle").value.trim();
    const body     = document.getElementById("annBody").value.trim();
    const priority = document.getElementById("annPriority").value;

    if (!title || !body) {
      alert("Please fill in both the title and message.");
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = "Posting…";

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "announcements"), {
        title,
        body,
        priority,
        postedBy:  user?.displayName || user?.email?.split("@")[0] || "LGU",
        createdAt: new Date(),
      });

      document.getElementById("annTitle").value    = "";
      document.getElementById("annBody").value     = "";
      document.getElementById("annPriority").value = "normal";

      submitBtn.textContent = "✓ Posted!";
      setTimeout(() => {
        submitBtn.disabled    = false;
        submitBtn.textContent = "Post Announcement";
      }, 2000);

    } catch (err) {
      console.error("[announcements] post:", err);
      alert("Failed to post. Please try again.");
      submitBtn.disabled    = false;
      submitBtn.textContent = "Post Announcement";
    }
  });
}