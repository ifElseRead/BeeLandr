/**
 * @jest-environment jsdom
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { app } from "../main.js";

const mockMap = {
  clearAll: jest.fn(),
  enableDraw: jest.fn(),
  displayPolygon: jest.fn(),
  displayMarker: jest.fn(),
  getDrawnLayer: jest.fn(),
};

describe("App Data Loading", () => {
  beforeEach(() => {
    // 1. Define the Bootstrap global mock
    global.bootstrap = {
      Modal: jest.fn().mockImplementation(() => ({
        show: jest.fn(),
        hide: jest.fn(),
      })),
    };

    // 2. Setup the DOM
    document.body.innerHTML = `
      <div id="sidebar"><h2></h2></div>
      <div id="feedback-msg"></div>
      <button id="switch-role-btn"></button>
      <button id="save-btn"></button>
      <div id="roleModal"></div>
    `;

    app.state.map = mockMap;

    app.cacheElements();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 1,
              type: "polygon",
              coordinates: [
                [51, -0.1],
                [51, -0.2],
              ],
            },
          ]),
      }),
    );

    localStorage.clear();
    jest.clearAllMocks();
  });

  test("loadCommunityPlots calls map methods after fetching data", async () => {
    await app.loadCommunityPlots();
    expect(global.fetch).toHaveBeenCalledWith("assets/data/landData.json");
    expect(mockMap.clearAll).toHaveBeenCalled();
    expect(mockMap.displayPolygon).toHaveBeenCalled();
  });

  test("loadCommunityPlots merges LocalStorage data with Seed data", async () => {
    const userPlots = [{ id: "local-1", type: "polygon", coordinates: [] }];
    localStorage.setItem("user_plots", JSON.stringify(userPlots));

    await app.loadCommunityPlots();

    expect(mockMap.displayPolygon).toHaveBeenCalledTimes(2);
  });
});
