/**
 * @jest-environment jsdom
 */
// 1. Explicitly import globals for ESM compatibility
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import StorageManager from "../services/StorageManager.js";

describe("StorageManager", () => {
  let storage;

  beforeEach(() => {
    // 2. Initialize the service
    storage = new StorageManager();

    // 3. Clear the JSDOM localStorage between every test
    localStorage.clear();

    // 4. Reset any global mocks if they were used
    jest.clearAllMocks();
  });

  test("should save and load an object correctly", () => {
    const key = "testPlot";
    const data = { id: 1, type: "polygon", coords: [51, -0.1] };

    // Test saving
    storage.save(key, data);

    // Test loading
    const loadedData = storage.load(key);

    // Assert
    expect(loadedData).toEqual(data);
    // Verify it was actually stringified in the raw storage
    expect(typeof localStorage.getItem(key)).toBe("string");
  });

  test("should return null if key does not exist", () => {
    expect(storage.load("nonExistent")).toBeNull();
  });

  test("should remove an item from storage", () => {
    storage.save("temp", "data");
    storage.remove("temp");

    expect(storage.load("temp")).toBeNull();
    expect(localStorage.getItem("temp")).toBeNull();
  });
});
