// /**
//  * @jest-environment jsdom
//  */
// import { jest, describe, test, expect, beforeEach } from "@jest/globals";
// import MapManager from "../services/MapManager.js";

// describe("Map Interaction", () => {
//   let mapManager;

//   beforeEach(() => {
//     // Mock the location object
//     delete window.location;
//     window.location = { href: "" };

//     // Setup map container
//     document.body.innerHTML = '<div id="map"></div>';

//     // Initialize real MapManager but mock the Leaflet parts that need a browser
//     mapManager = new MapManager("map");
//     mapManager.init();
//   });

//   test("clicking a polygon redirects the user to the listings page", () => {
//     const mockLand = {
//       id: "plot-123",
//       type: "polygon",
//       coordinates: [
//         [51.5, -0.09],
//         [51.51, -0.1],
//         [51.49, -0.1],
//       ],
//     };

//     // 1. Manually trigger the drawing
//     mapManager.displayPolygon(mockLand);

//     // 2. Find the layer we just added
//     const layers = mapManager.featureGroup.getLayers();
//     const polygonLayer = layers[0];

//     // 3. Simulate the Leaflet 'click' event
//     polygonLayer.fire("click");

//     // 4. Assert that the URL was updated correctly
//     expect(window.location.href).toBe("listings.html?id=plot-123");
//   });
// });
