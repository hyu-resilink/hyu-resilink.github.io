// js/guides.js
// Preparedness & Resource Guides — static content, no Firestore needed.
// Covers: Disaster guides (Typhoon, Flood, Earthquake, Landslide)
// and Resource modules (Energy, Water, Waste, Disaster Preparedness)

// ── DATA ──────────────────────────────────────────────────────

const DISASTER_GUIDES = [
  {
    id: "typhoon",
    icon: "🌀",
    name: "Typhoon",
    color: "#5ba4c8",
    before: [
      "Monitor PAGASA weather bulletins and storm signals regularly.",
      "Prepare a Go Bag with 3-day food supply, water (1 gallon/person/day), flashlight, batteries, first aid kit, important documents, and medicines.",
      "Secure loose objects outside (furniture, pots, signboards) that could become projectiles.",
      "Reinforce doors and windows. Cover windows with storm shutters or plywood.",
      "Know your barangay's designated evacuation center and the safest route to get there.",
      "Charge all devices and power banks. Keep a battery-powered or hand-crank radio.",
      "Fill containers, bathtubs, and drums with clean water in case supply gets cut.",
      "Unplug electrical appliances and turn off the main breaker if flooding is expected.",
      "Inform family members of your emergency plan and meeting point.",
      "Keep emergency contact numbers saved offline: NDRRMC (911), local barangay hotline.",
    ],
    during: [
      "Stay indoors and away from windows, glass doors, and skylights.",
      "Do NOT go outside during the eye of the storm — the other side of the eyewall is equally dangerous.",
      "If flooding begins, move to higher floors immediately. Do not wait.",
      "Avoid using candles near flammable materials. Use flashlights instead.",
      "Do not use generators, grills, or stoves indoors — carbon monoxide risk.",
      "If in a vehicle caught by floodwaters, abandon it and move to higher ground on foot.",
      "Listen to official updates only. Avoid spreading unverified information.",
      "Stay away from rivers, drainage canals, and storm drains.",
      "If the roof begins to lift, get under a sturdy table and hold on.",
      "Keep your Go Bag within reach at all times.",
    ],
    after: [
      "Wait for the official 'all clear' signal from local authorities before going outside.",
      "Inspect your home for structural damage before re-entering.",
      "Do not wade through floodwater — it may be electrically charged or contaminated.",
      "Document all property damage with photos for insurance and relief claims.",
      "Boil water before drinking until water safety advisories are lifted.",
      "Watch for fallen power lines — stay at least 10 meters away and report immediately.",
      "Help elderly, disabled, and vulnerable neighbors check on their safety.",
      "Do not eat food that has been submerged in floodwater.",
      "Clean and disinfect your home to prevent leptospirosis and other waterborne diseases.",
      "Report damage to your barangay for official assessment and relief coordination.",
    ],
  },
  {
    id: "flood",
    icon: "🌊",
    name: "Flood",
    color: "#4dcfb0",
    before: [
      "Know your flood risk zone — check if your area is in a flood-prone barangay.",
      "Elevate electrical outlets, switches, and appliances above potential flood levels.",
      "Store important documents (IDs, land titles, insurance) in waterproof containers.",
      "Prepare emergency supplies: water, food, medicine, flashlight, extra clothes.",
      "Keep sandbags ready to place at door thresholds if flooding is expected.",
      "Know the location of the nearest evacuation center and two exit routes from your home.",
      "Never store hazardous chemicals or fuels in basement or ground-floor areas.",
      "Install check valves in plumbing to prevent floodwater from backing up into drains.",
      "Clear gutters, drains, and canals near your property of debris regularly.",
      "Register vulnerable family members (elderly, PWDs) with your barangay for priority evacuation.",
    ],
    during: [
      "Evacuate immediately when told to — do not wait for water to enter your home.",
      "Move to the highest floor or roof if evacuation is impossible and water rises.",
      "Never walk through moving water more than ankle-deep — currents are deceptive.",
      "If driving, turn around if the road is flooded — 'Turn Around, Don't Drown.'",
      "Disconnect all electrical appliances before floodwater reaches them.",
      "Do not touch electrical equipment in wet conditions.",
      "Avoid contact with floodwater — it carries sewage, chemicals, and disease.",
      "Signal for help using a whistle, bright cloth, or flashlight from an elevated position.",
      "Keep children and pets away from floodwaters at all times.",
      "Stay updated through radio or official social media channels only.",
    ],
    after: [
      "Return home only when authorities confirm it is safe.",
      "Wear rubber boots and gloves when cleaning flood-damaged areas.",
      "Pump out flooded basements gradually — pumping too fast can cause wall collapse.",
      "Check for gas leaks before using any flame or switch inside the house.",
      "Throw away all food that came in contact with floodwater — even canned goods if dented.",
      "Disinfect all surfaces, utensils, and items that touched floodwater with bleach solution.",
      "Watch for signs of mold within 24–48 hours and address immediately.",
      "Do not let children play in or near receding floodwaters.",
      "Report damaged roads, bridges, and utilities to your barangay or LGU.",
      "Seek medical attention immediately if you develop fever, rashes, or diarrhea after flood exposure.",
    ],
  },
  {
    id: "earthquake",
    icon: "🌍",
    name: "Earthquake",
    color: "#f4845f",
    before: [
      "Identify safe spots in each room: under sturdy tables, against interior walls away from windows.",
      "Identify danger zones: near windows, mirrors, hanging objects, tall furniture, and outside walls.",
      "Secure heavy furniture (bookshelves, cabinets, refrigerators) to walls with brackets.",
      "Store breakable and heavy items on lower shelves.",
      "Know how to shut off gas, water, and electricity at the main switches.",
      "Prepare an emergency kit: water, food, first aid, flashlight, whistle, dust mask.",
      "Practice 'Drop, Cover, and Hold On' with all household members regularly.",
      "Identify open areas near your home free from buildings, trees, and power lines.",
      "Keep shoes near your bed in case you need to walk through broken glass at night.",
      "Learn basic first aid and CPR.",
    ],
    during: [
      "DROP to your hands and knees immediately.",
      "Take COVER under a sturdy table or desk, or against an interior wall away from windows.",
      "HOLD ON and protect your head and neck with your arms until shaking stops.",
      "If no table is nearby, get against an interior wall, drop down, and cover your head.",
      "Do NOT run outside during shaking — most injuries occur when people try to move.",
      "If outdoors, move away from buildings, streetlights, and utility wires.",
      "If in a vehicle, pull over away from buildings, trees, and overpasses. Stay inside.",
      "If in bed, stay there and cover your head with a pillow.",
      "Do NOT use elevators.",
      "Expect aftershocks — they can be as strong as the initial quake.",
    ],
    after: [
      "Check yourself and others for injuries before moving around.",
      "Expect and prepare for aftershocks — move to an open area if possible.",
      "Check for gas leaks: if you smell gas, open windows, leave, and do not use switches.",
      "Do not use open flames until gas leaks are confirmed absent.",
      "Inspect your home for structural damage — cracks in walls, foundation, or chimney.",
      "Do not enter damaged buildings. Wait for structural assessment.",
      "Listen to emergency broadcasts for instructions and updates.",
      "Clean up hazardous spills (chemicals, medicines, bleach) carefully wearing gloves.",
      "Use text messages instead of calls to keep phone lines free for emergencies.",
      "Document all damage with photos for insurance and government relief assessment.",
    ],
  },
  {
    id: "landslide",
    icon: "⛰️",
    name: "Landslide",
    color: "#d4a054",
    before: [
      "Know if your home is on or near a slope, hillside, or unstable ground.",
      "Watch for warning signs: cracks in soil or pavement, leaning trees/fences, bulging ground.",
      "Plant deep-rooted vegetation on slopes to help stabilize soil.",
      "Ensure proper drainage around your home — water is the main trigger of landslides.",
      "Do not build on steep slopes, near drainage channels, or natural erosion valleys.",
      "Contact your barangay about local landslide hazard maps.",
      "Prepare an evacuation plan with at least two escape routes away from slopes.",
      "Keep emergency supplies ready — especially during prolonged or heavy rainfall.",
      "Pay attention to PHIVOLCS and PAGASA warnings about rainfall-induced landslides.",
      "Note sounds of cracking trees, moving rocks, or unusual rumbling near slopes.",
    ],
    during: [
      "If indoors, move to the upper floor and stay away from the side facing the slope.",
      "If outdoors, run to the nearest high ground away from the slide path.",
      "If escape is impossible, curl into a tight ball and protect your head.",
      "Never try to outrun a landslide by running parallel to the slope — move perpendicular.",
      "Avoid river valleys and low-lying areas during and after heavy rainfall.",
      "If caught in debris, use your arms to create an air pocket around your face.",
      "Do not cross a road or bridge with active debris flow.",
      "Listen for the rumbling sound that may indicate an approaching landslide.",
      "Stay away from the slide area — secondary slides are common.",
      "Alert neighbors immediately if you observe landslide activity.",
    ],
    after: [
      "Stay away from the slide area — the risk of additional slides remains high.",
      "Watch for flooding which often follows landslides, especially in valleys.",
      "Check for injured or trapped people only if it is safe to do so.",
      "Do not enter damaged buildings — landslides can cause structural weakening.",
      "Report the landslide to your barangay and NDRRMC immediately.",
      "Look for and report any broken utility lines (gas, water, electricity).",
      "Take photos and document the damage for official records.",
      "Do not attempt to clear major debris alone — wait for DPWH or NDRRMC teams.",
      "Watch for changes in your local landscape that may indicate continued instability.",
      "Attend community debriefings organized by your barangay or LGU.",
    ],
  },
];

