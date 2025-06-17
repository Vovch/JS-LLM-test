// src/test-assets/HelloWorldComponent.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
// The component will be dynamically imported from the generated code.
// Let's assume its default export or named 'HelloWorld' from './generatedComponent.tsx'
// The validator will handle placing the generated code at this relative path.
// For the purpose of writing this test, we'll assume it's a named export.
import HelloWorld from './generatedComponent';

describe('HelloWorld Component', () => {
  test('renders without crashing', () => {
    render(<HelloWorld />);
  });

  test('displays the default greeting', () => {
    render(<HelloWorld />);
    expect(screen.getByText(/Hello, World!/i)).toBeInTheDocument();
  });

  test('displays the name from props', () => {
    const testName = "Jules";
    render(<HelloWorld name={testName} />);
    expect(screen.getByText(`Hello, ${testName}!`)).toBeInTheDocument();
  });

  test('displays default greeting if name prop is empty or not provided', () => {
    render(<HelloWorld name="" />);
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();

    // Also test with name prop completely absent
    render(<HelloWorld />);
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });
});
