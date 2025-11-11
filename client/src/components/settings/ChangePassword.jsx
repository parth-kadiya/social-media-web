import React, { useState } from 'react';

export default function ChangePassword({ handleChangePassword, setMsgFor }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
    
    // --- FIX: 1ms TIMER HATA DIYA, 'null' KAR DIYA ---
  setMsgFor('settings', '', null); // Clear previous message immediately
 
  if (formData.newPassword !== formData.confirmNewPassword) {
   setMsgFor('settings', 'New passwords do not match.'); // Yeh error set karta hai (4 sec ke default timer ke saath)
   setLoading(false);
   return; // API call ko rok deta hai
  }
 
  try {
   // handleChangePassword function MainLayout se aa rahi hai
   await handleChangePassword(formData);
   // Success message MainLayout mein set hoga
   setFormData({ oldPassword: '', newPassword: '', confirmNewPassword: '' }); // Clear fields
  } catch (error) {
   // Error message MainLayout mein set hoga
  } finally {
   setLoading(false);
  }
 };

  return (
    <div>
      <h3 className="page-header">Change Password</h3>
      <form onSubmit={handleSubmit} className="settings-form profile-form"> {/* Re-using profile form styles */}
        <div className="form-group">
          <label htmlFor="oldPassword">Old Password</label>
          <input
            type="password"
            id="oldPassword"
            name="oldPassword"
            value={formData.oldPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmNewPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmNewPassword"
            name="confirmNewPassword"
            value={formData.confirmNewPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}