// js/sidebar.js
import { db, auth } from "./firebase.js";
import {
  collection, onSnapshot, getDocs,
  query, orderBy, limit, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateProfile }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { map } from "./map.js";
import { compressImage } from "./utils.js";

// ── CACHE ──────────────────────────────────────
let allReportsCache = [];
let _profileData    = {};
let _isMobile       = window.innerWidth <= 768;

// ── INIT ───────────────────────────────────────
export function initSidebar() {
  _isMobile = window.innerWidth <= 768;

  if (_isMobile) {
    document.getElementById("sidebar").style.display       = "none";
    document.getElementById("sidebarOpenBtn").style.display = "none";
    document.getElementById("main-content").style.left     = "0";
    document.getElementById("main-content").style.transition = "none";

    injectMobileHomeSection();
    injectMobileBackButton();
    injectMobileStyles();

    showSection("mobile-home");
  } else {
    wireSidebarToggle();
  }

  wireNavItems();
  wireFilters();
  wireProfilePanel();
}

// ══════════════════════════════════════════════
//  MOBILE HOME SCREEN
// ══════════════════════════════════════════════
function injectMobileHomeSection() {
  const section = document.createElement("section");
  section.id        = "section-mobile-home";
  section.className = "content-section scrollable active";

  section.innerHTML = `
    <div class="mh-wrap">
      <div class="mh-header">
        <div class="mh-brand">
          <div class="mh-brand-icon">🗺️</div>
          <div>
            <div class="mh-brand-name"><strong>Resilink</strong></div>
            <div class="mh-brand-sub">Community Monitoring Platform</div>
          </div>
        </div>
        <div class="live-badge" style="margin:0;">
          <span class="live-dot"></span>LIVE
        </div>
      </div>

      <div class="mh-greeting">
        <div class="mh-greeting-text">Welcome back, <strong id="mhUsername">—</strong></div>
        <div class="mh-role-pill" id="mhRolePill">—</div>
      </div>

      <div class="mh-grid">
        <div class="mh-card" data-goto="map">
          <div class="mh-card-icon" style="background:linear-gradient(135deg,#5ba4c8,#4dcfb0)">🗺️</div>
          <div class="mh-card-label">Map View</div>
          <div class="mh-card-sub">View live incident map</div>
        </div>
        <div class="mh-card" data-goto="logs-all">
          <div class="mh-card-icon" style="background:linear-gradient(135deg,#f4845f,#e05252)">📋</div>
          <div class="mh-card-label">All Reports</div>
          <div class="mh-card-sub">Browse community reports</div>
        </div>
        <div class="mh-card" data-goto="logs-heritage">
          <div class="mh-card-icon" style="background:linear-gradient(135deg,#5db88a,#4dcfb0)">🏛️</div>
          <div class="mh-card-label">Heritage Reports</div>
          <div class="mh-card-sub">Site observation logs</div>
        </div>
        <div class="mh-card" data-goto="announcements">
          <div class="mh-card-icon" style="background:linear-gradient(135deg,#7c82d4,#9c5fe6)">📢</div>
          <div class="mh-card-label">Announcements</div>
          <div class="mh-card-sub">Official LGU notices</div>
        </div>
        <div class="mh-card" data-goto="guides">
          <div class="mh-card-icon" style="background:linear-gradient(135deg,#d4a054,#f4845f)">📚</div>
          <div class="mh-card-label">Survival Guides</div>
          <div class="mh-card-sub">Disaster preparedness</div>
        </div>
        <div class="mh-card lgu-only hidden" id="mhDashCard" data-goto="dashboard">
          <div class="mh-card-icon" style="background:linear-gradient(135deg,#7c82d4,#5ba4c8)">📊</div>
          <div class="mh-card-label">Dashboard</div>
          <div class="mh-card-sub">LGU stats &amp; activity</div>
        </div>
        <div class="mh-card sysadmin-only hidden" id="mhAdminCard" data-goto="admin">
          <div class="mh-card-icon" style="background:linear-gradient(135deg,#e05252,#f4845f)">🛡️</div>
          <div class="mh-card-label">Admin Panel</div>
          <div class="mh-card-sub">Users &amp; system control</div>
        </div>
      </div>

      <div class="mh-profile-row" id="mhProfileRow">
        <div class="user-avatar" id="mhAvatar" style="width:38px;height:38px;font-size:14px;">?</div>
        <div style="flex:1;min-width:0;">
          <div class="user-name" id="mhProfileName" style="max-width:100%;">—</div>
          <div style="font-size:10px;color:#5c7490;">Tap to edit profile</div>
        </div>
        <svg style="width:14px;height:14px;color:#5c7490;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>

      <button class="mh-signout" id="mhSignOut">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </div>
  `;

  section.querySelectorAll(".mh-card").forEach(card => {
    card.addEventListener("click", () => {
      const target = card.dataset.goto;
      if (target === "guides") {
        showSection("map");
        setTimeout(() => document.getElementById("guidesPanel")?.classList.add("open"), 100);
      } else {
        showSection(target);
      }
    });
  });

  section.querySelector("#mhProfileRow").addEventListener("click", openProfilePanel);

  section.querySelector("#mhSignOut").addEventListener("click", async () => {
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    await signOut(auth);
    window.location.href = "login.html";
  });

  document.getElementById("main-content").prepend(section);
}

