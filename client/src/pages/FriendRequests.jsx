import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import '../styles/FriendRequests.css';

export default function FriendRequests() {
  const { requests, loadRequests, respond, processingRequestId, msgs, markRequestsSeen } = useOutletContext();

  useEffect(() => {
    loadRequests();
    markRequestsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="friend-requests-page">
      <h2 className="page-header">Incoming Friend Requests</h2>
      {msgs.friendRequests && <div className="page-message">{msgs.friendRequests}</div>}
      
      {requests.length === 0 && <div className="empty-state">No incoming requests.</div>}

      <div className="requests-list">
        {requests.filter(r => r.from).map(r => (
          <div key={r._id} className="request-card">
            <div className="request-info">
              <strong className="request-name">{r.from.firstName} {r.from.lastName}</strong>
              <span className="request-username">@{r.from.username}</span>
            </div>
            <div className="request-actions">
              <button
                className="action-btn accept"
                onClick={() => respond(r._id, 'accept')}
                disabled={processingRequestId === r._id}
              >
                {processingRequestId === r._id ? '...' : 'Accept'}
              </button>
              <button
                className="action-btn reject"
                onClick={() => respond(r._id, 'reject')}
                disabled={processingRequestId === r._id}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}