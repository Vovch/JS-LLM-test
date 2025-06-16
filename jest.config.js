module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  // Suppress console output from tested code unless tests fail
  silent: true,
};