function injectMobileBackButton() {
  const btn = document.createElement("button");
  btn.id = "mobileBackBtn";
  btn.style.display = "none";
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
    Home
  `;
  btn.addEventListener("click", () => showSection("mobile-home"));
  document.body.appendChild(btn);
}

function injectMobileStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .mh-wrap {
      padding: 20px 16px 40px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .mh-header { display: flex; align-items: center; justify-content: space-between; }
    .mh-brand { display: flex; align-items: center; gap: 10px; }
    .mh-brand-icon {
      width: 38px; height: 38px; border-radius: 10px; font-size: 18px;
      background: linear-gradient(135deg, #5ba4c8, #7c82d4);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(91,164,200,0.28); flex-shrink: 0;
    }
    .mh-brand-name { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 500; color: #e8f0f8; }
    .mh-brand-name strong { font-weight: 700; color: #5ba4c8; }
    .mh-brand-sub { font-size: 10px; color: #5c7490; margin-top: 1px; }
    .mh-greeting {
      background: rgba(91,164,200,0.07); border: 1px solid rgba(91,164,200,0.14);
      border-radius: 13px; padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .mh-greeting-text { font-size: 14px; color: #9aafc4; }
    .mh-greeting-text strong { color: #e0ecfa; font-weight: 700; }
    .mh-role-pill {
      font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 4px 10px; border-radius: 20px; font-family: 'DM Mono', monospace;
      background: rgba(91,164,200,0.12); color: #5ba4c8;
      border: 1px solid rgba(91,164,200,0.22); flex-shrink: 0;
    }
    .mh-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .mh-card {
      background: rgba(21,30,46,0.85); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px; padding: 18px 14px 16px;
      display: flex; flex-direction: column; gap: 8px; cursor: pointer;
      transition: transform 0.15s, border-color 0.2s, background 0.2s;
      -webkit-tap-highlight-color: transparent;
    }
    .mh-card:active { transform: scale(0.96); background: rgba(91,164,200,0.1); border-color: rgba(91,164,200,0.3); }
    .mh-card-icon { width: 44px; height: 44px; border-radius: 12px; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
    .mh-card-label { font-size: 13.5px; font-weight: 700; color: #e0ecfa; font-family: 'Space Grotesk', sans-serif; }
    .mh-card-sub { font-size: 11px; color: #5c7490; line-height: 1.4; }
    .mh-profile-row {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      background: rgba(21,30,46,0.7); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 13px; cursor: pointer; transition: background 0.2s;
      -webkit-tap-highlight-color: transparent;
    }
    .mh-profile-row:active { background: rgba(91,164,200,0.08); }
    .mh-signout {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 13px; border-radius: 12px;
      border: 1px solid rgba(224,82,82,0.22); background: rgba(224,82,82,0.07);
      color: #d98080; font-family: 'DM Sans', sans-serif;
      font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: auto;
    }
    .mh-signout:active { background: rgba(224,82,82,0.16); color: #f08080; }
    #mobileBackBtn {
      position: fixed; top: 10px; left: 10px; z-index: 2000;
      display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px;
      border: 1px solid rgba(91,164,200,0.25); background: rgba(13,20,33,0.92);
      backdrop-filter: blur(12px); color: #5ba4c8; font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      -webkit-tap-highlight-color: transparent;
    }
    #mobileBackBtn:active { background: rgba(91,164,200,0.15); }
    @media (max-width: 768px) {
      .content-section.scrollable { padding-top: 52px !important; }
      #section-mobile-home.content-section.scrollable,
      #section-map.content-section { padding-top: 0 !important; }
    }

    /* ── REPUTATION CARDS ── */
    .rep-cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
    .rep-card { background:rgba(21,30,46,0.8); border:1px solid rgba(255,255,255,0.09); border-radius:13px; padding:16px 18px; display:flex; flex-direction:column; gap:10px; }
    .rep-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
    .rep-card-name  { font-size:13.5px; font-weight:600; color:#c5d5e8; }
    .rep-card-email { font-size:11px; color:#6a85a8; font-family:'DM Mono',monospace; margin-top:2px; }
    .rep-card-row   { display:flex; align-items:center; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px; }
    .rep-card-row:last-of-type { border-bottom:none; }
    .rep-card-row-label { color:#5c7490; }
    .rep-card-row-val   { font-weight:600; font-family:'DM Mono',monospace; font-size:11.5px; }
    .rep-bar-bg   { width:64px; height:5px; border-radius:3px; background:rgba(255,255,255,0.08); flex-shrink:0; }
    .rep-bar-fill { height:5px; border-radius:3px; }
    .rep-score-wrap { display:flex; align-items:center; gap:8px; }
    .rep-num { font-family:'DM Mono',monospace; font-size:11.5px; font-weight:700; min-width:44px; }
    .rep-card-actions { display:flex; gap:6px; margin-top:4px; flex-wrap:wrap; }

    /* ── SHARED SMALL BUTTONS ── */
    .tbl-btn-inner { padding:4px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif; border:1px solid; transition:all 0.18s; flex:1; text-align:center; }
    .tbl-ban-btn     { background:rgba(224,82,82,0.07); border-color:rgba(224,82,82,0.22); color:#d98080; }
    .tbl-ban-btn:hover { background:rgba(224,82,82,0.18); }
    .tbl-restore-btn { background:rgba(93,184,138,0.08); border-color:rgba(93,184,138,0.25); color:#5db88a; }
    .tbl-restore-btn:hover { background:rgba(93,184,138,0.2); }
    .tbl-warn-btn    { background:rgba(212,160,84,0.08); border-color:rgba(212,160,84,0.25); color:#d4a054; }
    .tbl-warn-btn:hover { background:rgba(212,160,84,0.2); }
    .tbl-del-btn     { background:rgba(224,82,82,0.07); border-color:rgba(224,82,82,0.22); color:#d98080; }
    .tbl-del-btn:hover { background:rgba(224,82,82,0.18); }

    /* ── RISK / TRUST BADGES ── */
    .risk-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:10px; font-weight:700; font-family:'DM Mono',monospace; }
    .risk-low  { background:rgba(93,184,138,0.12); color:#5db88a; border:1px solid rgba(93,184,138,0.25); }
    .risk-mid  { background:rgba(212,160,84,0.12); color:#d4a054; border:1px solid rgba(212,160,84,0.25); }
    .risk-high { background:rgba(244,132,95,0.15); color:#f4845f; border:1px solid rgba(244,132,95,0.3); }
    .risk-ban  { background:rgba(224,82,82,0.15);  color:#e05252; border:1px solid rgba(224,82,82,0.3); }
    .trust-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:10px; font-weight:700; font-family:'DM Mono',monospace; }
    .trust-trusted { background:rgba(93,184,138,0.12); color:#5db88a; border:1px solid rgba(93,184,138,0.25); }
    .trust-new     { background:rgba(91,164,200,0.1);  color:#5ba4c8; border:1px solid rgba(91,164,200,0.2); }
    .trust-low-rel { background:rgba(244,132,95,0.12); color:#f4845f; border:1px solid rgba(244,132,95,0.25); }
    .trust-banned  { background:rgba(224,82,82,0.15);  color:#e05252; border:1px solid rgba(224,82,82,0.3); }

    /* ── ENHANCED USER TABLE INLINE BUTTONS ── */
    .admin-ban-btn     { padding:4px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif; background:rgba(224,82,82,0.07); border:1px solid rgba(224,82,82,0.22); color:#d98080; transition:all 0.18s; margin-left:4px; }
    .admin-ban-btn:hover { background:rgba(224,82,82,0.18); }
    .admin-restore-btn { padding:4px 10px; border-radius:7px; cursor:pointer; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif; background:rgba(93,184,138,0.08); border:1px solid rgba(93,184,138,0.25); color:#5db88a; transition:all 0.18s; margin-left:4px; }
    .admin-restore-btn:hover { background:rgba(93,184,138,0.2); }

    /* ── SECTION SEPARATOR ── */
    .rep-sep { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#5c7490; margin:20px 0 14px; display:flex; align-items:center; gap:10px; }
    .rep-sep::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.09); }
  `;
  document.head.appendChild(style);
}

