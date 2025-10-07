import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';
import {
  FaHome, FaUserPlus, FaUsers, FaComments, FaPlusSquare, FaNewspaper, FaBell, FaUserCircle, FaSignOutAlt
} from 'react-icons/fa';

export default function Sidebar({ profile, logout, notif, unreadSendersCount, isSidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">SocialApp</h2>
        </div>
        
        {profile && (
          <div className="sidebar-profile">
            <FaUserCircle size={40} className="profile-icon" />
            <div className="profile-info">
              <span className="profile-name">{profile.firstName} {profile.lastName}</span>
              <span className="profile-username">@{profile.username}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <NavLink to="/home/feed" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaHome className="nav-icon" /> Home
          </NavLink>
          <NavLink to="/home/add-friend" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaUserPlus className="nav-icon" /> Add Friend
            {notif.newUsersCount > 0 && <span className="nav-badge new"></span>}
          </NavLink>
          <NavLink to="/home/your-friends" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaUsers className="nav-icon" /> Your Friends
          </NavLink>
          <NavLink to="/home/chats" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaComments className="nav-icon" /> Chats
            {unreadSendersCount > 0 && <span className="nav-badge count">{unreadSendersCount}</span>}
          </NavLink>
          <NavLink to="/home/create-post" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaPlusSquare className="nav-icon" /> Create Post
          </NavLink>
          <NavLink to="/home/your-posts" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaNewspaper className="nav-icon" /> Your Posts
          </NavLink>
          <NavLink to="/home/friend-requests" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaBell className="nav-icon" /> Friend Requests
            {notif.friendRequestsCount > 0 && <span className="nav-badge new"></span>}
          </NavLink>
          <NavLink to="/home/profile" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FaUserCircle className="nav-icon" /> Profile
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <FaSignOutAlt className="nav-icon" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}