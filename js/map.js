// js/map.js

// ── ZOOM CONTROL POSITION ──────────────────────
// On mobile (≤768px) move zoom buttons to bottom-left so they don't
// overlap the hamburger menu button that lives in the top-left corner.
const isMobile = window.innerWidth <= 768;

export const map = L.map('map', {
  zoomControl: false   // we add it manually below so we can pick the position
}).setView([9.7844, 123.9006], 15);

// Add zoom control — bottom-left on mobile, top-left on desktop
L.control.zoom({
  position: isMobile ? 'bottomleft' : 'topleft'
}).addTo(map);

// Layer Groups
export const incidentLayer   = L.layerGroup().addTo(map);
export const heritageLayer   = L.layerGroup().addTo(map);
export const evacuationLayer = L.layerGroup().addTo(map);

// Layer Control
L.control.layers(null, {
  "Reports":            incidentLayer,
  "Heritage Sites":     heritageLayer,
  "Evacuation Centers": evacuationLayer
}, { collapsed: false }).addTo(map);

// Base Tile Layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ── MARKER ICONS ───────────────────────────────
export const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
export const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
export const grayIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
export const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// ── MAP CLICK STATE ────────────────────────────
let selectedLat = null;
let selectedLng = null;
let tempMarker  = null;

export function getSelectedLocation() {
  return { lat: selectedLat, lng: selectedLng };
}

export function setSelectedLocation(lat, lng) {
  selectedLat = lat;
  selectedLng = lng;
}

export function clearTempMarker() {
  if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
}

// Place (or move) the temp marker and open the form panel
export function placeMarkerAt(lat, lng, label = "Incident Location") {
  selectedLat = lat;
  selectedLng = lng;
  clearTempMarker();
  tempMarker = L.marker([lat, lng])
    .addTo(incidentLayer)
    .bindPopup(label)
    .openPopup();
  document.getElementById("formPanel").style.display = "block";
}

// Manual map click still works as before
map.on('click', function (e) {
  placeMarkerAt(e.latlng.lat, e.latlng.lng, "New Incident Location");
});

// ── LEGEND ────────────────────────────────────
const legend = L.control({ position: "bottomright" });
legend.onAdd = function () {
  const div = L.DomUtil.create("div", "map-legend");
  div.innerHTML = `
    <div class="legend-header">Legend</div>
    <div class="legend-row"><span class="legend-dot" style="background:#00C853;box-shadow:0 0 5px rgba(0,200,83,0.4)"></span> Evac — Open</div>
    <div class="legend-row"><span class="legend-dot" style="background:#FF9800;box-shadow:0 0 5px rgba(255,152,0,0.4)"></span> Evac — Limited</div>
    <div class="legend-row"><span class="legend-dot" style="background:#D50000;box-shadow:0 0 5px rgba(213,0,0,0.4)"></span> Evac — Full / Closed</div>
    <div class="legend-row"><span class="legend-dot" style="background:#9c5fe6;box-shadow:0 0 5px rgba(156,95,230,0.5)"></span> Heritage — Intact</div>
    <div class="legend-row"><span class="legend-dot" style="background:#e65f8a;box-shadow:0 0 5px rgba(230,95,138,0.4)"></span> Heritage — Damaged</div>
    <div class="legend-row"><span class="legend-dot" style="background:#7c82d4;box-shadow:0 0 5px rgba(124,130,212,0.4)"></span> Heritage — Restoration</div>
    <div class="legend-row"><span class="legend-sq community"></span> Community Report</div>
    <div class="legend-row"><span class="legend-sq lgu"></span> LGU Report</div>
    <div class="legend-row"><span class="legend-sq resolved"></span> Resolved Incident</div>
  `;
  return div;
};
legend.addTo(map);

// ── GPS LOCATION ───────────────────────────────
let accuracyCircle = null;

export function clearAccuracyCircle() {
  if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
}

export function requestGpsLocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat      = position.coords.latitude;
      const lng      = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      clearAccuracyCircle();

      accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: "#5ba4c8",
        fillColor: "#5ba4c8",
        fillOpacity: 0.08,
        weight: 1,
        dashArray: "4 4"
      }).addTo(map);

      map.setView([lat, lng], 17);
      onSuccess(lat, lng, accuracy);
    },
    (error) => {
      const messages = {
        1: "Location access was denied. Please allow location permission and try again.",
        2: "Your location could not be determined. Please click the map manually.",
        3: "Location request timed out. Please click the map manually."
      };
      onError(messages[error.code] || "An unknown location error occurred.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
}