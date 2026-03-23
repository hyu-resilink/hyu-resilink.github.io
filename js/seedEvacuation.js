// seedEvacuation.js
import { db } from "./firebase.js";
import { collection, addDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const evacuationCenters = [

  // San Isidro (Using Provided Coordinates)
 // Northern Mountain Area
  { name: "Masonoy Evacuation Center", barangay: "Masonoy", municipality: "San Isidro", lat: 9.8720, lng: 124.3275, status: "open" },
  { name: "Catagbacan Evacuation Center", barangay: "Catagbacan", municipality: "San Isidro", lat: 9.8601, lng: 124.3197, status: "open" },

  // North-Central
  { name: "Cansague Norte Evacuation Center", barangay: "Cansague Norte", municipality: "San Isidro", lat: 9.8515, lng: 124.3122, status: "open" },
  { name: "Cansague Sur Evacuation Center", barangay: "Cansague Sur", municipality: "San Isidro", lat: 9.8470, lng: 124.3083, status: "open" },

  // Central Proper
  { name: "Centro Evacuation Center", barangay: "Centro", municipality: "San Isidro", lat: 9.8356, lng: 124.3112, status: "open" },
  { name: "Cambansag Evacuation Center", barangay: "Cambansag", municipality: "San Isidro", lat: 9.8331, lng: 124.3189, status: "open" },

  // Western Boundary Side
  { name: "Cabanugan Evacuation Center", barangay: "Cabanugan", municipality: "San Isidro", lat: 9.7998, lng: 124.2996, status: "open" },

  // Southern Area
  { name: "Abehilan Evacuation Center", barangay: "Abehilan", municipality: "San Isidro", lat: 9.8225, lng: 124.3065, status: "open" },
  { name: "Baunos Evacuation Center", barangay: "Baunos", municipality: "San Isidro", lat: 9.8102, lng: 124.3154, status: "open" },
  { name: "Candungao Evacuation Center", barangay: "Candungao", municipality: "San Isidro", lat: 9.8404, lng: 124.3041, status: "open" },

// Northern Area
  { name: "Barangay Canlaas Hall", barangay: "Canlaas", municipality: "Antequera", lat: 9.7906, lng: 123.8894, status: "open" },
  { name: "Barangay Villa Aurora Hall", barangay: "Villa Aurora", municipality: "Antequera", lat: 9.7921, lng: 123.9105, status: "open" },

  // Central Proper
  { name: "Antequera Municipal Gym", barangay: "Poblacion", municipality: "Antequera", lat: 9.7811, lng: 123.8980, status: "open" },
  { name: "Antequera National High School", barangay: "Poblacion", municipality: "Antequera", lat: 9.7827, lng: 123.8991, status: "open" },
  { name: "Antequera Central Elementary School", barangay: "Poblacion", municipality: "Antequera", lat: 9.7804, lng: 123.8973, status: "open" },

  // Western Side
  { name: "Barangay Can-omay Hall", barangay: "Can-omay", municipality: "Antequera", lat: 9.7869, lng: 123.8838, status: "open" },

  // Southern Area
  { name: "Barangay Mag-aso Gymnasium", barangay: "Mag-aso", municipality: "Antequera", lat: 9.7768, lng: 123.8842, status: "open" },
  { name: "Barangay Quinapon-an Covered Court", barangay: "Quinapon-an", municipality: "Antequera", lat: 9.7694, lng: 123.8947, status: "open" },
  { name: "Barangay Bantolinao Covered Court", barangay: "Bantolinao", municipality: "Antequera", lat: 9.7682, lng: 123.9059, status: "open" },
  { name: "Barangay Tubod Multi-Purpose Center", barangay: "Tubod", municipality: "Antequera", lat: 9.7745, lng: 123.9152, status: "open" },

];

async function seedData() {
  for (const center of evacuationCenters) {
    await addDoc(collection(db, "evacuation_centers"), center);
  }
  console.log("Evacuation centers added successfully!");
}

seedData();