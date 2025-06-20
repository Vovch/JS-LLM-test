const { validateWithJest } = require("../validators/jestValidator");
const fs = require("fs");
const path = require("path");

const id = "migrate-angularjs-to-react";
const description =
  "Translates an AngularJS component to a React component and validates its behavior.";

const angularJsCode = `
// Controller
function UserCardController() {
  var ctrl = this;
  ctrl.handleSelect = function() {
    ctrl.onSelect({ user: ctrl.user });
  };
}

// Component Definition
angular.module('myApp').component('userCard', {
  template: \`
    <div class="card" ng-click="$ctrl.handleSelect()">
      <img ng-src="{{$ctrl.user.avatar}}">
      <h3>{{$ctrl.user.name}}</h3>
    </div>
  \`,
  controller: UserCardController,
  bindings: {
    user: '<', // one-way binding for an object
    onSelect: '&' // output binding for a function
  }
});
`;

const prompt = `
You are an expert front-end developer. Your task is to migrate a component from AngularJS 1.x to modern React.
Convert the following AngularJS component into a single React functional component using TypeScript.

Requirements:
1.  The new component should be named 'UserCard'. It should be the main export.
2.  It should accept props 'user' and 'onSelect'. Define the necessary TypeScript interfaces for these props. The 'User' type has 'id', 'name', and 'avatar' fields.
3.  The component should render a 'div' that, when clicked, calls the 'onSelect' function with the entire 'user' object.
4.  Inside the div, it should render the user's name (e.g., in an 'h3' tag) and their avatar (in an 'img' tag).
5.  Return only the TSX code, with no other text or explanations.

Here is the original AngularJS component:
${angularJsCode}
`;

const testToRun = fs.readFileSync(
  path.resolve(__dirname, "../test-payloads/migrateAngularJsToReact.test.tsx"),
  "utf-8"
);

/**
 * @param {string} generatedComponentCode - The component code generated by the LLM.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function validate(generatedComponentCode) {
  const jestResult = await validateWithJest(testToRun, generatedComponentCode);
  return jestResult;
}

module.exports = { id, description, prompt, validate };
