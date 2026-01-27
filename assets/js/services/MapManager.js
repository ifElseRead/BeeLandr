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
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Add drawn items layer
    this.map.addLayer(this.drawnItems);

    // Add feature group for loaded data
    this.map.addLayer(this.featureGroup);

    // Initialize drawing tools
    this.initDrawControl();

    console.log("MapManager initialized");
  }

  initDrawControl() {
    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.drawnItems,
      },
      draw: {
        polygon: true,
        polyline: false,
        rectangle: true,
        circle: false,
        marker: false,
      },
    });
    this.map.addControl(this.drawControl);
  }

  displayMarker(land) {
    if (!this.map || !land.lat || !land.lng) return;

    const marker = L.marker([land.lat, land.lng]).addTo(this.featureGroup);

    const popupContent = `
      <strong>${land.ownerName}</strong><br/>
      <small>${land.landType}</small><br/>
      ${land.description}<br/>
      📧 ${land.email}<br/>
      📞 ${land.phone}<br/>
      Size: ${land.landSize}ha | Suitability: ${land.suitability}/10
    `;

    marker.bindPopup(popupContent);
    console.log(
      `Marker added for ${land.ownerName} at [${land.lat}, ${land.lng}]`,
    );
  }

  displayPolygon(land) {
    if (!this.map || !land.coordinates || !Array.isArray(land.coordinates))
      return;

    const polygon = L.polygon(land.coordinates, {
      color: this.getSuitabilityColor(land.suitability),
      weight: 2,
      opacity: 0.7,
      fillOpacity: 0.4,
    }).addTo(this.featureGroup);

    const popupContent = `
      <strong>${land.ownerName}</strong><br/>
      <small>${land.landType}</small><br/>
      ${land.description}<br/>
      📧 ${land.email}<br/>
      📞 ${land.phone}<br/>
      Size: ${land.landSize}ha | Suitability: ${land.suitability}/10
    `;

    polygon.bindPopup(popupContent);
    console.log(`Polygon added for ${land.ownerName}`);
  }

  getSuitabilityColor(suitability) {
    if (suitability >= 9) return "#2ecc71"; // Green - Excellent
    if (suitability >= 8) return "#27ae60"; // Dark green - Very good
    if (suitability >= 7) return "#f39c12"; // Orange - Good
    return "#e74c3c"; // Red - Fair
  }

  displayPlots(plots) {
    if (!plots || !Array.isArray(plots)) {
      console.warn("No plots to display");
      return;
    }

    console.log(`Loading ${plots.length} plots...`);

    plots.forEach((plot) => {
      if (plot.type === "polygon" && plot.coordinates) {
        this.displayPolygon(plot);
      } else if (plot.lat && plot.lng) {
        this.displayMarker(plot);
      }
    });

    // Fit map to all features
    if (this.featureGroup.getLayers().length > 0) {
      this.map.fitBounds(this.featureGroup.getBounds(), { padding: [50, 50] });
      console.log(
        `Map fitted to ${this.featureGroup.getLayers().length} features`,
      );
    }
  }

  enableDraw(enable) {
    if (!this.drawControl) return;

    if (enable) {
      this.map.addControl(this.drawControl);
    } else {
      this.map.removeControl(this.drawControl);
    }
  }

  clearAll() {
    this.drawnItems.clearLayers();
    this.featureGroup.clearLayers();
    console.log("Cleared all map features and drawn items");
  }
}
