import React, { useState } from 'react';
import Avatar from './Avatar';
import '../styles/Post.css';
import { FaHeart, FaRegHeart, FaTrash, FaRegComment, FaTimes } from 'react-icons/fa';
import api from '../services/api';

export default function Post({ p, showDelete, toggleLike, likeProcessing, handleDoubleLike, doubleLikedMap, deletePost }) {
  const postId = p._id || p.id;
  const liked = !!p.likedByMe;

  // --- LOCAL STATES ---
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likers, setLikers] = useState([]);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // --- HANDLERS ---
  const openLikesModal = async () => {
    if (p.likesCount === 0) return; 
    setShowLikesModal(true);
    setLoadingLikers(true);
    try {
        const res = await api.get(`/posts/${postId}/likes`);
        setLikers(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoadingLikers(false); }
  };

  const openCommentsModal = async () => {
    setShowCommentsModal(true);
    setLoadingComments(true);
    try {
        const res = await api.get(`/posts/${postId}/comments`);
        setComments(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoadingComments(false); }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
        const res = await api.post(`/posts/${postId}/comments`, { text: newComment });
        setComments(prev => [...prev, res.data]);
        setNewComment('');
    } catch (err) { console.error(err); } 
    finally { setPostingComment(false); }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-header-left"> 
            <Avatar src={p.user?.profilePictureUrl} alt={p.user?.firstName} size="small" />
            <div className="post-user-info">
              <span className="post-user-name">{p.user?.firstName} {p.user?.lastName}</span>
              <span className="post-user-username">@{p.user?.username}</span>
            </div>
        </div>
        <span className="post-timestamp">{new Date(p.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="post-image-wrapper" onDoubleClick={() => handleDoubleLike(postId, liked)}>
        <img src={p.imageUrl} alt="post" className="post-image" draggable={false} />
        {doubleLikedMap[postId] && (
          <div className="post-like-overlay">
             {/* Gradient Heart for Double Tap */}
            <FaHeart className="double-tap-heart" style={{ fill: "url(#app-gradient)" }} />
          </div>
        )}
      </div>

      {/* --- ACTIONS SECTION (Updated Order) --- */}
      <div className="post-actions">
        
        {/* 1. Heart Icon */}
        <button
          onClick={() => toggleLike(postId)}
          disabled={!!likeProcessing[postId]}
          className="action-button like-button"
          title={liked ? 'Unlike' : 'Like'}
        >
          {liked ? (
              // Gradient Heart
              <FaHeart style={{ fill: "url(#app-gradient)" }} /> 
          ) : (
              <FaRegHeart />
          )}
        </button>

        {/* 2. Likes Count */}
        <span className="likes-count-text" onClick={openLikesModal}>
            {p.likesCount > 0 ? p.likesCount : ''}
        </span>

        {/* 3. Comment Icon */}
        <button className="action-button comment-button" onClick={openCommentsModal}>
            <FaRegComment />
        </button>

        {/* 4. Comments Count */}
        <span className="likes-count-text" onClick={openCommentsModal} style={{ marginLeft: '-4px' }}>
             {p.commentsCount > 0 ? p.commentsCount : ''}
        </span>

        {/* Delete Button */}
        {showDelete && (
          <button onClick={() => deletePost(postId)} className="action-button delete-button">
            <FaTrash />
          </button>
        )}
      </div>

      {/* Caption */}
      {p.caption && (
          <div className="post-caption-section">
              <span className="caption-username">{p.user?.username}</span>
              <span className="caption-text">{p.caption}</span>
          </div>
      )}

      {/* Modals (Likes & Comments) - Same logic, just UI tweaks in CSS applied */}
      {showLikesModal && (
          <div className="modal-overlay" onClick={() => setShowLikesModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">Likes<button className="modal-close-btn" onClick={() => setShowLikesModal(false)}><FaTimes /></button></div>
                  <div className="modal-body">
                      {loadingLikers ? <div style={{padding:20, textAlign:'center'}}>Loading...</div> : (
                          likers.length===0 ? <div style={{padding:20, textAlign:'center'}}>No likes.</div> : (
                              likers.map(u => (
                                  <div key={u._id} className="likes-list-item">
                                      <Avatar src={u.profilePictureUrl} size="medium" />
                                      <div className="likes-user-info"><span className="likes-fullname">{u.firstName} {u.lastName}</span><span className="likes-username">@{u.username}</span></div>
                                  </div>
                              ))
                          )
                      )}
                  </div>
              </div>
          </div>
      )}

      {showCommentsModal && (
          <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">Comments<button className="modal-close-btn" onClick={() => setShowCommentsModal(false)}><FaTimes /></button></div>
                  <div className="modal-body">
                       {loadingComments ? <div style={{padding:20, textAlign:'center'}}>Loading...</div> : (
                          comments.length===0 ? <div style={{padding:20, textAlign:'center', color:'#8e8e8e'}}>No comments yet.</div> : (
                              <div className="comments-list">
                                  {comments.map(c => (
                                      <div key={c._id} className="comment-item">
                                          <Avatar src={c.user?.profilePictureUrl} size="small" />
                                          <div className="comment-content">
                                              <span className="comment-username">{c.user?.username}</span>{c.text}
                                              <div style={{fontSize:'0.7rem', color:'#8e8e8e'}}>{new Date(c.createdAt).toLocaleDateString()}</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )
                       )}
                  </div>
                  <form className="comment-input-section" onSubmit={handlePostComment}>
                      <input type="text" className="comment-input" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} maxLength={500} disabled={postingComment} />
                      <button type="submit" className="post-comment-btn" disabled={!newComment.trim() || postingComment}>Post</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
