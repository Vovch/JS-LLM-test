// src/tests/index.js
const test1 = require("./1_createTsInterface");
const test2_0 = require("./2_0_createTsMock");
const test2_1 = require("./2_1_createTsMock");
const test3 = require("./3_createUtilFunction");
const test4 = require("./4_createUtilTest");
const test5 = require("./5_createReactComponent");
const test6 = require("./6_createReactComponentTest");
const test7 = require("./7_createReactHook");
const test8 = require("./8_createReactHookTest");
const test9 = require("./9_migrateAngularJsToReact");
const test10 = require("./10_generateStorybookStory");

// To add a new test, import it here and add it to the array.
const allTests = [
  // test1,
  // test2_0,
  // test2_1,
  // test3,
  // test4,
  // test5,
  // test6,
  test7,
  // test8,
  // test9,
  // test10,
];

module.exports = { allTests };
