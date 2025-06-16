module.exports = {
  testEnvironment: "jest-environment-jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Suppress console output from tested code unless tests fail
  silent: false,
};