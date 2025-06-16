import React, { useState } from 'react';

type UserProfileProps = {
  initialName: string;
  onUpdate: (newName: string) => void;
};

// Define the component as a const for easy exporting
export const UserProfile = ({ initialName, onUpdate }: UserProfileProps) => {
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
};

// Add a default export to make the test setup more robust
export default UserProfile;