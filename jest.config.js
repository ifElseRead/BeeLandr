export default {
  testEnvironment: "jsdom",
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {}, // IMPORTANT: disables Jest trying to transform ESM
};
