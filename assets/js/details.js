/**
 * BeeLandr.com - Detail Page Logic
 * Handles data retrieval from LocalStorage and Leaflet Map rendering
 * Includes accessibility features (ARIA live regions, semantic HTML)
 */

import WeatherService from "./services/WeatherService.js";

let detailMap;
let landData = null;
const weatherService = new WeatherService();

document.addEventListener("DOMContentLoaded", () => {
  // 1. Get the ID from the URL (e.g., details.html?id=123)
  const params = new URLSearchParams(window.location.search);
  const landId = params.get("id");

  if (landId) {
    loadLandData(landId);
  } else {
    showError("No plot ID provided.");
  }

  // 2. Set up event listeners
  const contactBtn = document.getElementById("contactBtn");
  if (contactBtn) {
    contactBtn.addEventListener("click", contactOwner);
  }

  // 3. Handle keyboard navigation for map region
  const detailMapEl = document.getElementById("detailMap");
  if (detailMapEl) {
    detailMapEl.setAttribute("tabindex", "0");
    detailMapEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        // Allow map to be interactive with keyboard
        e.preventDefault();
      }
    });
  }
});

/**
 * Loads data from LocalStorage instead of a non-existent API
 */
/**
 * Loads data from both the JSON file and LocalStorage
 */
async function loadLandData(id) {
  try {
    // 1. Fetch the "Seed" plots from your JSON file
    const response = await fetch("assets/data/landData.json");
    const seedPlots = await response.json();

    // 2. Fetch the "User" plots from LocalStorage (CORRECTED KEY)
    // We use "user_plots" to match your main.js
    const userPlots = JSON.parse(localStorage.getItem("user_plots")) || [];

    // 3. Combine them into one list
    const allPlots = [...seedPlots, ...userPlots];

    // 4. Find the specific plot by ID
    landData = allPlots.find((land) => land.id == id);

    if (!landData) {
      throw new Error("Plot not found in system.");
    }

    // Success: Populate the UI
    displayLandDetails(landData);
    initDetailMap(landData);
    loadWeather(landData); // Fetch and display weather data
  } catch (error) {
    console.error("BeeLandr Error:", error);
    showError("Plot not found. It may have been deleted or moved.");
  }
}

/**
 * Injects the land data into the HTML elements
 */
function displayLandDetails(land) {
  // Helper to get ONLY numbers from a string (fixes NaN and "Area: 1200" issues)
  const extractNumber = (val) => {
    if (!val) return 0;
    // This regex removes everything EXCEPT numbers and decimals
    const num = String(val).replace(/[^0-9.]/g, "");
    return parseFloat(num) || 0;
  };

  // 1. Basic Text
  setTextContent("ownerName", land.ownerName || "Unnamed Plot");
  setTextContent("landType", land.landType || "Not Specified");
  setTextContent("suitability", land.suitability || "Pending Assessment");

  // 2. Area Display
  const areaValue = extractNumber(land.area);
  const areaEl = document.getElementById("area");
  if (areaEl) {
    areaEl.textContent = `${areaValue.toLocaleString()} m²`;
  }

  // 3. Land Size (Based on the extracted number)
  let sizeCategory = "Small";
  if (areaValue > 5000) sizeCategory = "Large";
  else if (areaValue > 1000) sizeCategory = "Medium";
  setTextContent("landSize", sizeCategory);

  // 4. Hive Capacity (Fixes the "Hives Hives" and huge number issue)
  const hiveValue = extractNumber(land.hives);
  const hivesEl = document.getElementById("hives");
  if (hivesEl) {
    hivesEl.textContent = `${hiveValue.toLocaleString()} Hives`;
  }

  // 5. Coordinates (The "-" fix)
  if (land.coordinates && land.coordinates.length > 0) {
    const p = land.coordinates[0];
    const lat = p.lat !== undefined ? p.lat : p[0];
    const lng = p.lng !== undefined ? p.lng : p[1];
    setTextContent(
      "coordinates",
      `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`,
    );
  } else if (land.lat && land.lng) {
    setTextContent(
      "coordinates",
      `${parseFloat(land.lat).toFixed(5)}, ${parseFloat(land.lng).toFixed(5)}`,
    );
  }

  // 6. Email Link
  const emailEl = document.getElementById("email");
  if (emailEl && land.email) {
    emailEl.innerHTML = `<a href="mailto:${land.email}" class="text-warning">${land.email}</a>`;
  }
}

/**
 * Initializes the Leaflet Map for the specific plot
 */