// ── UPDATE MOBILE HOME AFTER AUTH ──────────────
function updateMobileHome(username, role, photoBase64) {
  if (!_isMobile) return;

  const mhUsername = document.getElementById("mhUsername");
  if (mhUsername) mhUsername.textContent = username;

  const mhRolePill = document.getElementById("mhRolePill");
  if (mhRolePill) {
    const label = role === "lgu" ? "LGU Personnel"
      : role === "sysadmin" ? "System Admin"
      : "Community Member";
    mhRolePill.textContent = label;
    mhRolePill.style.background  = role === "lgu" ? "rgba(124,130,212,0.14)"
      : role === "sysadmin" ? "rgba(224,82,82,0.14)"
      : "rgba(91,164,200,0.12)";
    mhRolePill.style.color = role === "lgu" ? "#7c82d4"
      : role === "sysadmin" ? "#f08080"
      : "#5ba4c8";
    mhRolePill.style.borderColor = role === "lgu" ? "rgba(124,130,212,0.28)"
      : role === "sysadmin" ? "rgba(224,82,82,0.28)"
      : "rgba(91,164,200,0.22)";
  }

  const mhProfileName = document.getElementById("mhProfileName");
  if (mhProfileName) mhProfileName.textContent = username;

  const mhAvatar = document.getElementById("mhAvatar");
  if (mhAvatar) {
    if (photoBase64) {
      mhAvatar.style.backgroundImage    = `url(${photoBase64})`;
      mhAvatar.style.backgroundSize     = "cover";
      mhAvatar.style.backgroundPosition = "center";
      mhAvatar.textContent = "";
    } else {
      mhAvatar.style.backgroundImage = "";
      mhAvatar.textContent = username.split(" ").filter(Boolean).slice(0, 2)
        .map(w => w[0].toUpperCase()).join("");
    }
  }

  if (role === "lgu")      document.getElementById("mhDashCard")?.classList.remove("hidden");
  if (role === "sysadmin") document.getElementById("mhAdminCard")?.classList.remove("hidden");
}

// ══════════════════════════════════════════════
//  SECTION SWITCHER
// ══════════════════════════════════════════════
export function showSection(key) {
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item, .sub-item").forEach(n => n.classList.remove("active"));

  const section = document.getElementById(`section-${key}`);
  if (section) section.classList.add("active");

  if (_isMobile) {
    const backBtn = document.getElementById("mobileBackBtn");
    if (backBtn) backBtn.style.display = key === "mobile-home" ? "none" : "flex";
  }

  if (!_isMobile) {
    if (key === "map") {
      document.getElementById("nav-map")?.classList.add("active");
    } else if (key === "logs-all" || key === "logs-heritage") {
      document.getElementById("nav-logs-toggle")?.classList.add("active");
      document.querySelector(`[data-section="${key}"]`)?.classList.add("active");
    } else if (key === "dashboard") {
      document.getElementById("nav-dashboard")?.classList.add("active");
    } else if (key === "announcements") {
      document.getElementById("nav-announcements")?.classList.add("active");
    } else if (key === "admin") {
      document.getElementById("nav-admin")?.classList.add("active");
    }
  }

  if (key === "announcements") {
    const badge = document.getElementById("annUnreadBadge");
    if (badge) badge.classList.add("hidden");
  }

  if (key === "logs-all")      loadAllReports();
  if (key === "logs-heritage") loadHeritageLogs();
  if (key === "dashboard")     loadDashboard();
  if (key === "admin")         loadAdminPanel();
}

// ── SET USER INFO ──────────────────────────────
export function setSidebarUser(user, role, profile = {}) {
  const username = profile.username || user.displayName || user.email?.split("@")[0] || "User";
  const email    = profile.email    || user.email || "—";

  _profileData = { username, email, role, createdAt: profile.createdAt, photoBase64: profile.photoBase64 || null };

  const initials = username.split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("");

  if (!_isMobile) {
    document.getElementById("sidebarUsername").textContent = username;
    document.getElementById("sidebarRole").textContent     = role || "Community";
    applyAvatar(profile.photoBase64 || null, initials);
  }

  if (!profile.photoBase64) {
    document.getElementById("profileAvatarLg").textContent = initials;
  }
  document.getElementById("profileNameLg").textContent   = username;
  document.getElementById("profileUsername").textContent = username;
  document.getElementById("profileEmail").textContent    = email;

  const roleLabelMap = { lgu: "LGU Personnel", community: "Community Member", sysadmin: "System Administrator" };
  const roleLabel    = roleLabelMap[role?.toLowerCase()] || role || "Community Member";
  document.getElementById("profileRole").textContent = roleLabel;

  const pill = document.getElementById("profileRolePill");
  pill.textContent = roleLabel;
  pill.className   = `profile-role-pill ${role?.toLowerCase() === "lgu" ? "lgu" : "community"}`;

  const joined = profile.createdAt?.toDate
    ? profile.createdAt.toDate().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
    : "—";
  document.getElementById("profileJoined").textContent = joined;

  if (role?.toLowerCase() === "lgu") {
    document.querySelectorAll(".lgu-only").forEach(el => el.classList.remove("hidden"));
  }
  if (role?.toLowerCase() === "sysadmin") {
    document.querySelectorAll(".sysadmin-only").forEach(el => el.classList.remove("hidden"));
  }

  updateMobileHome(username, role?.toLowerCase() || "community", profile.photoBase64 || null);
}

// ── SIDEBAR TOGGLE (desktop) ───────────────────
function wireSidebarToggle() {
  document.getElementById("sidebarCollapseBtn")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("collapsed");
    document.getElementById("main-content").classList.add("expanded");
  });
  document.getElementById("sidebarOpenBtn")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("collapsed");
    document.getElementById("main-content").classList.remove("expanded");
  });
}

// ── APPLY AVATAR (desktop sidebar) ────────────
function applyAvatar(photoBase64, initials) {
  const sidebarAv   = document.getElementById("sidebarAvatar");
  const profileAvLg = document.getElementById("profileAvatarLg");

  if (photoBase64) {
    if (sidebarAv) {
      sidebarAv.style.backgroundImage    = `url(${photoBase64})`;
      sidebarAv.style.backgroundSize     = "cover";
      sidebarAv.style.backgroundPosition = "center";
      sidebarAv.textContent = "";
    }
    profileAvLg.style.backgroundImage    = `url(${photoBase64})`;
    profileAvLg.style.backgroundSize     = "cover";
    profileAvLg.style.backgroundPosition = "center";
    profileAvLg.textContent = "";
    document.getElementById("removePhotoBtn")?.style && (document.getElementById("removePhotoBtn").style.display = "block");
  } else {
    if (sidebarAv) { sidebarAv.style.backgroundImage = ""; sidebarAv.textContent = initials; }
    profileAvLg.style.backgroundImage = ""; profileAvLg.textContent = initials;
    document.getElementById("removePhotoBtn")?.style && (document.getElementById("removePhotoBtn").style.display = "none");
  }
}

