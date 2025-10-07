import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import '../styles/YourFriends.css';

export default function YourFriends() {
  const { friends, loadFriends, removeFriend, msgs } = useOutletContext();

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="your-friends-page">
      <h2 className="page-header">Your Friends</h2>
      {msgs.yourFriends && <div className="page-message">{msgs.yourFriends}</div>}
      
      {friends.length === 0 && <div className="empty-state">You have no friends yet.</div>}

      <div className="friends-list">
        {friends.map(f => (
          <div key={f._id} className="friend-card">
            <div className="friend-info">
              <strong className="friend-name">{f.firstName} {f.lastName}</strong>
              <span className="friend-username">@{f.username}</span>
            </div>
            <button className="remove-button" onClick={() => removeFriend(f._id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}