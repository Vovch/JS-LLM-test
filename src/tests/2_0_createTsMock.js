// src/tests/2_createTsMock.js
const { validateTypeScript } = require("../validators/tsValidator");

const id = "ts-mock-from-interface_simple";
const description =
  "Creates a mock data object from existing TypeScript interfaces.";

// The context that the LLM needs and the validator needs.
const interfaceDefinitions = `
interface Profile {
  avatarUrl?: string;
  bio?: string;
}

interface User {
  id: string;
  email: string;
  registrationDate: Date;
  profile: Profile;
}
`;

const prompt = `
Given the following TypeScript interfaces, create a single mock object named 'mockUser' of type 'User'.
Fill the fields with realistic but fake data. The 'registrationDate' should be a new Date object.
Only output the 'mockUser' constant, with no other text or explanations.

Interfaces:
${interfaceDefinitions}
`;

/**
 * @param {string} code - The code generated by the LLM.
 * @returns {{success: boolean, message: string}}
 */
async function validate(code) {
  // We must provide the interface definitions as context for validation.
  const tsValidation = validateTypeScript(code, {
    context: interfaceDefinitions,
  });
  if (!tsValidation.success) {
    return tsValidation;
  }

  // Specific checks for the mock object's structure and content.
  if (!code.includes("const mockUser: User =")) {
    return {
      success: false,
      message: 'Code does not declare "const mockUser: User".',
    };
  }
  if (!/id: '.*'/.test(code)) {
    return {
      success: false,
      message: 'Mock is missing a string "id" property.',
    };
  }
  if (!/email: '.*@.*'/.test(code)) {
    return {
      success: false,
      message: 'Mock is missing a valid-looking "email" property.',
    };
  }
  if (!code.includes("registrationDate: new Date(")) {
    return {
      success: false,
      message: 'Mock is missing "registrationDate: new Date()".',
    };
  }
  if (!/profile: {[\s\S]*avatarUrl: '.*'[\s\S]*}/.test(code)) {
    return {
      success: false,
      message: 'Mock is missing a nested "profile" object with an avatarUrl.',
    };
  }

  return {
    success: true,
    message: "Mock object is structurally valid and compiles correctly.",
  };
}

module.exports = { id, description, prompt, validate };