// ── PROFILE PANEL ──────────────────────────────
function wireProfilePanel() {
  document.getElementById("userInfoBtn")?.addEventListener("click", openProfilePanel);
  document.getElementById("closeProfilePanel")?.addEventListener("click", closeProfilePanel);
  document.getElementById("profileOverlay")?.addEventListener("click", closeProfilePanel);

  document.getElementById("editUsernameBtn")?.addEventListener("click", () => {
    document.getElementById("usernameInput").value =
      document.getElementById("profileUsername").textContent.trim();
    document.getElementById("usernameDisplayRow").style.display = "none";
    document.getElementById("usernameEditRow").classList.add("visible");
    document.getElementById("usernameInput").focus();
    clearUsernameError();
  });

  document.getElementById("cancelUsernameBtn")?.addEventListener("click", cancelUsernameEdit);
  document.getElementById("saveUsernameBtn")?.addEventListener("click", saveUsername);
  document.getElementById("usernameInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); saveUsername(); }
    if (e.key === "Escape") { cancelUsernameEdit(); }
  });

  wirePhotoUpload();
}

function cancelUsernameEdit() {
  document.getElementById("usernameDisplayRow").style.display = "";
  document.getElementById("usernameEditRow").classList.remove("visible");
  clearUsernameError();
}
function clearUsernameError() {
  const err = document.getElementById("usernameEditError");
  if (err) { err.style.display = "none"; err.textContent = ""; }
}
function showUsernameError(msg) {
  const err = document.getElementById("usernameEditError");
  if (err) { err.textContent = msg; err.style.display = "block"; }
}

async function saveUsername() {
  const newName = document.getElementById("usernameInput").value.trim();
  clearUsernameError();
  if (!newName)            { showUsernameError("Username cannot be empty."); return; }
  if (newName.length < 3)  { showUsernameError("Must be at least 3 characters."); return; }
  if (newName.length > 30) { showUsernameError("Must be 30 characters or fewer."); return; }
  if (!/^[a-zA-Z0-9 _'\-\.]+$/.test(newName)) {
    showUsernameError("Only letters, numbers, spaces, apostrophes, and hyphens allowed."); return;
  }
  if (newName === document.getElementById("profileUsername").textContent.trim()) {
    cancelUsernameEdit(); return;
  }

  const saveBtn = document.getElementById("saveUsernameBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated.");

    await updateProfile(user, { displayName: newName });
    await updateDoc(doc(db, "users", user.uid), { username: newName });

    _profileData.username = newName;
    const initials = newName.split(" ").filter(Boolean).slice(0, 2)
      .map(w => w[0].toUpperCase()).join("");

    document.getElementById("profileUsername").textContent = newName;
    document.getElementById("profileNameLg").textContent   = newName;
    document.getElementById("profileAvatarLg").textContent = initials;

    if (!_isMobile) {
      document.getElementById("sidebarUsername").textContent = newName;
      document.getElementById("sidebarAvatar").textContent   = initials;
    } else {
      const mhUN = document.getElementById("mhUsername");
      const mhPN = document.getElementById("mhProfileName");
      const mhAv = document.getElementById("mhAvatar");
      if (mhUN) mhUN.textContent = newName;
      if (mhPN) mhPN.textContent = newName;
      if (mhAv && !_profileData.photoBase64) mhAv.textContent = initials;
    }

    saveBtn.textContent = "✓ Saved!";
    setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = "Save"; cancelUsernameEdit(); }, 1200);

  } catch (err) {
    console.error("saveUsername:", err);
    showUsernameError("Failed to save. Please try again.");
    saveBtn.disabled = false; saveBtn.textContent = "Save";
  }
}

function openProfilePanel() {
  document.getElementById("profilePanel").classList.add("open");
  const overlay = document.getElementById("profileOverlay");
  overlay.style.display = "block";
  requestAnimationFrame(() => overlay.classList.add("open"));
}
function closeProfilePanel() {
  document.getElementById("profilePanel").classList.remove("open");
  const overlay = document.getElementById("profileOverlay");
  overlay.classList.remove("open");
  setTimeout(() => { overlay.style.display = "none"; }, 300);
}

// ── PHOTO UPLOAD ───────────────────────────────
function wirePhotoUpload() {
  const avatarBtn = document.getElementById("profileAvatarLg");
  const fileInput = document.getElementById("avatarFileInput");
  const removeBtn = document.getElementById("removePhotoBtn");
  if (!avatarBtn || !fileInput) return;

  avatarBtn.addEventListener("click", () => fileInput.click());
  const avatarWrap = document.querySelector(".avatar-upload-wrap");
  if (avatarWrap) avatarWrap.addEventListener("click", (e) => {
    if (e.target.closest("#removePhotoBtn")) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showAvatarStatus("Please select an image file.", "error"); return; }
    if (file.size > 5 * 1024 * 1024)     { showAvatarStatus("Image must be under 5MB.", "error"); return; }

    showAvatarStatus("Uploading…", "loading");
    try {
      const compressed = await compressImage(file, 200, 0.82);
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated.");

      await updateDoc(doc(db, "users", user.uid), { photoBase64: compressed });

      const initials = (_profileData.username || "?")
        .split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");

      _profileData.photoBase64 = compressed;
      applyAvatar(compressed, initials);
      updateMobileHome(_profileData.username, _profileData.role, compressed);

      showAvatarStatus("Photo updated!", "success");
      setTimeout(() => showAvatarStatus("", ""), 3000);
    } catch (err) {
      console.error("avatarUpload:", err);
      showAvatarStatus("Failed to upload. Try again.", "error");
    }
    fileInput.value = "";
  });

  if (removeBtn) {
    removeBtn.addEventListener("click", async () => {
      try {
        showAvatarStatus("Removing…", "loading");
        const user = auth.currentUser;
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid), { photoBase64: null });

        const initials = (_profileData.username || "?")
          .split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");

        _profileData.photoBase64 = null;
        applyAvatar(null, initials);
        updateMobileHome(_profileData.username, _profileData.role, null);

        showAvatarStatus("Photo removed.", "success");
        setTimeout(() => showAvatarStatus("", ""), 2500);
      } catch (err) {
        console.error("removePhoto:", err);
        showAvatarStatus("Failed to remove. Try again.", "error");
      }
    });
  }
}

function showAvatarStatus(msg, type) {
  const el = document.getElementById("avatarUploadStatus");
  if (!el) return;
  el.textContent   = msg;
  el.className     = "avatar-upload-status" + (type ? " avatar-status-" + type : "");
  el.style.display = msg ? "block" : "none";
}

