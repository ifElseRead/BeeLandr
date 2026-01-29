/**
 * MapManager Service
 * Handles all map interactions including markers, polygons, and drawing
 */

export default class MapManager {
  constructor(mapElement = "map") {
    this.mapElement = mapElement;
    this.map = null;
    this.drawnItems = new L.FeatureGroup();
    this.drawControl = null;
    this.featureGroup = new L.FeatureGroup(); // Group to track all loaded features
  }

  init() {
    // Initialize Leaflet map
    this.map = L.map(this.mapElement).setView([51.5074, -0.1278], 13);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(this.map);

    // Add layers to map
    this.map.addLayer(this.drawnItems);
    this.map.addLayer(this.featureGroup);

    // Initialize drawing tools
    this.initDrawControl();

    // Event: User finishes drawing a shape
    this.map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;

      // Clear previous unsaved drawings
      this.drawnItems.clearLayers();
      this.drawnItems.addLayer(layer);

      // Calculate and update Sidebar UI
      this.updateSidebarStats(layer);
    });

    console.log("MapManager initialized");
  }

  /**
   * Calculates area and updates the sidebar DOM elements
   */
  updateSidebarStats(layer) {
    let areaValue = 0;
    let areaText = "0 m²";
    let hiveCount = 0;

    // Check if it's a polygon or rectangle
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      const latlngs = layer.getLatLngs()[0];

      // Use GeometryUtil if available, else fallback to 0
      if (L.GeometryUtil) {
        areaValue = L.GeometryUtil.geodesicArea(latlngs);
        areaText = `${Math.round(areaValue).toLocaleString()} m²`;
        // Formula: roughly 1 hive per 10 square meters = 10 foot buffer
        hiveCount = Math.floor(areaValue / 10);
      } else {
        console.warn(
          "Leaflet.GeometryUtil not found. Please add the script tag to index.html",
        );
        areaText = "GeometryUtil Missing";
      }
    }

    // Update the Sidebar UI
    const areaDisplay = document.getElementById("area-display");
    const hiveDisplay = document.getElementById("hive-display");

    if (areaDisplay) areaDisplay.innerText = areaText;
    if (hiveDisplay) hiveDisplay.innerText = `${hiveCount} Hives`;
  }

  initDrawControl() {
    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.drawnItems,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: "#ffc107" },
        },
        rectangle: {
          shapeOptions: { color: "#ffc107" },
        },
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });
    this.map.addControl(this.drawControl);
  }

  displayMarker(land) {
    // 1. Validation: Ensure map exists and we have coordinates
    if (!this.map || (!land.lat && !land.lng)) return;

    const isUser = land.isUserCreated;
    const detailsUrl = `details.html?id=${land.id}`;

    // 2. Create the marker
    // Optional: You could use a custom icon here for user-created markers
    const marker = L.marker([land.lat, land.lng]).addTo(this.featureGroup);

    // 3. Prepare the popup content (Matching displayPolygon structure)
    const popupContent = `
    <div class="bee-popup">
      <h6 class="mb-1 fw-bold">${land.ownerName || "Unnamed Plot"}</h6>
      <p class="small text-muted mb-1"><strong>Type:</strong> ${land.landType || "Unknown"}</p>
      <p class="small text-muted mb-1"><strong>Size:</strong> ${land.landSize || land.area || "N/A"}</p>
      <p class="small text-muted mb-1"><strong>Suitability:</strong> ${land.suitability || "N/A"}</p>
            <p class="small text-muted mb-1"><strong>Hive Capacity:</strong> ${land.hives || "N/Asssss"}</p>
      <p class="small text-muted mb-1"><strong>Contact:</strong> ${land.email || land.phone || "N/A"}</p>
      <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
        <span class="badge bg-warning text-dark">${land.status || (isUser ? "Local" : "Available")}</span>
        <a href="${detailsUrl}" class="btn btn-sm btn-dark text-warning fw-bold border-warning" style="font-size: 0.7rem;">
          VIEW DETAILS →
        </a>
      </div>
    </div>
  `;

    // 4. Bind popup with consistent constraints
    marker.bindPopup(popupContent, {
      maxWidth: 220,
    });
  }
  displayPolygon(land) {
    if (!this.map || !land.coordinates) return;

    const isUser = land.isUserCreated;
    const detailsUrl = `details.html?id=${land.id}`;

    const polygon = L.polygon(land.coordinates, {
      color: isUser ? "#ffc107" : "#2E8B57",
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.4,
    }).addTo(this.featureGroup);

    const popupContent = `
    <div class="bee-popup">
      <h6 class="mb-1 fw-bold">${land.ownerName || "Unnamed Plot"}</h6>
      <p class="small text-muted mb-1"><strong>Type:</strong> ${land.landType || "Unknown"}</p>
      <p class="small text-muted mb-1"><strong>Size:</strong> ${land.landSize || land.area || "N/A"}</p>
      <p class="small text-muted mb-1"><strong>Suitability:</strong> ${land.suitability || "N/A"}</p>
      <p class="small text-muted mb-1"><strong>Hive Capacity:</strong> ${land.hives || "N/A"}</p>
      <p class="small text-muted mb-1"><strong>Contact:</strong> ${land.email || land.phone || "N/A"}</p>
      <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
        <span class="badge bg-warning text-dark">${land.status || (isUser ? "Local" : "Available")}</span>
        <a href="${detailsUrl}" class="btn btn-sm btn-dark text-warning fw-bold border-warning" style="font-size: 0.7rem;">
          VIEW DETAILS →
        </a>
      </div>
    </div>
  `;

    polygon.bindPopup(popupContent, {
      maxWidth: 220,
    });
  }

  enableDraw(enable) {
    if (!this.drawControl) return;
    enable
      ? this.map.addControl(this.drawControl)
      : this.map.removeControl(this.drawControl);
  }

  clearAll() {
    this.drawnItems.clearLayers();
    this.featureGroup.clearLayers();
    // Reset sidebar text
    const areaDisplay = document.getElementById("area-display");
    const hiveDisplay = document.getElementById("hive-display");
    if (areaDisplay) areaDisplay.innerText = "No plot drawn yet.";
    if (hiveDisplay) hiveDisplay.innerText = "0 Hives";
  }

  getDrawnLayer() {
    const layers = this.drawnItems.getLayers();
    return layers.length > 0 ? layers[layers.length - 1] : null;
  }

  clearDrawLayer() {
    this.drawnItems.clearLayers();
  }
}
