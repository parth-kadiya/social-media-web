import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Post from '../components/Post';
import '../styles/YourPosts.css';

export default function YourPosts() {
  const { myPosts, loadMyPosts, msgs, ...postProps } = useOutletContext();

  useEffect(() => {
    loadMyPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="your-posts-page">
      <h2 className="page-header">Your Posts</h2>
      {msgs.yourPost && <div className="page-message">{msgs.yourPost}</div>}
      
      {myPosts.length === 0 && (
        <div className="empty-state">
          <h3>You haven't posted anything yet.</h3>
          <p>Go to the "Create Post" page to share your first photo!</p>
        </div>
      )}

      <div className="posts-container">
        {myPosts.map(p => (
          <Post key={p._id || p.id} p={p} showDelete={true} {...postProps} />
        ))}
      </div>
    </div>
  );
}