// ── NAV WIRING (desktop only) ──────────────────
function wireNavItems() {
  if (_isMobile) return;

  document.querySelectorAll("[data-section]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(el.dataset.section);
    });
  });

  document.getElementById("nav-logs-toggle")?.addEventListener("click", () => {
    document.getElementById("logsSubmenu").classList.toggle("open");
    document.getElementById("logsChevron").classList.toggle("open");
  });

  document.getElementById("nav-guides")?.addEventListener("click", () => {
    document.getElementById("guidesPanel")?.classList.add("open");
  });
}

// ── FILTER WIRING ──────────────────────────────
function wireFilters() {
  document.getElementById("filterCategory")?.addEventListener("change", applyFilters);
  document.getElementById("filterStatus")?.addEventListener("change",   applyFilters);
}

function applyFilters() {
  const cat    = document.getElementById("filterCategory").value;
  const status = document.getElementById("filterStatus").value;
  const container = document.getElementById("allReportsContainer");
  container.innerHTML = "";

  const filtered = allReportsCache.filter(({ data }) => {
    if (cat    && data.category !== cat)                     return false;
    if (status === "active"   && data.status === "resolved") return false;
    if (status === "resolved" && data.status !== "resolved") return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="loading-state">No matching reports found.</div>`;
    return;
  }
  filtered.forEach(({ id, data }) => container.appendChild(buildReportCard(id, data)));
}

// ── LOAD ALL REPORTS ───────────────────────────
let allReportsLoaded = false;
function loadAllReports() {
  if (allReportsLoaded) return;
  allReportsLoaded = true;
  onSnapshot(
    query(collection(db, "incidents"), orderBy("createdAt", "desc")),
    (snapshot) => {
      allReportsCache = [];
      snapshot.forEach(doc => allReportsCache.push({ id: doc.id, data: doc.data() }));
      applyFilters();
    },
    (err) => {
      console.error("loadAllReports:", err);
      document.getElementById("allReportsContainer").innerHTML =
        `<div class="loading-state">Error loading reports.</div>`;
    }
  );
}

// ── LOAD HERITAGE LOGS ─────────────────────────
let heritageLogsLoaded = false;
function loadHeritageLogs() {
  if (heritageLogsLoaded) return;
  heritageLogsLoaded = true;
  const container = document.getElementById("heritageReportsLogContainer");
  onSnapshot(
    query(collection(db, "site_reports"), orderBy("createdAt", "desc")),
    (snapshot) => {
      container.innerHTML = "";
      if (snapshot.empty) {
        container.innerHTML = `<div class="loading-state">No heritage site reports yet.</div>`;
        return;
      }
      snapshot.forEach(doc => container.appendChild(buildReportCard(doc.id, doc.data(), true)));
    },
    (err) => {
      console.error("loadHeritageLogs:", err);
      container.innerHTML = `<div class="loading-state">Error loading heritage reports.</div>`;
    }
  );
}

// ── LOAD DASHBOARD ─────────────────────────────
async function loadDashboard() {
  try {
    const [incSnap, heritageSnap, evacSnap, recentSnap] = await Promise.all([
      getDocs(collection(db, "incidents")),
      getDocs(collection(db, "heritage_sites")),
      getDocs(collection(db, "evacuation_centers")),
      getDocs(query(collection(db, "incidents"), orderBy("createdAt", "desc"), limit(8)))
    ]);

    let active = 0, resolved = 0, flagged = 0;
    incSnap.forEach(d => {
      const data = d.data();
      if (data.status === "resolved") resolved++;
      else active++;
      if (data.flagged === true && data.verified !== true) flagged++;
    });

    document.getElementById("statActive").textContent   = active;
    document.getElementById("statResolved").textContent = resolved;
    document.getElementById("statHeritage").textContent = heritageSnap.size;
    document.getElementById("statEvac").textContent     = evacSnap.size;
    const flaggedEl = document.getElementById("statFlagged");
    if (flaggedEl) flaggedEl.textContent = flagged;

    const list = document.getElementById("dashRecentList");
    list.innerHTML = "";
    recentSnap.forEach(doc => {
      const d = doc.data();
      let dot;
      if (d.verified === true)          dot = "#5db88a";
      else if (d.flagged === true)      dot = "#f4845f";
      else if (d.status === "resolved") dot = "#888ea0";
      else if (d.source === "lgu")      dot = "#5ba4c8";
      else                              dot = "#f4845f";

      const flagIcon     = d.flagged && !d.verified ? `<span style="font-size:10px;margin-left:4px;">🚩</span>` : "";
      const verifiedIcon = d.verified               ? `<span style="font-size:10px;margin-left:4px;">✅</span>` : "";
      const date = d.createdAt?.toDate
        ? d.createdAt.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

      const row = document.createElement("div");
      row.className = "dash-recent-row";
      row.innerHTML = `
        <span style="width:9px;height:9px;border-radius:50%;background:${dot};flex-shrink:0"></span>
        <span style="flex:1;color:#c5d5e8;">${d.category || "Report"}</span>
        <span style="font-size:11px;">${d.title || ""}${flagIcon}${verifiedIcon}</span>
        <span style="font-size:11px;color:#5c7490;">${date}</span>
      `;
      list.appendChild(row);
    });
  } catch (err) {
    console.error("loadDashboard:", err);
  }
}

// ══════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════
let adminLoaded      = false;
let allAdminUsers    = [];
let allAdminReports  = [];
let allAdminArchive  = [];

function loadAdminPanel() {
  if (!adminLoaded) {
    // Wire tab switching
    document.querySelectorAll(".admin-tab-inner").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab-inner").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".admin-tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const panelId = "adminTab" + tab.dataset.admintab.charAt(0).toUpperCase() + tab.dataset.admintab.slice(1);
        document.getElementById(panelId)?.classList.add("active");
      });
    });

    // Search wiring
    document.getElementById("adminUserSearch")?.addEventListener("input", e => renderAdminUsers(e.target.value));
    document.getElementById("adminReportSearch")?.addEventListener("input", e => renderAdminReports(e.target.value));

    adminLoaded = true;
  }
  fetchAdminData();
}

async function fetchAdminData() {
  try {
    const [userSnap, incSnap, archSnap, heritageSnap, evacSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "incidents"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "archived_incidents"), orderBy("archivedAt", "desc"))),
      getDocs(collection(db, "heritage_sites")),
      getDocs(collection(db, "evacuation_centers"))
    ]);

    allAdminUsers   = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    allAdminReports = incSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    allAdminArchive = archSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderAdminUsers();
    renderReputation();
    renderAdminReports();
    renderAdminArchive();
    renderAdminOverview(heritageSnap.size, evacSnap.size);
  } catch (err) {
    console.error("fetchAdminData:", err);
  }
}

// ── FORMATTERS ─────────────────────────────────
function fmtDate(ts) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function roleBadge(role) {
  const cls = role === "sysadmin" ? "role-sysadmin" : role === "lgu" ? "role-lgu" : "role-community";
  return `<span class="admin-role-badge ${cls}">${role || "community"}</span>`;
}

function trustPill(score, banned) {
  if (banned)      return `<span class="trust-pill trust-banned">🚫 Banned</span>`;
  if (score == null) return `<span class="trust-pill trust-new">🔵 New</span>`;
  const p = Math.round(score * 100);
  if (p >= 65) return `<span class="trust-pill trust-trusted">✓ Trusted</span>`;
  if (p >= 40) return `<span class="trust-pill trust-new">~ New</span>`;
  return `<span class="trust-pill trust-low-rel">⚠ Low</span>`;
}

function repScoreCell(score, banned) {
  if (banned) return `<span class="risk-badge risk-ban">🚫 Banned</span>`;
  if (score == null) return `<span style="color:#4a5568;font-family:'DM Mono',monospace;font-size:11px">New</span>`;
  const p = Math.round(score * 100);
  const c = p >= 75 ? "#5db88a" : p >= 45 ? "#d4a054" : "#e05252";
  return `<div class="rep-score-wrap">
    <div class="rep-bar-bg"><div class="rep-bar-fill" style="width:${p}%;background:${c}"></div></div>
    <span class="rep-num" style="color:${c}">${p}/100</span>
  </div>`;
}

function fakePctCell(rCount, fCount) {
  if (!rCount) return `<span style="color:#4a5568;font-family:'DM Mono',monospace;font-size:11px">—</span>`;
  const p = Math.round((fCount / rCount) * 100);
  const c = p > 50 ? "#e05252" : p > 25 ? "#d4a054" : "#5db88a";
  return `<span style="color:${c};font-family:'DM Mono',monospace;font-size:11.5px;font-weight:700">${p}%</span>`;
}

function riskBadge(score, banned, rCount, fCount) {
  if (banned) return `<span class="risk-badge risk-ban">🚫 Banned</span>`;
  if (score == null) return `<span class="risk-badge risk-low">🔵 New</span>`;
  const p  = Math.round(score * 100);
  const fp = rCount > 0 ? (fCount / rCount) * 100 : 0;
  if (p < 30 || fp > 50) return `<span class="risk-badge risk-high">⚠ High Risk</span>`;
  if (p < 55 || fp > 25) return `<span class="risk-badge risk-mid">~ Medium</span>`;
  return `<span class="risk-badge risk-low">✓ Low Risk</span>`;
}

function isHighRisk(u) {
  if (u.shadowBanned) return true;
  if (u.trustScore == null) return false;
  const p  = Math.round(u.trustScore * 100);
  const fp = (u.reportCount || 0) > 0 ? ((u.fakeCount || 0) / u.reportCount) * 100 : 0;
  return p < 30 || fp > 50;
}

function confidenceBadge(score, verified, flagged) {
  if (verified) return `<span style="color:#5db88a;font-size:11px;font-weight:700">✓ Verified</span>`;
  if (flagged)  return `<span style="color:#e05252;font-size:11px;font-weight:700">🚩 Flagged</span>`;
  if (score == null) return `<span style="color:#4a5568;font-size:11px">—</span>`;
  const p = Math.round(score * 100);
  const [c, l] = p >= 75 ? ["#5db88a", `High (${p}%)`] : p >= 45 ? ["#d4a054", `Mid (${p}%)`] : ["#e05252", `Low (${p}%)`];
  return `<span style="color:${c};font-size:11px;font-weight:700">${l}</span>`;
}

// ── RENDER: USERS (enhanced) ───────────────────
function renderAdminUsers(filter = "") {
  const tbody = document.getElementById("adminUsersBody");
  if (!tbody) return;
  const fl   = filter.toLowerCase();
  const list = filter
    ? allAdminUsers.filter(u =>
        (u.username || "").toLowerCase().includes(fl) ||
        (u.email    || "").toLowerCase().includes(fl) ||
        (u.role     || "").toLowerCase().includes(fl))
    : allAdminUsers;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="admin-tbl-empty">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(u => `
    <tr>
      <td class="admin-td-name">${u.username || "—"}</td>
      <td class="admin-td-mono">${u.email    || "—"}</td>
      <td class="admin-td-mono">${u.phone    || "—"}</td>
      <td>${roleBadge(u.role)}</td>
      <td>${trustPill(u.trustScore, u.shadowBanned)}</td>
      <td>${repScoreCell(u.trustScore, u.shadowBanned)}</td>
      <td class="admin-td-mono" style="text-align:center">${u.reportCount || 0}</td>
      <td>${fakePctCell(u.reportCount || 0, u.fakeCount || 0)}</td>
      <td class="admin-td-mono">${fmtDate(u.createdAt)}</td>
      <td>
        <select class="admin-role-select"
          onchange="adminChangeRole('${u.id}',this.value,'${(u.username || u.email || "").replace(/'/g, "\\'")}')">
          <option value="community" ${u.role === "community" ? "selected" : ""}>Community</option>
          <option value="lgu"       ${u.role === "lgu"       ? "selected" : ""}>LGU</option>
          <option value="sysadmin"  ${u.role === "sysadmin"  ? "selected" : ""}>Sysadmin</option>
        </select>
        ${u.shadowBanned
          ? `<button class="admin-restore-btn" onclick="adminSetBan('${u.id}',false,'${(u.username || u.email || "").replace(/'/g, "\\'")}')">Restore</button>`
          : `<button class="admin-ban-btn"     onclick="adminSetBan('${u.id}',true,'${(u.username || u.email || "").replace(/'/g, "\\'")}')">Ban</button>`
        }
        <button class="admin-del-btn" onclick="adminDeleteUser('${u.id}','${(u.username || u.email || "").replace(/'/g, "\\'")}')">Delete</button>
      </td>
    </tr>`).join("");
}

// ── RENDER: REPUTATION TAB ─────────────────────
function renderReputation() {
  let trusted = 0, newU = 0, lowRel = 0, banned = 0, highRisk = 0;
  allAdminUsers.forEach(u => {
    if (u.shadowBanned) { banned++; highRisk++; return; }
    if (u.trustScore == null) { newU++; return; }
    const p  = Math.round(u.trustScore * 100);
    const fp = (u.reportCount || 0) > 0 ? ((u.fakeCount || 0) / u.reportCount) * 100 : 0;
    if (p >= 65) trusted++;
    else if (p >= 40) newU++;
    else lowRel++;
    if (p < 30 || fp > 50) highRisk++;
  });

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("repTrusted",  trusted);
  setEl("repNew",      newU);
  setEl("repLowRel",   lowRel);
  setEl("repBanned",   banned);
  setEl("repHighRisk", highRisk);

  const hrGrid  = document.getElementById("adminHighRiskGrid");
  const allGrid = document.getElementById("adminAllRepGrid");
  if (!hrGrid || !allGrid) return;

  const hiUsers = allAdminUsers.filter(isHighRisk);
  hrGrid.innerHTML  = hiUsers.length
    ? hiUsers.map(buildRepCard).join("")
    : `<div class="admin-tbl-empty" style="grid-column:1/-1">No high-risk accounts detected.</div>`;
  allGrid.innerHTML = allAdminUsers.length
    ? allAdminUsers.map(buildRepCard).join("")
    : `<div class="admin-tbl-empty" style="grid-column:1/-1">No users found.</div>`;
}

function buildRepCard(u) {
  const pct  = u.trustScore != null ? Math.round(u.trustScore * 100) : null;
  const fCnt = u.fakeCount   || 0;
  const rCnt = u.reportCount || 0;
  const fpct = rCnt > 0 ? Math.round((fCnt / rCnt) * 100) : 0;
  const barC = pct == null ? "#4a5568" : pct >= 75 ? "#5db88a" : pct >= 45 ? "#d4a054" : "#e05252";
  const fC   = fpct > 50 ? "#e05252" : fpct > 25 ? "#d4a054" : "#5db88a";

  return `<div class="rep-card">
    <div class="rep-card-header">
      <div>
        <div class="rep-card-name">${u.username || "Unknown"}</div>
        <div class="rep-card-email">${u.email || "—"}</div>
      </div>
      ${riskBadge(u.trustScore, u.shadowBanned, rCnt, fCnt)}
    </div>
    ${pct != null
      ? `<div class="rep-score-wrap" style="gap:10px">
          <div class="rep-bar-bg" style="flex:1;width:auto">
            <div class="rep-bar-fill" style="width:${pct}%;background:${barC}"></div>
          </div>
          <span class="rep-num" style="color:${barC}">${pct}/100</span>
        </div>`
      : `<div style="font-size:11px;color:#5c7490;font-family:'DM Mono',monospace">No score yet (new user)</div>`
    }
    <div class="rep-card-row"><span class="rep-card-row-label">Role</span>${roleBadge(u.role)}</div>
    <div class="rep-card-row"><span class="rep-card-row-label">Reports submitted</span><span class="rep-card-row-val">${rCnt}</span></div>
    <div class="rep-card-row"><span class="rep-card-row-label">Fake / flagged</span><span class="rep-card-row-val" style="color:${fC}">${fCnt} (${fpct}%)</span></div>
    <div class="rep-card-row"><span class="rep-card-row-label">LGU sees</span>${trustPill(u.trustScore, u.shadowBanned)}</div>
    <div class="rep-card-row"><span class="rep-card-row-label">Shadow ban</span>
      <span class="rep-card-row-val" style="color:${u.shadowBanned ? "#e05252" : "#5db88a"}">
        ${u.shadowBanned ? "🚫 Active" : "✓ None"}
      </span>
    </div>
    <div class="rep-card-actions">
      ${u.shadowBanned
        ? `<button class="tbl-btn-inner tbl-restore-btn" onclick="adminSetBan('${u.id}',false,'${(u.username || u.email || "").replace(/'/g, "\\'")}')">↑ Restore</button>`
        : `<button class="tbl-btn-inner tbl-ban-btn"     onclick="adminSetBan('${u.id}',true,'${(u.username || u.email || "").replace(/'/g, "\\'")}')">🚫 Ban</button>`
      }
      <button class="tbl-btn-inner tbl-warn-btn" onclick="adminWarnUser('${u.id}','${(u.username || u.email || "").replace(/'/g, "\\'")}')">⚠ Warn</button>
      <button class="tbl-btn-inner tbl-del-btn"  onclick="adminDeleteUser('${u.id}','${(u.username || u.email || "").replace(/'/g, "\\'")}')">Delete</button>
    </div>
  </div>`;
}

// ── RENDER: REPORTS OVERVIEW ───────────────────
function renderAdminReports(filter = "") {
  const tbody = document.getElementById("adminReportsBody");
  if (!tbody) return;
  const fl   = filter.toLowerCase();
  const list = filter
    ? allAdminReports.filter(r =>
        (r.title    || "").toLowerCase().includes(fl) ||
        (r.category || "").toLowerCase().includes(fl) ||
        (r.status   || "").toLowerCase().includes(fl))
    : allAdminReports;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-tbl-empty">No reports found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td class="admin-td-name" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title || "—"}</td>
      <td style="font-size:11.5px">${r.category || "—"}</td>
      <td>${r.source === "lgu"
        ? `<span class="admin-role-badge role-lgu">LGU</span>`
        : `<span class="admin-role-badge role-community">Community</span>`}
      </td>
      <td>${r.status === "resolved"
        ? `<span class="admin-role-badge" style="background:rgba(136,142,160,.12);color:#888ea0;border:1px solid rgba(136,142,160,.2)">Resolved</span>`
        : `<span class="admin-role-badge" style="background:rgba(244,132,95,.12);color:#f4845f;border:1px solid rgba(244,132,95,.2)">Active</span>`}
      </td>
      <td style="text-align:center">${r.flagged
        ? `<span style="color:#f4845f;font-size:12px">🚩 ${r.flagCount || 1}</span>`
        : `<span style="color:#5c7490;font-size:11px">—</span>`}
      </td>
      <td>${confidenceBadge(r.confidenceScore, r.verified, r.flagged)}</td>
      <td class="admin-td-mono">${fmtDate(r.createdAt)}</td>
      <td>
        <button class="admin-del-btn" onclick="adminDeleteReport('${r.id}','${(r.title || "Report").replace(/'/g, "\\'")}')">Delete</button>
      </td>
    </tr>`).join("");
}

