/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";

// Fake browser globals BEFORE importing app because otherwise it fails on StorageManager import and bootstrap usage
global.StorageManager = function () {
  this.save = () => {};
  this.load = () => "landowner";
  this.remove = () => {};
};

global.bootstrap = {
  Modal: function () {
    return {
      show: jest.fn(),
      hide: jest.fn(),
    };
  },
};

import { app } from "../main.js";

describe("Switch role button", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="switch-role-btn">Switch</button>
      <div id="roleModal"></div>
      <aside id="sidebar"><h2></h2></aside>
      <div id="feedback-msg"></div>
    `;

    app.role = "landowner";
    app.modal = new bootstrap.Modal();

    app.init();
  });

  test("clicking switch role clears the role", () => {
    document.getElementById("switch-role-btn").click();
    expect(app.role).toBe(null);
  });
});
