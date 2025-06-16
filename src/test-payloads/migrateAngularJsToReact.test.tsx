// src/test-payloads/migrateAngularJsToReact.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
// Import ALL exports from the generated file into a single object.
import * as LlmComponent from './codeToTest';

describe('Migrated UserCard Component', () => {
  // If there's a default export, use it. Otherwise, look for a named export 'UserCard'.
  const UserCard = LlmComponent.default || LlmComponent.UserCard;

  // This check ensures the component was actually found before running tests.
  if (!UserCard) {
    throw new Error('Could not find a default export or a named export "UserCard" in the generated file.');
  }

  const mockUser = {
    id: '123',
    name: 'Jane Doe',
    avatar: 'https://example.com/avatar.png',
  };

  it('should render the user name and avatar correctly', () => {
    const mockOnSelect = jest.fn();
    render(<UserCard user={mockUser} onSelect={mockOnSelect} />);

    expect(screen.getByRole('heading', { name: /jane doe/i })).toBeInTheDocument();
    const avatarImg = screen.getByRole('img');
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', mockUser.avatar);
  });

  it('should call the onSelect callback with the user object when clicked', () => {
    const mockOnSelect = jest.fn();
    render(<UserCard user={mockUser} onSelect={mockOnSelect} />);

    const headingElement = screen.getByRole('heading', { name: /jane doe/i });
    fireEvent.click(headingElement.parentElement);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockUser);
  });

  it('should not throw an error if onSelect is not provided', () => {
    const renderWithoutCallback = () => render(<UserCard user={mockUser} onSelect={undefined} />);
    expect(renderWithoutCallback).not.toThrow();
  });
});