// ── RENDER: ARCHIVE ────────────────────────────
function renderAdminArchive() {
  const grid = document.getElementById("adminArchiveGrid");
  if (!grid) return;
  if (!allAdminArchive.length) {
    grid.innerHTML = `<div class="admin-tbl-empty">No archived reports yet.</div>`;
    return;
  }
  grid.innerHTML = allAdminArchive.map(r => `
    <div class="archive-card">
      <div><span class="archive-card-cat">${r.category || "Report"}</span></div>
      <div class="archive-card-title">${r.title || "Untitled"}</div>
      <div class="archive-card-desc">${r.description || "No description."}</div>
      <div class="archive-card-meta">
        <span>${r.source === "lgu" ? "🔵 LGU" : "🟠 Community"}</span>
        <span>🗄 ${fmtDate(r.archivedAt)}</span>
      </div>
      <button class="admin-del-btn" style="width:100%;margin-top:4px;"
        onclick="adminDeleteArchive('${r.id}','${(r.title || "Report").replace(/'/g, "\\'")}')">
        Delete Permanently
      </button>
    </div>`).join("");
}

// ── RENDER: OVERVIEW ───────────────────────────
function renderAdminOverview(heritageSz, evacSz) {
  const active      = allAdminReports.filter(r => r.status !== "resolved").length;
  const resolved    = allAdminReports.filter(r => r.status === "resolved").length;
  const flagged     = allAdminReports.filter(r => r.flagged && !r.verified).length;
  const shadowBanned = allAdminUsers.filter(u => u.shadowBanned).length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("ovTotalUsers",      allAdminUsers.length);
  setEl("ovLguUsers",        allAdminUsers.filter(u => u.role === "lgu").length);
  setEl("ovActiveReports",   active);
  setEl("ovResolvedReports", resolved);
  setEl("ovFlagged",         flagged);
  setEl("ovShadowBanned",    shadowBanned);
  setEl("ovArchived",        allAdminArchive.length);
  setEl("ovHeritage",        heritageSz);
  setEl("ovEvac",            evacSz);
}

