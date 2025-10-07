import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Post from '../components/Post';
import '../styles/Home.css';

export default function Home() {
  const { friendPosts, loadFriendPosts, msgs, ...postProps } = useOutletContext();

  useEffect(() => {
    loadFriendPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="home-page">
      <h2 className="page-header">Home Feed</h2>
      {msgs.home && <div className="page-message">{msgs.home}</div>}
      
      {friendPosts.length === 0 && (
        <div className="empty-state">
          <h3>No posts from friends yet!</h3>
          <p>When your friends post something, you'll see it here.</p>
        </div>
      )}

      <div className="posts-container">
        {friendPosts.map(p => (
          <Post key={p._id || p.id} p={p} showDelete={false} {...postProps} />
        ))}
      </div>
    </div>
  );
}