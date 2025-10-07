import React from 'react';
import '../styles/Post.css';
import { FaHeart, FaRegHeart, FaTrash } from 'react-icons/fa';

export default function Post({ p, showDelete, toggleLike, likeProcessing, handleDoubleLike, doubleLikedMap, deletePost }) {
  const postId = p._id || p.id;
  const liked = !!p.likedByMe;

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-info">
          <span className="post-user-name">{p.user?.firstName} {p.user?.lastName}</span>
          <span className="post-user-username">@{p.user?.username}</span>
        </div>
        <span className="post-timestamp">{new Date(p.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="post-image-wrapper" onDoubleClick={() => handleDoubleLike(postId, liked)}>
        <img src={p.imageUrl} alt="post" className="post-image" draggable={false} />
        {doubleLikedMap[postId] && (
          <div className="post-like-overlay">
            <FaHeart className="double-tap-heart" />
          </div>
        )}
      </div>

      <div className="post-actions">
        <button
          onClick={() => toggleLike(postId)}
          disabled={!!likeProcessing[postId]}
          className="action-button like-button"
          title={liked ? 'Unlike' : 'Like'}
        >
          {liked ? <FaHeart className="icon-liked" /> : <FaRegHeart />}
          <span className="likes-count">{p.likesCount || 0}</span>
        </button>

        {showDelete && (
          <button
            onClick={() => deletePost(postId)}
            className="action-button delete-button"
            title="Delete post"
          >
            <FaTrash /> Delete
          </button>
        )}
      </div>
    </div>
  );
}