// ── GLOBAL ACTION HANDLERS ─────────────────────
window.adminChangeRole = async function(uid, newRole, name) {
  adminConfirm("🔄", "Change role?", `Set "${name}" to ${newRole}?`, async () => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      const u = allAdminUsers.find(u => u.id === uid);
      if (u) u.role = newRole;
      renderAdminUsers(document.getElementById("adminUserSearch")?.value || "");
      renderReputation();
    } catch (err) { console.error(err); }
  });
};

window.adminSetBan = async function(uid, ban, name) {
  adminConfirm(
    ban ? "🚫" : "✅",
    ban ? "Shadow ban user?" : "Restore user?",
    ban
      ? `"${name}" will be silently blocked — reports won't appear to others.`
      : `"${name}" will be restored and their reports visible again.`,
    async () => {
      try {
        await updateDoc(doc(db, "users", uid), { shadowBanned: ban });
        const u = allAdminUsers.find(u => u.id === uid);
        if (u) u.shadowBanned = ban;
        renderAdminUsers(document.getElementById("adminUserSearch")?.value || "");
        renderReputation();
        renderAdminOverview(
          allAdminUsers.filter(u => u.role === "lgu").length,  // placeholder, re-fetch if needed
          0
        );
        fetchAdminData(); // re-fetch to get fresh overview counts
      } catch (err) { console.error(err); }
    }
  );
};