function initDetailMap(land) {
  const lat = land.lat || 51.505;
  const lng = land.lng || -0.09;

  // Check if map container exists
  if (!document.getElementById("detailMap")) return;

  detailMap = L.map("detailMap").setView([lat, lng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(detailMap);

  // If we have polygon coordinates, draw the shape
  if (
    land.coordinates &&
    Array.isArray(land.coordinates) &&
    land.coordinates.length > 0
  ) {
    L.polygon(land.coordinates, {
      color: "#FBC02D",
      fillColor: "#FBC02D",
      fillOpacity: 0.3,
      weight: 3,
    }).addTo(detailMap);

    // Zoom map to fit the polygon
    const bounds = L.latLngBounds(land.coordinates);
    detailMap.fitBounds(bounds);
  } else {
    // Fallback to a marker
    L.marker([lat, lng])
      .addTo(detailMap)
      .bindPopup(land.ownerName || "Plot Location")
      .openPopup();
  }
}

/**
 * Simple helper to safely set text
 */
function setTextContent(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Reusable error UI
 */
function showError(msg) {
  const container = document.querySelector(".container-fluid") || document.body;
  container.innerHTML = `
        <div class="container mt-5">
            <div class="alert alert-danger">
                <h4>🐝 Oops!</h4>
                <p>${msg}</p>
                <hr>
                <a href="index.html" class="btn btn-outline-danger">Return to Main Map</a>
            </div>
        </div>`;
}

/**
 * Action for the contact button
 */
function contactOwner() {
  if (!landData) return;

  if (landData.email) {
    window.location.href = `mailto:${landData.email}?subject=BeeLandr Inquiry: ${landData.ownerName}`;
  } else {
    alert("This landowner hasn't provided an email address.");
  }
}

/**
 * Fetches and displays weather data for the plot
 */
async function loadWeather(land) {
  try {
    const lat = land.lat || land.coordinates?.[0]?.lat || 51.505;
    const lng = land.lng || land.coordinates?.[0]?.lng || -0.09;

    const weather = await weatherService.getWeatherForPlot(lat, lng);

    // Update temperature
    const avgTempEl = document.getElementById("avgTemp");
    if (avgTempEl) {
      avgTempEl.innerHTML = `${weather.temperature}°C <small class="text-muted">(${weather.minTemp}°C - ${weather.maxTemp}°C)</small>`;
    }

    // Update humidity
    const humidityEl = document.getElementById("humidity");
    if (humidityEl) {
      humidityEl.textContent = `${weather.humidity}%`;
    }

    // Update rainfall
    const rainfallEl = document.getElementById("rainfall");
    if (rainfallEl) {
      rainfallEl.textContent = `${weather.rainfall} mm/year`;
    }

    // Update wind speed
    const windSpeedEl = document.getElementById("windSpeed");
    if (windSpeedEl) {
      windSpeedEl.textContent = `${weather.windSpeed} km/h`;
    }

    // Update bee score
    const beeScoreBar = document.getElementById("beeScoreBar");
    const beeScoreText = document.getElementById("beeScoreText");
    const beeScoreDesc = document.getElementById("beeScoreDesc");

    if (beeScoreBar && beeScoreText && beeScoreDesc) {
      const score = weather.beeScore;
      beeScoreBar.style.width = `${score}%`;
      beeScoreBar.setAttribute("aria-valuenow", score);
      beeScoreText.textContent = `${score}%`;

      // Update color based on score
      if (score >= 80) {
        beeScoreBar.className = "progress-bar bg-success";
        beeScoreDesc.textContent = "Excellent conditions for beekeeping";
      } else if (score >= 60) {
        beeScoreBar.className = "progress-bar bg-warning";
        beeScoreDesc.textContent = "Good conditions for beekeeping";
      } else if (score >= 40) {
        beeScoreBar.className = "progress-bar bg-info";
        beeScoreDesc.textContent = "Moderate conditions for beekeeping";
      } else {
        beeScoreBar.className = "progress-bar bg-danger";
        beeScoreDesc.textContent = "Challenging conditions for beekeeping";
      }
    }

    // Update foraging/pollen information if available
    if (weather.pollen) {
      const forageIndexBar = document.getElementById("forageIndexBar");
      const forageIndexText = document.getElementById("forageIndexText");
      const dominantPollenEl = document.getElementById("dominantPollen");

      if (forageIndexBar && forageIndexText && dominantPollenEl) {
        const forageIndex = weather.pollen.forageIndex;
        forageIndexBar.style.width = `${forageIndex}%`;
        forageIndexBar.setAttribute("aria-valuenow", forageIndex);
        forageIndexText.textContent = `${forageIndex}%`;

        // Update color based on foraging quality
        if (forageIndex >= 80) {
          forageIndexBar.className = "progress-bar bg-success";
        } else if (forageIndex >= 60) {
          forageIndexBar.className = "progress-bar bg-info";
        } else if (forageIndex >= 40) {
          forageIndexBar.className = "progress-bar bg-warning";
        } else {
          forageIndexBar.className = "progress-bar bg-danger";
        }

        // Display dominant pollen type
        const dominant = weather.pollen.dominant || "none";
        const pollenEmojis = {
          birch: "🌳",
          grass: "🌾",
          ragweed: "🌿",
          alder: "🌲",
          mugwort: "🌱",
          olive: "🫒",
          none: "❌",
        };
        dominantPollenEl.textContent = `${pollenEmojis[dominant] || "❓"} ${
          dominant.charAt(0).toUpperCase() + dominant.slice(1)
        }`;
      }

      // Display individual pollen levels
      const pollenAverages = weather.pollen.averages || {};
      const birchEl = document.querySelector("#birchPollen span");
      const grassEl = document.querySelector("#grassPollen span");
      const ragweedEl = document.querySelector("#ragweedPollen span");

      if (birchEl) birchEl.textContent = Math.round(pollenAverages.birch || 0);
      if (grassEl) grassEl.textContent = Math.round(pollenAverages.grass || 0);
      if (ragweedEl)
        ragweedEl.textContent = Math.round(pollenAverages.ragweed || 0);
    } else {
      // Hide pollen section if not available
      const pollenSection = document.getElementById("dominantPollen");
      if (pollenSection) {
        pollenSection.textContent =
          "🌍 Pollen data not available in this region";
        pollenSection.style.color = "#999";
      }
    }
  } catch (error) {
    console.error("Error loading weather data:", error);
    // Set default UI values on error
    const avgTempEl = document.getElementById("avgTemp");
    const humidityEl = document.getElementById("humidity");
    const rainfallEl = document.getElementById("rainfall");
    const windSpeedEl = document.getElementById("windSpeed");

    if (avgTempEl) avgTempEl.textContent = "Unable to load";
    if (humidityEl) humidityEl.textContent = "Unable to load";
    if (rainfallEl) rainfallEl.textContent = "Unable to load";
    if (windSpeedEl) windSpeedEl.textContent = "Unable to load";
  }
}
