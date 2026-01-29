/**
 * @jest-environment jsdom
 */
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// 1. Mock the Bootstrap Modal globally
global.bootstrap = {
  Modal: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    hide: jest.fn(),
  })),
};

// 2. Import the app logic after mocking Bootstrap
import { app } from "../main.js";

describe("Switch role button", () => {
  let mockMap;

  beforeEach(() => {
    // 3. Setup the DOM elements main.js expects to find
    document.body.innerHTML = `
      <nav>
        <button id="switch-role-btn">Switch</button>
      </nav>
      <aside id="sidebar">
        <h2>Plot Analysis</h2>
        <div id="feedback-msg"></div>
      </aside>
      <div id="roleModal"></div>
      <button id="save-btn"></button>
    `;

    // 4. Create a robust Mock Map
    mockMap = {
      clearAll: jest.fn(),
      enableDraw: jest.fn(),
    };

    // 5. Initialize the app state manually for the test
    app.state.map = mockMap;
    app.cacheElements(); // Re-cache the fresh JSDOM elements
    app.bindEvents(); // Re-bind listeners to the fresh JSDOM buttons

    app.role = "landowner"; // Set a starting state
  });

  test("clicking switch role clears the role and calls map cleanup", () => {
    // Act
    const switchBtn = document.getElementById("switch-role-btn");
    switchBtn.click();

    // Assert
    expect(app.state.role).toBe(null);
    expect(mockMap.clearAll).toHaveBeenCalled();
    expect(mockMap.enableDraw).toHaveBeenCalledWith(false);
  });
});
