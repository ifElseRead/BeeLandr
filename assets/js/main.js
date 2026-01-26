/**
 * Main Application Controller
 * Manages user roles, UI states, and event orchestration.
 */
import StorageManager from "./services/StorageManager.js";

const storage = new StorageManager();

export const app = {
  role: null,
  modal: null,

  init() {
    const modalEl = document.getElementById("roleModal");
    const switchBtn = document.getElementById("switch-role-btn");

    if (!modalEl) {
      console.error("Role modal not found in DOM");
      return;
    }

    this.modal = new bootstrap.Modal(modalEl);

    if (switchBtn) {
      switchBtn.addEventListener("click", () => this.clearRole());
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
    if (!this.isValidRole(selectedRole)) {
      console.warn("Invalid role selection attempted:", selectedRole);
      return;
    }

    this.role = selectedRole;
    storage.save("userRole", this.role);

    this.modal.hide();
    this.updateUIForRole();

    console.log(`Role set to: ${this.role}`);
  },

  clearRole() {
    this.role = null;
    storage.remove("userRole");

    const sidebarTitle = document.querySelector("#sidebar h2");
    const feedback = document.getElementById("feedback-msg");

    if (sidebarTitle) sidebarTitle.innerText = "Plot Analysis";
    if (feedback) feedback.innerText = "";

    document.body.classList.remove("role-landowner");

    if (window.mapManager) {
      mapManager.enableDraw(false);
      mapManager.clearAll();
    }

    this.modal.show();
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
    document.body.classList.toggle("role-landowner", isLandowner);

    sidebarTitle.innerText = isLandowner
      ? "Landowner Tools"
      : "Beekeeper Search";

    feedback.innerText = isLandowner
      ? "Use the map tools to draw your plot."
      : "Browsing available plots in your area.";

    if (window.mapManager) {
      mapManager.enableDraw(isLandowner);

      if (!isLandowner) {
        this.loadCommunityPlots();
      }
    }
  },

  async loadCommunityPlots() {
    try {
      const response = await fetch("assets/data/landData.json");
      const lands = await response.json();

      if (window.mapManager && lands.length > 0) {
        lands.forEach((land) => {
          if (land.type === "polygon" && land.coordinates) {
            // Draw polygon for large plots
            mapManager.displayPolygon(land);
          } else if (land.lat && land.lng) {
            // Draw marker for point locations
            mapManager.displayMarker(land);
          }
        });
      }
    } catch (error) {
      console.error("Error loading land data:", error);
      document.getElementById("feedback-msg").innerText =
        "Failed to load available land plots.";
    }
  },
};

// Start the app when DOM is ready
document.addEventListener("DOMContentLoaded", () => app.init());

// 👇 expose for inline handlers
window.app = app;
