import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserProfile from './src/mocks/6_reactComponent';

describe('UserProfile', () => {
  it('renders correctly with initial props', () => {
    const { getByText, getByRole } = render(
      <UserProfile initialName="John Doe" onUpdate={jest.fn()} />
    );

    expect(getByText(/User Profile/i)).toBeInTheDocument();
    expect(getByRole('button')).toHaveTextContent('Edit');
  });

  it('renders the name input when editing', () => {
    const mockOnUpdate = jest.fn();
    const { getByRole } = render(
      <UserProfile initialName="John Doe" onUpdate={mockOnUpdate} />
    );

    fireEvent.click(getByRole('button'));
    expect(getByRole('input')).toHaveValue('John Doe');
  });

  it('calls onUpdate with the new name when saving', () => {
    const mockOnUpdate = jest.fn();
    const { getByRole, getByText } = render(
      <UserProfile initialName="John Doe" onUpdate={mockOnUpdate} />
    );

    fireEvent.click(getByRole('button'));
    fireEvent.change(getByRole('input'), { target: { value: 'Jane Smith' } });
    fireEvent.click(getByText(/Save/i));

    expect(mockOnUpdate).toHaveBeenCalledWith('Jane Smith');
  });

  it('does not call onUpdate on clicking outside the input', () => {
    const mockOnUpdate = jest.fn();
    const { getByRole } = render(
      <UserProfile initialName="John Doe" onUpdate={mockOnUpdate} />
    );

    fireEvent.click(getByRole('button'));
    fireEvent.change(getByRole('input'), { target: { value: 'Jane Smith' } });

    fireEvent.click(screen.getByText(/Edit/i));
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });
});