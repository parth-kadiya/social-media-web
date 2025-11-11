// client/src/components/Avatar.jsx
import React, { useState } from 'react'; // <-- Import useState
import { FaUserCircle } from 'react-icons/fa'; // Default icon
import '../styles/Avatar.css';

// Default avatar path (assuming it's in public folder)
// const defaultAvatarPath = '/default-avatar.png';

export default function Avatar({ src, alt = 'User Avatar', size = 'medium' }) {
    const [imgError, setImgError] = useState(false);
  const handleError = () => {
        // When image fails, set error state to true
        // We will no longer try to set e.target.src here
        if (!imgError) { // Set state only once
           setImgError(true);
        }
    };

  // Determine the class based on size prop
  const sizeClass = `avatar-${size}`; // e.g., avatar-small, avatar-medium
  const showIconFallback = !src || imgError;

  return (
        <div className={`avatar-container ${sizeClass}`}>
            {showIconFallback ? (
                // Show the default User Icon
                <FaUserCircle className="avatar-icon" />
            ) : (
                // Otherwise, attempt to show the image from src
                <img
                    src={src}
                    alt={alt} // Alt text remains important for accessibility
                    className="avatar-image"
                    onError={handleError} // Trigger error state on load failure
                />
            )}
        </div>
    );
}