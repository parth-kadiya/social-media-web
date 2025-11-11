import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Avatar from '../components/Avatar';
import '../styles/AddFriend.css';

export default function AddFriend() {
  const { users, loadUsers, sendRequest, msgs, markSuggestionsSeen } = useOutletContext();

  useEffect(() => {
    loadUsers();
    markSuggestionsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="add-friend-page">
      <h2 className="page-header">Find New Friends</h2>
      {msgs.addFriend && <div className="page-message">{msgs.addFriend}</div>}
      
      {users.length === 0 && <div className="empty-state">No new user suggestions at the moment.</div>}
      
      <div className="users-list">
        {users.map(u => (
          <div key={u._id} className="user-card">
            {/* --- UPDATE: Add Avatar and adjust layout --- */}
            <div className="user-card-content"> {/* Wrap avatar and info */}
              <Avatar src={u.profilePictureUrl} alt={u.firstName} size="medium" />
              <div className="user-info">
                <strong className="user-name">{u.firstName} {u.lastName}</strong>
                <span className="user-username">@{u.username}</span>
              </div>
            </div>
            {/* --- END UPDATE --- */}
            <button className="add-button" onClick={() => sendRequest(u._id)}>Add Friend</button>
          </div>
        ))}
      </div>
    </div>
  );
}