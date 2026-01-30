/**
 * WeatherService
 * Fetches weather and air quality (pollen) data using Open-Meteo APIs (free, no API key required)
 * Returns weather metrics and pollen availability for bee foraging
 */

export default class WeatherService {
  constructor() {
    this.cacheKey = "beeLandr_weather_cache";
    this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
    this.apiBase = "https://api.open-meteo.com/v1/forecast";
    this.airQualityBase =
      "https://air-quality-api.open-meteo.com/v1/air-quality";
  }

  /**
   * Fetches weather and pollen data for a specific latitude and longitude
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object>} Weather data with temperature, humidity, rainfall, wind, and pollen
   */
  async getWeatherForPlot(lat, lng) {
    try {
      // Check cache first
      const cached = this.getFromCache(lat, lng);
      if (cached) {
        return cached;
      }

      // Fetch weather data
      const weatherParams = new URLSearchParams({
        latitude: lat,
        longitude: lng,
        daily:
          "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_max",
        timezone: "auto",
      });

      const weatherResponse = await fetch(`${this.apiBase}?${weatherParams}`);
      if (!weatherResponse.ok) throw new Error("Weather API request failed");
      const weatherData = await weatherResponse.json();

      // Fetch pollen data (Europe only, but gracefully handle failures)
      let pollenData = null;
      try {
        const pollenParams = new URLSearchParams({
          latitude: lat,
          longitude: lng,
          hourly:
            "birch_pollen,grass_pollen,ragweed_pollen,alder_pollen,mugwort_pollen,olive_pollen",
          timezone: "auto",
        });

        const pollenResponse = await fetch(
          `${this.airQualityBase}?${pollenParams}`,
        );
        if (pollenResponse.ok) {
          pollenData = await pollenResponse.json();
        }
      } catch (pollenError) {
        console.warn("Pollen data not available for this region:", pollenError);
      }

      const processedData = this.processWeatherData(weatherData);
      const finalData = pollenData
        ? this.integratePollenData(processedData, pollenData)
        : processedData;

      // Cache the result
      this.saveToCache(lat, lng, finalData);

      return finalData;
    } catch (error) {
      console.error("WeatherService Error:", error);
      return this.getDefaultWeather();
    }
  }

  /**
   * Integrates pollen data into weather data
   * @param {Object} weatherData - Processed weather data
   * @param {Object} pollenData - Raw pollen data from API
   * @returns {Object} Combined weather and pollen data
   */
  integratePollenData(weatherData, pollenData) {
    const hourly = pollenData.hourly;

    // Calculate average pollen levels for major bee forage plants
    const pollenTypes = {
      birch: hourly.birch_pollen || [],
      grass: hourly.grass_pollen || [],
      ragweed: hourly.ragweed_pollen || [],
      alder: hourly.alder_pollen || [],
      mugwort: hourly.mugwort_pollen || [],
      olive: hourly.olive_pollen || [],
    };

    const pollenAverages = {};
    let totalPollenScore = 0;

    Object.entries(pollenTypes).forEach(([type, values]) => {
      if (values.length > 0) {
        pollenAverages[type] = this.calculateAverage(values);
        totalPollenScore += pollenAverages[type];
      }
    });

    // Determine dominant pollen type
    const dominantPollen = Object.entries(pollenAverages).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      ["none", 0],
    )[0];

