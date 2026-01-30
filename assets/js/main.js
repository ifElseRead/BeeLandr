/**
 * Main Application Controller (main.js)
 * Manages user roles, UI states, and data persistence.
 */
import StorageManager from "./services/StorageManager.js";
import MapManager from "./services/MapManager.js";

const ROLES = { LANDOWNER: "landowner", BEEKEEPER: "beekeeper" };

const ROLE_SETTINGS = {
  [ROLES.LANDOWNER]: {
    title: "Plot Analysis",
    message: "Use the map tools to draw your plot.",
    draw: true,
  },
  [ROLES.BEEKEEPER]: {
    title: "Find Hive Space",
    message: "Browsing available plots in your area.",
    draw: false,
  },
};

export const app = {
  state: {
    role: null,
    modal: null,
    map: null,
    filters: { hiveCapacity: null, landType: null },
    allPlots: [],
  },
  storage: new StorageManager(),

  // Cached DOM elements
  el: {
    sidebarTitle: null,
    feedback: null,
    switchBtn: null,
    saveBtn: null,
    clearBtn: null,
    saveForm: null,
    plotInfo: null, // Landowner specific
    landownerActions: null, // Landowner specific
    filterContainer: null, // Beekeeper specific
    hiveCapacityFilter: null,
    landTypeFilter: null,
    applyFiltersBtn: null,
  },

  init(mapInstance) {
    this.state.map = mapInstance;
    this.cacheElements();
    this.bindEvents();

    const savedRole = this.storage.load("userRole");
    if (this.isValidRole(savedRole)) {
      this.setRole(savedRole, false);
    } else {
      this.state.modal.show();
    }
  },

  cacheElements() {
    this.el.sidebarTitle = document.querySelector("#sidebar h2");
    this.el.feedback = document.getElementById("feedback-msg");
    this.el.switchBtn = document.getElementById("switch-role-btn");

    this.el.saveBtn = document.getElementById("save-btn");
    this.el.clearBtn = document.getElementById("clear-btn");
    this.el.saveForm = document.getElementById("save-plot-form");

    this.el.landownerSection = document.getElementById("landowner-section");
    this.el.beekeeperSection = document.getElementById("beekeeper-section");

    this.el.hiveCapacityFilter = document.getElementById(
      "hive-capacity-filter",
    );
    this.el.landTypeFilter = document.getElementById("land-type-filter");
    this.el.applyFiltersBtn = document.getElementById("apply-filters-btn");

    this.state.modal = new bootstrap.Modal(
      document.getElementById("roleModal"),
    );
  },

  bindEvents() {
    // 1. Role Management
    this.el.switchBtn?.addEventListener("click", () => this.clearRole());

    // 2. Open the Save Modal (Triggered by button on sidebar)
    this.el.saveBtn?.addEventListener("click", () => this.handleSavePlot());

    // 3. The Actual Save (Triggered by the form inside the modal)
    this.el.saveForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.finalizeSave();
    });

    // 4. Map Utility
    this.el.clearBtn?.addEventListener("click", () => {
      this.state.map.clearDrawLayer();
      this.el.feedback.innerText = "Map cleared.";
    });

    // 5. Beekeeper Filter Events
    this.el.applyFiltersBtn?.addEventListener("click", () => {
      this.state.filters.hiveCapacity = this.el.hiveCapacityFilter.value;
      this.state.filters.landType = this.el.landTypeFilter.value;
      this.applyFilters();
    });
  },

  handleSavePlot() {
    const layer = this.state.map.getDrawnLayer();
    const currentArea = document.getElementById("area-display")?.innerText;
    const currentHives = document.getElementById("hive-display")?.innerText;

    if (!layer || currentArea === "No plot drawn yet.") {
      alert("Wait! You need to draw a shape on the map first.");
      return;
    }

    this.el.saveForm.reset();
    document.getElementById("modal-area-summary").innerText =
      `Area: ${currentArea}`;
    document.getElementById("modal-hive-summary").innerText =
      `Capacity: ${currentHives}`;

    const saveModal = new bootstrap.Modal(document.getElementById("saveModal"));
    saveModal.show();
  },

  finalizeSave() {
    // 1. Identify the drawn layer from MapManager
    const layer = this.state.map.getDrawnLayer();
    if (!layer) {
      console.error("Save triggered, but no layer found on the map.");
      return;
    }

    // 2. Handle Focus & Accessibility
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 3. Normalize Coordinates
    // flatten nested arrays if necessary
    let rawCoords = layer.getLatLngs();
    const normalizedCoords = Array.isArray(rawCoords[0])
      ? rawCoords[0]
      : rawCoords;

    // 4. Construct the Plot Object
    const newPlot = {
      id: `local-${Date.now()}`, // Unique ID for local storage plots
      ownerName: document.getElementById("plot-name")?.value || "Anonymous",
      landType: document.getElementById("land-type")?.value || "Unspecified",
      email: document.getElementById("plot-email")?.value, // email is required in HTML
      phone: document.getElementById("plot-phone")?.value || "N/A",
      type: "polygon",
      coordinates: normalizedCoords,
      area: document.getElementById("area-display")?.innerText || "0",
      hives: document.getElementById("hive-display")?.innerText || "0",
      timestamp: new Date().toISOString(),
      isUserCreated: true,
    };

    // 5. Persistence: Save to LocalStorage
    try {
      const existingPlots = this.storage.load("user_plots") || [];
      existingPlots.push(newPlot);
      this.storage.save("user_plots", existingPlots);

      console.log("✅ Plot successfully saved to storage:", newPlot);
    } catch (err) {
      console.error("❌ Failed to save plot to storage:", err);
      alert(
        "There was an error saving your plot. Local storage might be full.",
      );
      return;
    }

    // 6. UI Cleanup & Modal Handling
    const saveModalEl = document.getElementById("saveModal");
    const modalInstance = bootstrap.Modal.getInstance(saveModalEl);
    if (modalInstance) {
      modalInstance.hide();
    }

    // 7. Map & UI Refresh
    this.state.map.clearDrawLayer(); // Remove the "editable" drawing
    this.loadCommunityPlots(); // Refresh the map to show the new "saved" plot

    // Visual feedback for the user
    if (this.el.feedback) {
      this.el.feedback.innerText = "Plot saved successfully! 🍯";
      this.el.feedback.className = "text-success fw-bold p-2";
    }

    // 8. Refocus on the map
    document.getElementById("map")?.focus();
  },

  setRole(role, shouldSave = true) {
    if (!this.isValidRole(role)) return;
    this.state.role = role;
    if (shouldSave) this.storage.save("userRole", role);

    this.state.modal.hide();
    this.updateUI();
  },

  updateUI() {
    const settings = ROLE_SETTINGS[this.state.role];
    if (!settings) return;

    // 1. Text & Theme
    if (this.el.sidebarTitle) this.el.sidebarTitle.innerText = settings.title;
    document.body.classList.remove("role-landowner", "role-beekeeper");
    document.body.classList.add(`role-${this.state.role}`);

    // 2. Map Drawing
    this.state.map.enableDraw(settings.draw);

    // 3. THE TOGGLE (Crucial)
    const isLandowner = this.state.role === "landowner";

    if (this.el.landownerSection) {
      this.el.landownerSection.style.display = isLandowner ? "block" : "none";
    }

    if (this.el.beekeeperSection) {
      this.el.beekeeperSection.style.display = isLandowner ? "none" : "block";
    }

    this.loadCommunityPlots();
  },

  async loadCommunityPlots() {
    try {
      const response = await fetch("assets/data/landData.json");
      const seedPlots = await response.json();
      const userPlots = this.storage.load("user_plots") || [];
      this.state.allPlots = [...seedPlots, ...userPlots];
      this.applyFilters();
    } catch (error) {
      console.error("Sync error:", error);
    }
  },

  applyFilters() {
    let filtered = this.state.allPlots;

    if (this.state.filters.hiveCapacity) {
      const min = parseInt(this.state.filters.hiveCapacity);
      filtered = filtered.filter((p) => (parseInt(p.hives) || 0) <= min);
    }

    if (this.state.filters.landType) {
      filtered = filtered.filter(
        (p) => p.landType === this.state.filters.landType,
      );
    }

    this.state.map.clearAll();
    filtered.forEach((plot) => {
      plot.type === "polygon"
        ? this.state.map.displayPolygon(plot)
        : this.state.map.displayMarker(plot);
    });

    if (this.state.role === ROLES.BEEKEEPER) {
      this.el.feedback.innerText = `Found ${filtered.length} plots matching your criteria.`;
    }
  },

  clearRole() {
    this.state.role = null;
    this.storage.remove("userRole");
    this.state.modal.show();
  },

  isValidRole: (role) => Object.values(ROLES).includes(role),
};

// Orchestration
document.addEventListener("DOMContentLoaded", () => {
  const mapManager = new MapManager("map");
  mapManager.init();
  app.init(mapManager);
  window.app = app;
});
