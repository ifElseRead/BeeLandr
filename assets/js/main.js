/**
 * Main Application Controller
 * Manages user roles, UI states, and event orchestration.
 */
import StorageManager from "./services/StorageManager.js";
import MapManager from "./services/MapManager.js";

const storage = new StorageManager();
let mapManager = null;

export const app = {
  role: null,
  modal: null,

  init() {
    console.log("App init() starting...");

    const modalEl = document.getElementById("roleModal");
    const switchBtn = document.getElementById("switch-role-btn");

    console.log("Modal element found:", !!modalEl);
    console.log("Switch button found:", !!switchBtn);

    if (!modalEl) {
      console.error("Role modal not found in DOM");
      return;
    }

    this.modal = new bootstrap.Modal(modalEl);

    if (switchBtn) {
      console.log("Attaching click listener to switch role button");
      switchBtn.addEventListener("click", () => this.clearRole());
    } else {
      console.error("Switch role button not found!");
    }

    const savedRole = storage.load("userRole");

    if (this.isValidRole(savedRole)) {
      this.role = savedRole;
      this.updateUIForRole();
      console.log(`Restored role from storage: ${this.role}`);
    } else {
      this.modal.show();
      console.log("No stored role found. Awaiting role selection...");
    }
  },

  setRole(selectedRole) {
    console.log(`setRole() called with: ${selectedRole}`);

    if (!this.isValidRole(selectedRole)) {
      console.warn("Invalid role selection attempted:", selectedRole);
      return;
    }

    this.role = selectedRole;
    storage.save("userRole", this.role);

    console.log("Hiding modal...");
    this.modal.hide();

    this.updateUIForRole();

    console.log(`Role set to: ${this.role}`);
  },

  clearRole() {
    console.log("clearRole() called");
    this.role = null;
    storage.remove("userRole");

    const sidebarTitle = document.querySelector("#sidebar h2");
    const feedback = document.getElementById("feedback-msg");

    if (sidebarTitle) sidebarTitle.innerText = "Plot Analysis";
    if (feedback) feedback.innerText = "";

    document.body.classList.remove("role-landowner");

    if (window.mapManager) {
      console.log("Clearing map...");
      window.mapManager.enableDraw(false);
      window.mapManager.clearAll();
    }

    if (this.modal) {
      console.log("Showing modal...");
      this.modal.show();
    } else {
      console.error("Modal not initialized!");
    }

    console.log("Role cleared. Awaiting new selection.");
  },

  isValidRole(role) {
    return role === "landowner" || role === "beekeeper";
  },

  updateUIForRole() {
    const sidebarTitle = document.querySelector("#sidebar h2");
    const feedback = document.getElementById("feedback-msg");

    if (!sidebarTitle || !feedback) {
      console.warn("UI elements missing");
      return;
    }

    const isLandowner = this.role === "landowner";
    console.log(
      `Updating UI for role: ${this.role} (isLandowner: ${isLandowner})`,
    );

    document.body.classList.toggle("role-landowner", isLandowner);

    sidebarTitle.innerText = isLandowner
      ? "Landowner Tools"
      : "Beekeeper Search";

    feedback.innerText = isLandowner
      ? "Use the map tools to draw your plot."
      : "Browsing available plots in your area.";

    if (window.mapManager) {
      console.log("MapManager available, calling methods...");
      window.mapManager.enableDraw(isLandowner);

      if (!isLandowner) {
        console.log("Loading community plots...");
        this.loadCommunityPlots();
      }
    } else {
      console.warn("MapManager not available");
    }
  },

  async loadCommunityPlots() {
    try {
      console.log("Loading community plots...");
      const response = await fetch("assets/data/landData.json");
      const lands = await response.json();

      console.log(`Fetched ${lands.length} land entries`);

      if (window.mapManager && lands.length > 0) {
        console.log("Displaying plots on map...");
        lands.forEach((land) => {
          if (land.type === "polygon" && land.coordinates) {
            // Draw polygon for large plots
            window.mapManager.displayPolygon(land);
          } else if (land.lat && land.lng) {
            // Draw marker for point locations
            window.mapManager.displayMarker(land);
          }
        });
        console.log("All plots displayed");
      } else {
        console.warn("mapManager not available or no lands to display");
      }
    } catch (error) {
      console.error("Error loading land data:", error);
      document.getElementById("feedback-msg").innerText =
        "Failed to load available land plots.";
    }
  },
};

// Start the app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize map first
  mapManager = new MapManager("map");
  mapManager.init();

  // Expose map manager globally
  window.mapManager = mapManager;

  // Then initialize app
  app.init();
});

// 👇 expose for inline handlers
window.app = app;