    return {
      ...weatherData,
      pollen: {
        averages: pollenAverages,
        dominant: dominantPollen,
        totalScore: totalPollenScore,
        forageIndex: this.calculateForageIndex(pollenAverages),
      },
    };
  }

  /**
   * Calculates a foraging index (0-100) based on pollen availability
   * Higher = better forage available
   */
  calculateForageIndex(pollenAverages) {
    // Ideal pollen levels for bee foraging
    // Most pollen types: 0-2000 grains/m³ is moderate to good
    let score = 50; // Start at baseline

    const optimalRange = (value) => {
      if (value < 50) return 0; // Too little pollen
      if (value < 500) return Math.round((value / 500) * 50); // Low to moderate
      if (value < 2000) return 50 + Math.round(((value - 500) / 1500) * 30); // Moderate to good
      if (value < 5000) return 80 + Math.round(((value - 2000) / 3000) * 15); // Very good
      return 100; // Excellent
    };

    let contributingPollenTypes = 0;
    Object.values(pollenAverages).forEach((value) => {
      if (value > 0) {
        score += optimalRange(value);
        contributingPollenTypes++;
      }
    });

    if (contributingPollenTypes > 0) {
      score = Math.round(score / (contributingPollenTypes + 1));
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Processes raw API data into useful averages
   * @param {Object} data - Raw Open-Meteo response
   * @returns {Object} Processed weather data
   */
  processWeatherData(data) {
    const daily = data.daily;

    if (
      !daily ||
      !daily.temperature_2m_max ||
      daily.temperature_2m_max.length === 0
    ) {
      return this.getDefaultWeather();
    }

    // Calculate averages
    const avgMaxTemp = this.calculateAverage(daily.temperature_2m_max);
    const avgMinTemp = this.calculateAverage(daily.temperature_2m_min);
    const avgTemp = (avgMaxTemp + avgMinTemp) / 2;
    const totalRainfall = daily.precipitation_sum.reduce((a, b) => a + b, 0);
    const avgWindSpeed = this.calculateAverage(daily.windspeed_10m_max);
    const avgHumidity = this.calculateAverage(daily.relative_humidity_2m_max);

    return {
      temperature: Math.round(avgTemp * 10) / 10, // Round to 1 decimal
      minTemp: Math.round(avgMinTemp * 10) / 10,
      maxTemp: Math.round(avgMaxTemp * 10) / 10,
      humidity: Math.round(avgHumidity),
      rainfall: Math.round(totalRainfall * 10) / 10, // Annual rainfall
      windSpeed: Math.round(avgWindSpeed * 10) / 10,
      condition: this.getWeatherCondition(avgTemp, totalRainfall, avgWindSpeed),
      beeScore: this.calculateBeeScore(
        avgTemp,
        avgHumidity,
        totalRainfall,
        avgWindSpeed,
      ),
    };
  }

  /**
   * Calculates average from array of numbers
   */
  calculateAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
  }

  /**
   * Determines weather condition description
   */
  getWeatherCondition(temp, rainfall, windSpeed) {
    if (temp < 0) return "Cold";
    if (temp < 10) return "Cool";
    if (temp < 20) return "Mild";
    if (temp < 25) return "Warm";
    return "Hot";
  }

  /**
   * Calculates a "bee-friendliness" score (0-100)
   * Bees prefer: 15-25°C, 50-70% humidity, low extreme winds, moderate rainfall, and good pollen availability
   * @param {number} temp - Average temperature
   * @param {number} humidity - Humidity percentage
   * @param {number} rainfall - Annual rainfall
   * @param {number} windSpeed - Wind speed
   * @param {number} forageIndex - Pollen foraging index (0-100, optional)
   */
  calculateBeeScore(temp, humidity, rainfall, windSpeed, forageIndex = 50) {
    let score = 100;

    // Temperature penalty (ideal: 15-25°C)
    if (temp < 10 || temp > 30) score -= 25;
    else if (temp < 15 || temp > 25) score -= 15;
    else if (temp < 18 || temp > 23) score -= 5;

    // Humidity penalty (ideal: 50-70%)
    if (humidity < 30 || humidity > 80) score -= 15;
    else if (humidity < 40 || humidity > 75) score -= 5;

    // Wind penalty (ideal: < 20 km/h)
    if (windSpeed > 40) score -= 20;
    else if (windSpeed > 30) score -= 10;
    else if (windSpeed > 20) score -= 5;

    // Rainfall (some is good, too much is bad)
    if (rainfall < 300)
      score -= 10; // Too dry
    else if (rainfall > 2000) score -= 10; // Too wet

    // Pollen/Forage availability bonus (10% of score)
    score = score * 0.9 + forageIndex * 0.1;

    return Math.max(0, Math.min(100, score)); // Clamp 0-100
  }

  /**
   * Cache management
   */
  getFromCache(lat, lng) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.cacheKey)) || {};
      const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const cached = cache[key];

      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.data;
      }

      // Remove expired entry
      delete cache[key];
      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch (e) {
      console.warn("Cache read error:", e);
    }
    return null;
  }

  saveToCache(lat, lng, data) {
    try {
      const cache = JSON.parse(localStorage.getItem(this.cacheKey)) || {};
      const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      cache[key] = {
        data: data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch (e) {
      console.warn("Cache write error:", e);
    }
  }

  /**
   * Default weather data fallback
   */
  getDefaultWeather() {
    return {
      temperature: 15,
      minTemp: 10,
      maxTemp: 20,
      humidity: 60,
      rainfall: 800,
      windSpeed: 15,
      condition: "Data Unavailable",
      beeScore: 50,
    };
  }
}