window.adminWarnUser = async function(uid, name) {
  adminConfirm("⚠️", "Send warning?",
    `A warning flag will be added to "${name}"'s account record.`,
    async () => {
      try {
        await updateDoc(doc(db, "users", uid), { warned: true, warnedAt: new Date() });
      } catch (err) { console.error(err); }
    }
  );
};

window.adminDeleteUser = async function(uid, name) {
  adminConfirm("🗑️", "Delete user?",
    `Remove "${name}" from Firestore? Their login account remains.`,
    async () => {
      try {
        await deleteDoc(doc(db, "users", uid));
        allAdminUsers = allAdminUsers.filter(u => u.id !== uid);
        renderAdminUsers(document.getElementById("adminUserSearch")?.value || "");
        renderReputation();
        fetchAdminData();
      } catch (err) { console.error(err); }
    }
  );
};

window.adminDeleteReport = async function(id, title) {
  adminConfirm("🗑️", "Delete report?",
    `"${title}" will be permanently removed.`,
    async () => {
      try {
        await deleteDoc(doc(db, "incidents", id));
        allAdminReports = allAdminReports.filter(r => r.id !== id);
        renderAdminReports(document.getElementById("adminReportSearch")?.value || "");
        fetchAdminData();
      } catch (err) { console.error(err); }
    }
  );
};

window.adminDeleteArchive = async function(id, title) {
  adminConfirm("🗑️", "Delete archived report?",
    `"${title}" will be permanently removed from the archive.`,
    async () => {
      try {
        await deleteDoc(doc(db, "archived_incidents", id));
        allAdminArchive = allAdminArchive.filter(r => r.id !== id);
        renderAdminArchive();
        fetchAdminData();
      } catch (err) { console.error(err); }
    }
  );
};

function adminConfirm(icon, title, body, onYes) {
  const modal = document.getElementById("adminConfirmModal");
  if (!modal) return;
  document.getElementById("adminConfirmIcon").textContent  = icon;
  document.getElementById("adminConfirmTitle").textContent = title;
  document.getElementById("adminConfirmBody").textContent  = body;
  modal.style.display = "flex";
  document.getElementById("adminConfirmYes").onclick = () => { modal.style.display = "none"; onYes(); };
  document.getElementById("adminConfirmNo").onclick  = () => { modal.style.display = "none"; };
}

// ── BUILD REPORT CARD ──────────────────────────
function buildReportCard(id, data, isHeritage = false) {
  const card = document.createElement("div");
  card.className = "report-card";

  const isResolved = data.status === "resolved";
  const isLgu      = data.source === "lgu";
  const isVerified = data.verified === true;
  const isFlagged  = data.flagged  === true && !isVerified;

  const dotColor = isResolved ? "#888ea0"
    : isVerified  ? "#5db88a"
    : isFlagged   ? "#f4845f"
    : isLgu       ? "#5ba4c8"
    : isHeritage  ? "#5db88a"
    : "#f4845f";

  const label = isResolved ? "Resolved"
    : isVerified  ? "Verified"
    : isFlagged   ? "Flagged"
    : isLgu       ? "LGU"
    : isHeritage  ? "Heritage"
    : "Community";

  const date = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  const trustBadge = isVerified
    ? `<span style="font-size:10px;color:#5db88a;margin-left:6px;">✅ Verified</span>`
    : isFlagged
    ? `<span style="font-size:10px;color:#f4845f;margin-left:6px;">🚩 Flagged${data.flagCount > 1 ? " (" + data.flagCount + ")" : ""}</span>`
    : "";

  card.innerHTML = `
    <div class="report-card-header">
      <span class="report-category-tag">${data.category || (isHeritage ? "Heritage Report" : "Report")}</span>
      <span class="report-status-badge ${isResolved ? "resolved" : "active"}">${isResolved ? "Resolved" : "Active"}</span>
    </div>
    <p class="report-desc">${data.description || data.observation || "No description provided."}</p>
    <div class="report-meta">
      <span>🕐 ${date}</span>
      ${(data.latitude || data.lat) ? `<span>📍 ${(data.latitude ?? data.lat).toFixed(4)}, ${(data.longitude ?? data.lng).toFixed(4)}</span>` : ""}
      <span style="margin-left:auto;display:flex;align-items:center;gap:5px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block"></span>
        ${label}
      </span>
      ${trustBadge}
    </div>
  `;

  card.addEventListener("click", () => {
    const lat = data.latitude ?? data.lat;
    const lng = data.longitude ?? data.lng;
    if (lat && lng) {
      showSection("map");
      setTimeout(() => map.setView([lat, lng], 17), 120);
    }
  });

  return card;
}