import React, { useState } from 'react';

export default function DeleteAccount({ handleDeleteAccount, setMsgFor, logout }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const openModal = () => {
    setMsgFor('settings', '', 1); // Clear previous messages
    setPassword('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
    setMsgFor('settings', '', null); // Clear errors
 
  try {
   // handleDeleteAccount ab success message return karega
   const successMsg = await handleDeleteAccount(password);
      setLoading(false);
      setIsModalOpen(false); // Password modal band karo
      setSuccessMessage(successMsg); // Success modal dikhao
  } catch (error) {
   // Error message MainLayout mein set hoga
   setLoading(false);
  }
 };

 const handleSuccessModalClose = () => {
    setSuccessMessage(null);
    logout(); // Logout tabhi karo jab user OK dabaye
  };

  return (
    <>
      {/* --- Danger Zone UI (Moved from Profile) --- */}
      <div className="danger-zone">
        <h3 className="danger-zone-title">Danger Zone</h3>
        <div className="danger-zone-content">
          <p>Once you delete your account, there is no going back. Please be certain.</p>
          <button onClick={openModal} className="btn-danger" disabled={loading}>
            Delete My Account
          </button>
        </div>
      </div>

      {/* --- Delete Confirmation Modal --- */}
      {isModalOpen && (
        <div className="delete-modal-overlay" onClick={closeModal}>
          <form className="delete-modal-content" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Account</h3>
            <p>This is permanent and cannot be undone. All your posts, friends, and chats will be deleted. Please enter your password to confirm.</p>
            <div className="form-group">
              <label htmlFor="delete-password">Enter Password</label>
              <input
                type="password"
                id="delete-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="delete-modal-actions">
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-danger" disabled={loading || !password}>
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </form>
        </div>
      )}
      {successMessage && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#28a745' }}>Success</h3>
            <p>{successMessage}</p>

            <div className="delete-modal-actions" style={{ justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleSuccessModalClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}