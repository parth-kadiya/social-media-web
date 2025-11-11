import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import '../styles/Settings.css'; // Naya CSS import
import { FaLock, FaTrash, FaChartLine, FaEnvelope, FaChevronLeft, FaSignOutAlt } from 'react-icons/fa';

// Components ko import karo
import ChangePassword from '../components/settings/ChangePassword';
import DeleteAccount from '../components/settings/DeleteAccount';
import ViewActivity from '../components/settings/ViewActivity';
import ContactUs from '../components/settings/ContactUs';

export default function Settings() {
 const [activeView, setActiveView] = useState('main'); // 'main', 'password', 'delete', 'activity', 'contact'
 const context = useOutletContext(); // Saara context yahaan mil jayega
 const { logout } = context;
 const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

 const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

 const renderView = () => {
  switch (activeView) {
   case 'password':
    return <ChangePassword {...context} />;
   case 'delete':
    return <DeleteAccount {...context} />;
   case 'activity':
    return <ViewActivity />;
   case 'contact':
    return <ContactUs {...context} />;
   default:
    return (
     <ul className="settings-menu">
      <li className="settings-menu-item">
       <button className="settings-menu-button" onClick={() => setActiveView('password')}>
        <span><FaLock className="settings-menu-icon" />Change Password</span>
        <span className="settings-menu-chevron">›</span>
       </button>
      </li>
      <li className="settings-menu-item">
       <button className="settings-menu-button" onClick={() => setActiveView('delete')}>
        <span><FaTrash className="settings-menu-icon" />Delete Account</span>
        <span className="settings-menu-chevron">›</span>
       </button>
      </li>
      <li className="settings-menu-item">
       <button className="settings-menu-button" onClick={() => setActiveView('activity')}>
        <span><FaChartLine className="settings-menu-icon" />View Activity</span>
        <span className="settings-menu-chevron">›</span>
       </button>
      </li>
      <li className="settings-menu-item">
       <button className="settings-menu-button" onClick={() => setActiveView('contact')}>
        <span><FaEnvelope className="settings-menu-icon" />Contact Us</span>
        <span className="settings-menu-chevron">›</span>
       </button>
      </li>
      <li className="settings-menu-item">
        {/* onClick={logout} ko onClick={handleLogoutClick} se badlo */}
   <button className="settings-menu-button logout" onClick={handleLogoutClick}>
    <span><FaSignOutAlt className="settings-menu-icon" />Logout</span>
   </button>
   </li>
     </ul>
    );
  }
 };

 return (
  <div className="settings-page">
   {activeView === 'main' ? (
    <h2 className="page-header">Settings</h2>
   ) : (
    <button className="settings-back-button" onClick={() => setActiveView('main')}>
     <FaChevronLeft /> Back to Settings
    </button>
   )}
  
   {/* --- NAYA/MODIFIED START: Updated className logic --- */}
   {context.msgs.settings && (
     <div
      className={`page-message ${
       context.msgs.settings.includes('Failed') ||
       context.msgs.settings.includes('error') ||
       context.msgs.settings.includes('Incorrect') ||
       context.msgs.settings.includes('match') // <-- YEH NAYA CHECK ADD KIYA
       ? 'error' : ''
      }`}
     >
      {context.msgs.settings}
     </div>
    )}
      {/* --- NAYA/MODIFIED END --- */}

   {renderView()}

   {isLogoutModalOpen && (
        <div className="delete-modal-overlay" onClick={() => setIsLogoutModalOpen(false)}>
            <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ color: '#ed4956' }}>Logout</h3>
                <p>Are you sure you want to logout?</p>

                <div className="delete-modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setIsLogoutModalOpen(false)}>
                        No
                    </button>
                    <button 
                        type="button" 
                        className="btn-danger" 
                        onClick={confirmLogout}
                    >
                        Yes, Logout
                    </button>
                </div>
            </div>
        </div>
    )}
  </div>
 );
}