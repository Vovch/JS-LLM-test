// src/tests/6_createReactComponentTest.js
const { validateWithJest } = require('../validators/jestValidator');

const id = 'react-component-test';
const description = 'Creates a test set for a React component using react-testing-library.';

const codeToTest = `
import React, { useState } from 'react';

type UserProfileProps = {
  initialName: string;
  onUpdate: (newName: string) => void;
};

export function UserProfile({ initialName, onUpdate }: UserProfileProps) {
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(name);
    setIsEditing(false);
  };

  return (
    <div>
      <h2>User Profile</h2>
      {isEditing ? (
        <div>
          <label htmlFor="name-input">Name:</label>
          <input
            id="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleSave}>Save</button>
        </div>
      ) : (
        <div>
          <p>Name: {name}</p>
          <button onClick={() => setIsEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
`;

const prompt = `
You are an expert in testing React applications with React Testing Library.
Given the following React component, create a comprehensive Jest test suite for it.

Your tests must:
1.  Import 'render', 'screen', and 'fireEvent' from '@testing-library/react'.
2.  Test that the component renders correctly with initial props.
3.  Test the full user interaction flow: clicking "Edit", changing the input value, and clicking "Save".
4.  Verify that the 'onUpdate' callback is called with the correct new name after saving.
5.  Use 'jest.fn()' to mock the 'onUpdate' prop.
6.  Import the component from './codeToTest'.
7.  Do not add any text other than the pure test code.
8.  Do not use snapshots for this test.

**Crucially, do NOT mock the 'react' module or any of its hooks like 'useState'. You must test the component's behavior by interacting with the rendered DOM as a user would.**

The component to test is:
${codeToTest}
`;

async function validate(generatedTestCode) {
  return await validateWithJest(generatedTestCode, codeToTest);
}

module.exports = { id, description, prompt, validate };