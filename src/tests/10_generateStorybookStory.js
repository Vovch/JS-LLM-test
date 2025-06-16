const { validateTypeScript } = require('../validators/tsValidator');

const id = 'storybook-story-generation';
const description = 'Generates a Storybook story for a given React component.';

const componentCode = `
export const Button = ({ primary, label }) => {
  // ... component implementation
};
`;

const prompt = `
Given this React component, create a Storybook v7+ CSF 3.0 story file for it.
Include a primary story and a secondary story.
${componentCode}
`;

async function validate(code) {
  // 1. Check if it's valid TSX
  const tsValidation = validateTypeScript(code, { isJsx: true });
  if (!tsValidation.success) return tsValidation;

  // 2. Check for Storybook-specific exports
  if (!code.includes('export const Primary')) {
      return { success: false, message: 'Missing "Primary" story export.' };
  }
  if (!code.includes("import type { Meta, StoryObj } from '@storybook/react'")) {
      return { success: false, message: 'Missing Storybook type imports.' };
  }
  return { success: true, message: 'Valid Storybook file generated.' };
}

module.exports = { id, description, prompt, validate };