const RESOURCE_MODULES = [
  {
    id: "energy",
    icon: "⚡",
    name: "Renewable Energy",
    color: "#f4d03f",
    sections: [
      {
        title: "Solar Setup Basics",
        items: [
          "A basic home solar system consists of: solar panels, a charge controller, a battery bank, and an inverter.",
          "For Antequera and San Isidro's climate, 3–4 peak sun hours per day is a reasonable estimate for solar generation.",
          "A 100W panel can produce roughly 300–400Wh per day — enough to charge phones, run LED lights, and a small fan.",
          "Monocrystalline panels are more efficient than polycrystalline — better for limited roof space.",
          "Face panels slightly south-facing at a tilt equal to your latitude (~10°) for optimal output in the Philippines.",
          "Keep panels clean and free of shade — even partial shade can reduce output by 50%.",
          "A 12V 100Ah battery stores about 1.2kWh — size your battery bank to cover 2 days of cloudy weather.",
          "Install a fuse or circuit breaker between every component for safety.",
          "For a typical household emergency setup: 2x 200W panels + 2x 100Ah batteries + 1000W inverter.",
          "Get your system inspected by a licensed electrician before connecting to your home's wiring.",
        ],
      },
      {
        title: "Energy Conservation Tips",
        items: [
          "Switch all lighting to LED — they use 75% less energy than incandescent bulbs.",
          "Unplug devices when not in use — standby power ('vampire loads') can account for 10% of your bill.",
          "Use natural ventilation (cross-ventilation) instead of electric fans during cooler hours.",
          "Air dry clothes instead of using a dryer — clothes dryers are one of the highest energy consumers.",
          "Run major appliances (washing machines, rice cookers) during off-peak hours (early morning).",
          "Keep refrigerator coils clean and ensure door seals are tight.",
          "Use pressure cookers — they cook food in 1/3 the time, saving gas and electricity.",
          "Install reflective roofing or ceiling insulation to reduce heat and lower cooling needs.",
          "Set water heaters to 48°C — hotter settings waste energy with no added benefit.",
          "Conduct a home energy audit — identify which appliances consume the most and replace old ones.",
        ],
      },
    ],
  },
  {
    id: "water",
    icon: "💧",
    name: "Water Purification",
    color: "#5ba4c8",
    sections: [
      {
        title: "Water Purification Methods",
        items: [
          "BOILING: Bring water to a rolling boil for 1 full minute (3 minutes at elevations above 2,000m). Most effective against bacteria, viruses, and parasites.",
          "CHLORINATION: Add 2 drops of unscented household bleach (5.25%) per liter of clear water. Wait 30 minutes before drinking.",
          "SOLAR DISINFECTION (SODIS): Fill clear PET bottles with water, place in direct sunlight for 6 hours (or 2 days if cloudy). Effective against most pathogens.",
          "FILTRATION: Use a ceramic filter, biosand filter, or commercial filter to remove sediment and some pathogens. Always combine with disinfection.",
          "Water purification tablets (sodium dichloroisocyanurate) are available at pharmacies — follow dosage on the packaging.",
          "For turbid water: filter through clean cloth first, then disinfect. Particles protect pathogens from disinfection.",
          "Reverse osmosis (RO) filters remove almost all contaminants but require pressure and regular maintenance.",
          "Never mix water purification methods without understanding interactions — some combinations can be harmful.",
        ],
      },
      {
        title: "Safe Water Storage",
        items: [
          "Use only food-grade containers (blue water drums, PET bottles, or stainless steel) for drinking water storage.",
          "Never store water in containers that previously held chemicals, pesticides, or non-food substances.",
          "Clean storage containers with soap and water, rinse with diluted bleach solution, and air dry before filling.",
          "Keep containers tightly covered and stored in a cool, dark place away from direct sunlight.",
          "Label containers with the date filled — replace stored water every 6 months.",
          "Store a minimum of 4 liters per person per day (2L for drinking, 2L for sanitation) for at least 3 days.",
          "Use a ladle or pump to remove water — never put your hands or dirty cups directly into storage.",
          "Elevate containers off the floor to prevent contamination from ground moisture and pests.",
          "Rainwater harvesting: collect from clean roof surfaces into covered tanks — filter and disinfect before drinking.",
          "During disasters, prioritize water for drinking and oral hygiene over all other uses.",
        ],
      },
    ],
  },
  {
    id: "waste",
    icon: "♻️",
    name: "Waste Management",
    color: "#5db88a",
    sections: [
      {
        title: "Waste Segregation",
        items: [
          "Under RA 9003 (Ecological Solid Waste Management Act), waste must be segregated at source into: Biodegradable, Non-biodegradable, and Special/Hazardous waste.",
          "BIODEGRADABLE (Green bin): food scraps, fruit and vegetable peels, leaves, paper, garden waste.",
          "NON-BIODEGRADABLE (Yellow/Black bin): plastics, styrofoam, metals, glass, rubber.",
          "RECYCLABLES (Blue bin): clean plastic bottles, cardboard, aluminum cans, glass bottles, newspapers.",
          "SPECIAL/HAZARDOUS: batteries, medicines, chemicals, light bulbs, electronic waste — never mix with regular waste.",
          "Label your bins clearly and place them in accessible areas for household members.",
          "Rinse food containers before placing in recycling — dirty recyclables contaminate entire batches.",
          "Reduce single-use plastics: bring reusable bags, containers, and water bottles.",
          "Participate in your barangay's scheduled collection days — know the schedule and follow it.",
          "Educate children early on segregation — habits formed young tend to last a lifetime.",
        ],
      },
      {
        title: "Composting Guide",
        items: [
          "Composting turns organic waste into nutrient-rich soil amendment — reducing waste and improving gardens.",
          "GREENS (nitrogen-rich): fruit/vegetable scraps, coffee grounds, fresh grass clippings, plant trimmings.",
          "BROWNS (carbon-rich): dry leaves, cardboard, paper, wood chips, rice husks.",
          "Ideal ratio: 1 part greens to 3 parts browns. Too many greens = smelly. Too many browns = slow.",
          "Maintain moisture like a wrung-out sponge — not too wet, not too dry.",
          "Turn the pile every 1–2 weeks to aerate and speed up decomposition.",
          "Avoid composting: meat, fish, dairy, oily foods, pet waste, diseased plants.",
          "A basic backyard bin can be made from bamboo, old drums, or wire mesh.",
          "Compost is ready in 6–8 weeks (hot composting) or 3–6 months (cold composting) — dark, crumbly, earthy smell.",
          "Use finished compost as garden mulch, potting mix, or vegetable bed amendment.",
        ],
      },
      {
        title: "Recycling Tips",
        items: [
          "Know what your local junk shop accepts — common: plastic bottles, cardboard, aluminum, copper wire.",
          "Flatten cardboard boxes and crush plastic bottles to save storage space.",
          "Remove caps from bottles separately — they are often a different type of plastic.",
          "Bring electronic waste (old phones, batteries, chargers) to accredited e-waste collection points.",
          "Upcycle glass jars as food storage, candle holders, or plant pots instead of discarding.",
          "Organize a community 'eco-drive' or waste exchange within your barangay.",
          "Schools and offices: set up paper recycling bins and use both sides before discarding.",
          "Avoid downcycling — shredded paper cannot be recycled again. Use whole sheets for recycling.",
          "Check plastics resin code (1–7 on the bottom): types 1 (PET) and 2 (HDPE) are most widely recycled.",
          "Partner with your barangay's Material Recovery Facility (MRF) for organized recycling collection.",
        ],
      },
    ],
  },
  {
    id: "preparedness",
    icon: "🛡️",
    name: "Disaster Preparedness",
    color: "#7c82d4",
    sections: [
      {
        title: "Building Your Go Bag",
        items: [
          "A Go Bag is a pre-packed bag you can grab in under 2 minutes during an emergency evacuation.",
          "WATER: At least 1 liter per person. Include water purification tablets as backup.",
          "FOOD: 3-day supply of non-perishable, ready-to-eat food (canned goods, energy bars, dried fruit).",
          "DOCUMENTS: Photocopies of IDs, birth certificates, land titles, insurance, and medical records in a waterproof envelope.",
          "FIRST AID: Bandages, antiseptic, pain relievers, prescription medicines (7-day supply), and a first aid manual.",
          "TOOLS: Flashlight + extra batteries, hand-crank or battery radio, whistle, multi-tool knife, duct tape.",
          "CLOTHING: One change of clothes per person, rain poncho, sturdy closed-toe shoes.",
          "COMMUNICATION: List of emergency contacts written on paper (not just stored in phone), local maps.",
          "MONEY: Small bills in a waterproof pouch — ATMs and card readers may be down.",
          "PERSONAL ITEMS: Glasses/contacts, baby needs, pet food if applicable, sanitary supplies.",
        ],
      },
      {
        title: "Family Emergency Plan",
        items: [
          "Hold a family meeting to discuss disasters most likely in your area (typhoon, flood, earthquake).",
          "Designate two meeting points: one near your home, one outside your neighborhood.",
          "Assign roles: who grabs the Go Bag, who helps the elderly/children, who turns off utilities.",
          "Establish an out-of-area contact person that all family members can call or text to check in.",
          "Practice your evacuation route at least twice a year — include nighttime drills.",
          "Know the location of your nearest evacuation center and alternate options.",
          "Plan for pets — identify pet-friendly shelters or arrange with neighbors in advance.",
          "Ensure all family members know how to send an SMS if voice calls fail (texts use less network bandwidth).",
          "Create a communication tree for extended family and neighbors.",
          "Review and update the plan annually or after any significant life change (new baby, elderly parent moved in).",
        ],
      },
      {
        title: "Community Preparedness",
        items: [
          "Join or support your barangay's BDRRMC (Barangay Disaster Risk Reduction and Management Committee).",
          "Participate in community drills organized by your LGU — familiarity reduces panic during real events.",
          "Know your barangay's early warning system: signals, sirens, or announcement methods.",
          "Identify vulnerable neighbors (elderly, disabled, pregnant women, young children) and check on them first.",
          "Map community resources: water sources, first aid kits, generators, vehicles for evacuation.",
          "Establish a barangay emergency fund or resource pool for immediate response.",
          "Train at least one household member in basic first aid and CPR.",
          "Maintain a community bulletin board or group chat for real-time disaster updates.",
          "Advocate for hazard mapping in your barangay — know which areas are highest risk.",
          "After every disaster, conduct a community review to improve preparedness for the next event.",
        ],
      },
    ],
  },
];

