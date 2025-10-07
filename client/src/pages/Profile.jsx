import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import '../styles/Profile.css';

export default function Profile() {
  const { profile, profileForm, setProfileForm, updateProfile, deleteAccount, msgs, setMsgFor } = useOutletContext();

  const originalFormState = {
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    mobile: profile?.mobile || '',
    email: profile?.email || '',
    username: profile?.username || ''
  };

  useEffect(() => {
    // Sync form with profile data when component loads or profile changes
    setProfileForm(originalFormState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleCancel = () => {
    setProfileForm(originalFormState);
    setMsgFor('profile', 'Changes reverted', 2000);
  };

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <h2 className="page-header">Your Profile</h2>
      {msgs.profile && <div className="page-message">{msgs.profile}</div>}
      
      <form onSubmit={updateProfile} className="profile-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} required />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="mobile">Mobile</label>
          <input id="mobile" value={profileForm.mobile} onChange={e => setProfileForm(f => ({ ...f, mobile: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={profileForm.username}
            onChange={e => setProfileForm(f => ({ ...f, username: (e.target.value || '').toLowerCase() }))}
            pattern="^[a-z0-9@._-]+$"
            title="lowercase letters, digits and @ . _ - allowed"
            required
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Save Changes</button>
          <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
        </div>
      </form>

      <div className="danger-zone">
        <h3 className="danger-zone-title">Danger Zone</h3>
        <div className="danger-zone-content">
          <p>Once you delete your account, there is no going back. Please be certain.</p>
          <button onClick={deleteAccount} className="btn-danger">Delete My Account</button>
        </div>
      </div>
    </div>
  );
}