// ── PANEL STATE ────────────────────────────────────────────────
let guidePanelOpen = false;

// ── INIT ───────────────────────────────────────────────────────
export function initGuides() {
  createGuidePanel();
  wireGuideNavItem();
}

// ── CREATE PANEL ───────────────────────────────────────────────
function createGuidePanel() {
  // Inject panel HTML into body
  const panel = document.createElement("div");
  panel.id = "guidesPanel";
  panel.innerHTML = `
    <div class="gp-header">
      <div class="gp-header-left">
        <div class="gp-header-icon">📚</div>
        <div>
          <div class="gp-header-title">Survival Guides</div>
          <div class="gp-header-sub">Preparedness & Resources</div>
        </div>
      </div>
      <button class="gp-close-btn" id="closeGuidesPanel" title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="gp-tabs-row">
      <button class="gp-top-tab active" data-top-tab="disaster">
        <span>⚠️</span> Disaster Guides
      </button>
      <button class="gp-top-tab" data-top-tab="resources">
        <span>🌱</span> Resource Guides
      </button>
    </div>

    <div class="gp-body" id="gpBody">

      <!-- DISASTER GUIDES TAB -->
      <div class="gp-tab-content active" id="gp-tab-disaster">

        <!-- Disaster type selector pills -->
        <div class="gp-disaster-pills">
          ${DISASTER_GUIDES.map((g, i) => `
            <button class="gp-disaster-pill ${i === 0 ? "active" : ""}"
              data-disaster="${g.id}"
              style="--pill-color: ${g.color}">
              <span>${g.icon}</span>
              <span>${g.name}</span>
            </button>
          `).join("")}
        </div>

        <!-- Each disaster's content -->
        ${DISASTER_GUIDES.map((guide, gi) => `
          <div class="gp-disaster-content ${gi === 0 ? "active" : ""}" id="gd-${guide.id}">

            <div class="gp-disaster-header" style="--guide-color: ${guide.color}">
              <span class="gp-disaster-big-icon">${guide.icon}</span>
              <div>
                <div class="gp-disaster-name">${guide.name} Guide</div>
                <div class="gp-disaster-count">${guide.before.length + guide.during.length + guide.after.length} tips across 3 phases</div>
              </div>
            </div>

            <!-- Phase tabs -->
            <div class="gp-phase-tabs">
              <button class="gp-phase-tab active" data-guide="${guide.id}" data-phase="before" style="--phase-color: ${guide.color}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Before
                <span class="gp-phase-count">${guide.before.length}</span>
              </button>
              <button class="gp-phase-tab" data-guide="${guide.id}" data-phase="during" style="--phase-color: ${guide.color}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                During
                <span class="gp-phase-count">${guide.during.length}</span>
              </button>
              <button class="gp-phase-tab" data-guide="${guide.id}" data-phase="after" style="--phase-color: ${guide.color}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg>
                After
                <span class="gp-phase-count">${guide.after.length}</span>
              </button>
            </div>

            <!-- Phase content panels -->
            <div class="gp-phase-panel active" id="gpp-${guide.id}-before">
              ${renderGuideItems(guide.before, guide.color)}
            </div>
            <div class="gp-phase-panel" id="gpp-${guide.id}-during">
              ${renderGuideItems(guide.during, guide.color)}
            </div>
            <div class="gp-phase-panel" id="gpp-${guide.id}-after">
              ${renderGuideItems(guide.after, guide.color)}
            </div>
          </div>
        `).join("")}
      </div>

      <!-- RESOURCE GUIDES TAB -->
      <div class="gp-tab-content" id="gp-tab-resources">

        <!-- Resource type selector pills -->
        <div class="gp-disaster-pills">
          ${RESOURCE_MODULES.map((m, i) => `
            <button class="gp-disaster-pill ${i === 0 ? "active" : ""}"
              data-resource="${m.id}"
              style="--pill-color: ${m.color}">
              <span>${m.icon}</span>
              <span>${m.name}</span>
            </button>
          `).join("")}
        </div>

        <!-- Each resource module -->
        ${RESOURCE_MODULES.map((mod, mi) => `
          <div class="gp-resource-content ${mi === 0 ? "active" : ""}" id="gr-${mod.id}">

            <div class="gp-disaster-header" style="--guide-color: ${mod.color}">
              <span class="gp-disaster-big-icon">${mod.icon}</span>
              <div>
                <div class="gp-disaster-name">${mod.name}</div>
                <div class="gp-disaster-count">${mod.sections.length} section${mod.sections.length > 1 ? "s" : ""}</div>
              </div>
            </div>

            <!-- Accordion sections -->
            <div class="gp-accordion">
              ${mod.sections.map((sec, si) => `
                <div class="gp-acc-item" id="gacc-${mod.id}-${si}">
                  <button class="gp-acc-toggle" data-acc="${mod.id}-${si}" style="--acc-color: ${mod.color}">
                    <span class="gp-acc-title">${sec.title}</span>
                    <svg class="gp-acc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  <div class="gp-acc-body">
                    <ol class="gp-resource-list">
                      ${sec.items.map((item, ii) => `
                        <li class="gp-resource-item">
                          <span class="gp-resource-num" style="color:${mod.color}">${String(ii + 1).padStart(2, "0")}</span>
                          <span class="gp-resource-text">${item}</span>
                        </li>
                      `).join("")}
                    </ol>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>

    </div>
  `;

  document.body.appendChild(panel);

  // Wire close button
  document.getElementById("closeGuidesPanel").addEventListener("click", closeGuidePanel);

  // Wire top tabs
  panel.querySelectorAll(".gp-top-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.topTab;
      panel.querySelectorAll(".gp-top-tab").forEach(t => t.classList.remove("active"));
      panel.querySelectorAll(".gp-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`gp-tab-${target}`).classList.add("active");
    });
  });

  // Wire disaster pills
  panel.querySelectorAll("[data-disaster]").forEach(pill => {
    pill.addEventListener("click", () => {
      const id = pill.dataset.disaster;
      panel.querySelectorAll("[data-disaster]").forEach(p => p.classList.remove("active"));
      panel.querySelectorAll(".gp-disaster-content").forEach(c => c.classList.remove("active"));
      pill.classList.add("active");
      document.getElementById(`gd-${id}`).classList.add("active");
      document.getElementById("gpBody").scrollTop = 0;
    });
  });

  // Wire resource pills
  panel.querySelectorAll("[data-resource]").forEach(pill => {
    pill.addEventListener("click", () => {
      const id = pill.dataset.resource;
      panel.querySelectorAll("[data-resource]").forEach(p => p.classList.remove("active"));
      panel.querySelectorAll(".gp-resource-content").forEach(c => c.classList.remove("active"));
      pill.classList.add("active");
      document.getElementById(`gr-${id}`).classList.add("active");
      document.getElementById("gpBody").scrollTop = 0;
    });
  });

  // Wire phase tabs
  panel.querySelectorAll(".gp-phase-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const guideId = tab.dataset.guide;
      const phase   = tab.dataset.phase;
      const content = document.getElementById(`gd-${guideId}`);
      content.querySelectorAll(".gp-phase-tab").forEach(t => t.classList.remove("active"));
      content.querySelectorAll(".gp-phase-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`gpp-${guideId}-${phase}`).classList.add("active");
    });
  });

  // Wire accordion
  panel.querySelectorAll(".gp-acc-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".gp-acc-item");
      const isOpen = item.classList.contains("open");

      // Close all in same module
      const modContent = btn.closest(".gp-resource-content");
      modContent.querySelectorAll(".gp-acc-item").forEach(i => i.classList.remove("open"));

      if (!isOpen) item.classList.add("open");
    });
  });
}

function renderGuideItems(items, color) {
  return `<ol class="gp-guide-list">
    ${items.map((item, i) => `
      <li class="gp-guide-item">
        <span class="gp-guide-num" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44">${String(i + 1).padStart(2, "0")}</span>
        <span class="gp-guide-text">${item}</span>
      </li>
    `).join("")}
  </ol>`;
}

// ── OPEN / CLOSE ───────────────────────────────────────────────
export function openGuidePanel() {
  document.getElementById("guidesPanel").classList.add("open");
  guidePanelOpen = true;
}

export function closeGuidePanel() {
  document.getElementById("guidesPanel").classList.remove("open");
  guidePanelOpen = false;
}

// ── WIRE NAV ITEM ──────────────────────────────────────────────
function wireGuideNavItem() {
  const navItem = document.getElementById("nav-guides");
  if (navItem) {
    navItem.addEventListener("click", (e) => {
      e.preventDefault();
      if (guidePanelOpen) {
        closeGuidePanel();
        navItem.classList.remove("active");
      } else {
        openGuidePanel();
        navItem.classList.add("active");
      }
    });
  }
}