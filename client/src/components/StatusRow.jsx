import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Avatar from './Avatar';
import '../styles/Status.css';
import { FaPlus, FaTimes, FaTrash, FaHeart, FaRegHeart, FaPaperPlane, FaEye, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api from '../services/api';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Image Cropper Helper
function getCroppedImg(image, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(new File([blob], 'status.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9);
  });
}

// Time Helper
const getTimeAgo = (dateString) => {
    const now = new Date();
    const uploaded = new Date(dateString);
    const diffInMs = now - uploaded;

    // Minutes calculate karo
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    // Hours calculate karo
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    // Logic:
    // 1. Agar 1 minute se kam hai to 'Just now'
    if (diffInMinutes < 1) {
        return 'Just now';
    }
    // 2. Agar 60 minutes se kam hai (Example: 12 min, 56 min)
    else if (diffInMinutes < 60) {
        return `${diffInMinutes} min ago`;
    }
    // 3. Agar 1 hour ya usse zyada hai (Example: 1h, 2h)
    else {
        return `${diffInHours}h ago`;
    }
};

// Helper to check if I viewed a specific status
const isViewedByMe = (status, myId) => {
    if (!status || !status.views || !myId) return false;
    return status.views.some(v => {
        const viewId = v._id || v; 
        return viewId.toString() === myId.toString();
    });
};

export default function StatusRow() {
  const { profile } = useOutletContext();
  const [rawStatuses, setRawStatuses] = useState([]); // Server se aya hua raw data
  const [groupedStatuses, setGroupedStatuses] = useState([]); // Grouped by User

  // Upload States
  const [createMode, setCreateMode] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState(24); 
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Viewer States
  const [activeUserStories, setActiveUserStories] = useState(null); // Array of stories for current user
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  
  const [replyText, setReplyText] = useState('');
  const [showViewsList, setShowViewsList] = useState(false);
  const [showDoubleHeart, setShowDoubleHeart] = useState(false);

  // 1. Load Statuses
  const loadStatuses = async () => {
    try {
      const res = await api.get('/status/feed');
      // Sort by Date (Oldest to Newest for playback order)
      const sortedByDate = res.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setRawStatuses(sortedByDate);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadStatuses(); }, []);

  // 2. Grouping Logic (WhatsApp Style)
  useEffect(() => {
      if(!profile || rawStatuses.length === 0) {
          setGroupedStatuses([]);
          return;
      }

      const groups = {};
      
      rawStatuses.forEach(status => {
          const uId = status.user._id;
          if (!groups[uId]) {
              groups[uId] = {
                  user: status.user,
                  stories: [],
                  hasUnseen: false,
                  latestDate: status.createdAt
              };
          }
          groups[uId].stories.push(status);
          
          // Check if unseen
          if (!isViewedByMe(status, profile._id)) {
              groups[uId].hasUnseen = true;
          }
          // Update latest date for sorting groups
          if (new Date(status.createdAt) > new Date(groups[uId].latestDate)) {
              groups[uId].latestDate = status.createdAt;
          }
      });

      const groupsArray = Object.values(groups);
      
      // Sort groups: Friends with Unseen first, then by latest date
      groupsArray.sort((a, b) => {
          if (a.hasUnseen && !b.hasUnseen) return -1;
          if (!a.hasUnseen && b.hasUnseen) return 1;
          return new Date(b.latestDate) - new Date(a.latestDate);
      });

      setGroupedStatuses(groupsArray);

  }, [rawStatuses, profile]);

  // 3. Auto View Logic (Mark as seen)
  const currentStory = activeUserStories ? activeUserStories[currentStoryIndex] : null;

  useEffect(() => {
      if (currentStory && profile) {
          if (currentStory.user._id !== profile._id && !isViewedByMe(currentStory, profile._id)) {
             api.post(`/status/${currentStory._id}/view`).then(() => {
                 // Update locally to show grey border
                 setRawStatuses(prev => prev.map(s => 
                    s._id === currentStory._id 
                    ? {...s, views: [...s.views, profile]} 
                    : s
                 ));
             }).catch(err => console.error(err));
          }
      }
  }, [currentStoryIndex, activeUserStories, profile]);

  // --- Navigation Handlers ---
  const handleNextStory = () => {
      if (currentStoryIndex < activeUserStories.length - 1) {
          setCurrentStoryIndex(prev => prev + 1);
      } else {
          closeViewer(); // Close if last story
      }
  };

  const handlePrevStory = () => {
      if (currentStoryIndex > 0) {
          setCurrentStoryIndex(prev => prev - 1);
      }
  };

  const openStoryViewer = (stories) => {
      // Start from the first UNSEEN story, or 0 if all seen
      let startIndex = 0;
      if (stories[0].user._id !== profile._id) {
          const firstUnseenIndex = stories.findIndex(s => !isViewedByMe(s, profile._id));
          if (firstUnseenIndex !== -1) startIndex = firstUnseenIndex;
      }
      setActiveUserStories(stories);
      setCurrentStoryIndex(startIndex);
  };

  // --- Upload Logic ---
  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        const reader = new FileReader();
        reader.addEventListener('load', () => { setImgSrc(reader.result?.toString() || ''); setCreateMode(true); });
        reader.readAsDataURL(e.target.files[0]);
        e.target.value = ''; 
    }
  };
  const onImageLoad = (e) => {
      const { width, height } = e.currentTarget;
      const initialCrop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 9/16, width, height), width, height);
      setCrop(initialCrop); setCompletedCrop(initialCrop);
  };
  const handleUpload = async () => {
      if (!completedCrop || !imgRef.current) return;
      setUploading(true);
      try {
          const file = await getCroppedImg(imgRef.current, completedCrop);
          const formData = new FormData();
          formData.append('image', file);
          if(caption) formData.append('caption', caption);
          formData.append('duration', duration);
          await api.post('/status/create', formData);
          setCreateMode(false); setImgSrc(''); setCaption(''); setDuration(24);
          loadStatuses();
      } catch (err) { console.error(err); alert('Failed to upload'); } 
      finally { setUploading(false); }
  };

  // --- Actions (Like, Delete, Reply) ---
  const handleDeleteCurrent = async () => {
      if(!window.confirm("Delete this status?")) return;
      try {
          const idToDelete = currentStory._id;
          await api.delete(`/status/${idToDelete}`);
          
          const updatedStories = activeUserStories.filter(s => s._id !== idToDelete);
          setRawStatuses(prev => prev.filter(s => s._id !== idToDelete)); // Remove from global

          if (updatedStories.length > 0) {
              setActiveUserStories(updatedStories);
              if (currentStoryIndex >= updatedStories.length) setCurrentStoryIndex(updatedStories.length - 1);
          } else {
              closeViewer();
          }
      } catch (err) { console.error(err); }
  };

  const handleLike = async (status) => {
      if (status.user._id === profile._id) return;
      try {
          const res = await api.post(`/status/${status._id}/like`);
          // Update raw list to persist like
          setRawStatuses(prev => prev.map(s => s._id === status._id ? {...s, likes: res.data.liked ? [...s.likes, profile._id] : s.likes.filter(id => id !== profile._id)} : s));
          // Update current viewer
          setActiveUserStories(prev => prev.map(s => s._id === status._id ? {...s, likes: res.data.liked ? [...s.likes, profile._id] : s.likes.filter(id => id !== profile._id)} : s));
      } catch (err) { console.error(err); }
  };

  const handleDoubleTap = () => {
      if (currentStory.user._id === profile._id) return;
      // Show Animation
      setShowDoubleHeart(true);
      setTimeout(() => setShowDoubleHeart(false), 800);
      // Call Like API if not already liked
      if(!currentStory.likes.includes(profile._id)) { handleLike(currentStory); }
  };

  const handleReply = async (e) => {
      e.preventDefault();
      if(!replyText.trim() || !currentStory) return;
      try {
          await api.post(`/chats/${currentStory.user._id}/message`, { text: `Replied to status: ${replyText}` });
          setReplyText(''); alert('Reply sent!'); 
      } catch (err) { console.error(err); }
  };

  const closeViewer = () => { setActiveUserStories(null); setCurrentStoryIndex(0); setShowViewsList(false); loadStatuses(); };

  // UI Helpers
  const myGroup = groupedStatuses.find(g => g.user._id === profile?._id);
  const otherGroups = groupedStatuses.filter(g => g.user._id !== profile?._id);
  
  const isOwner = currentStory && currentStory.user._id === profile?._id;
  const isLiked = currentStory && currentStory.likes.includes(profile?._id);

  return (
    <>
    <div className="status-row">
        {/* 1. Create Status */}
        <div className="status-box create-status-box" onClick={() => fileInputRef.current.click()}>
            <FaPlus className="add-icon" style={{ fill: "url(#app-gradient)" }} />
            <span className="create-text" style={{ backgroundImage: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Create<br/>Status
            </span>
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} style={{display:'none'}} onChange={onFileSelect} />

        {/* 2. My Status (Grouped) */}
        {myGroup && myGroup.stories.length > 0 && (
            <div className="status-box my-status-box" onClick={() => openStoryViewer(myGroup.stories)}>
                {/* Show LATEST story thumbnail */}
                <img src={myGroup.stories[myGroup.stories.length - 1].imageUrl} alt="My Status" className="status-thumbnail" />
                <div className="status-info-overlay">
                    <div className="status-text-content">
                        <span className="status-user-name">Your Story</span>
                        <span className="status-time">{getTimeAgo(myGroup.stories[myGroup.stories.length - 1].createdAt)}</span>
                    </div>
                </div>
            </div>
        )}

        {/* 3. Friends Statuses (Grouped) */}
        {otherGroups.map(group => {
            // Thumbnail logic: First UNSEEN story, else LATEST story
            let thumbnailStory = group.stories[group.stories.length - 1];
            const firstUnseen = group.stories.find(s => !isViewedByMe(s, profile._id));
            if (firstUnseen) thumbnailStory = firstUnseen;

            return (
                <div key={group.user._id} className={`status-box ${group.hasUnseen ? 'unseen' : ''}`} onClick={() => openStoryViewer(group.stories)}>
                    <img src={thumbnailStory.imageUrl} alt="Status" className="status-thumbnail" />
                    <div className="status-info-overlay">
                        <Avatar src={group.user.profilePictureUrl} size="small" className="mini-avatar" />
                        <div className="status-text-content">
                            <span className="status-user-name">
                                <span>{group.user.firstName}</span>
                                <span>{group.user.lastName}</span>
                            </span>
                            <span className="status-time">{getTimeAgo(thumbnailStory.createdAt)}</span>
                        </div>
                    </div>
                    {/* Multiple bars indicator if more than 1 story */}
                    {group.stories.length > 1 && <div className="multiple-stories-indicator"></div>}
                </div>
            );
        })}
    </div>

    {/* Create Modal */}
    {createMode && (
        <div className="cropper-modal-overlay" style={{zIndex: 4000}}>
            <div className="cropper-container status-upload-modal">
                <h3>Create Status</h3>
                <ReactCrop crop={crop} onChange={(_, c) => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={9/16}>
                    <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} style={{maxHeight: '50vh'}} />
                </ReactCrop>
                <div className="status-inputs">
                    <input type="text" placeholder="Add a caption..." value={caption} onChange={e => setCaption(e.target.value)} className="status-caption-input" />
                    <select value={duration} onChange={(e) => setDuration(e.target.value)} className="status-duration-select">
                        <option value="24">24 Hours</option>
                        <option value="36">36 Hours</option>
                        <option value="48">48 Hours</option>
                    </select>
                </div>
                <div className="cropper-actions">
                    <button className="btn-secondary" onClick={() => {setCreateMode(false); setImgSrc('');}}>Cancel</button>
                    <button className="btn-primary" onClick={handleUpload} disabled={uploading || !completedCrop?.width}>{uploading ? 'Uploading...' : 'Share'}</button>
                </div>
            </div>
        </div>
    )}

    {/* VIEWER */}
    {currentStory && (
        <div className="status-viewer-overlay">
            <div className="status-view-content">
                {/* Progress Bars */}
                <div className="story-progress-container">
                    {activeUserStories.map((_, idx) => (
                        <div key={idx} className={`story-progress-bar ${idx < currentStoryIndex ? 'completed' : idx === currentStoryIndex ? 'active' : ''}`}></div>
                    ))}
                </div>

                {/* Top Bar */}
                <div className="status-top-bar">
                    <Avatar src={currentStory.user.profilePictureUrl} size="small" />
                    <div className="status-top-info">
                        <span className="status-top-name">{currentStory.user.firstName} {currentStory.user.lastName}</span>
                        <span className="status-top-time">{getTimeAgo(currentStory.createdAt)}</span>
                    </div>
                    <button className="status-close-btn" onClick={closeViewer}><FaTimes /></button>
                </div>

                {/* Main Image & Tap Zones */}
                <div className="status-image-container">
                     
                     {/* Background Image */}
                     <img src={currentStory.imageUrl} className="status-full-image" alt="story" />

                     {/* NEW: 3-Part Control Layer 
                        Ye image ke upar ek layer hai jo clicks handle karegi 
                     */}
                     <div className="status-tap-layer">
                        
                        {/* 1. Left Part (Previous) - Single Click */}
                        <div className="tap-section left" onClick={handlePrevStory}>
                            {currentStoryIndex > 0 && (
                                <button className="nav-arrow">
                                    <FaChevronLeft />
                                </button>
                            )}
                        </div>

                        {/* 2. Center Part (Like) - Double Click Only */}
                        {/* isme onClick nahi lagaya hai, sirf onDoubleClick */}
                        <div className="tap-section center" onDoubleClick={handleDoubleTap}></div>

                        {/* 3. Right Part (Next) - Single Click */}
                        <div className="tap-section right" onClick={handleNextStory}>
                            {/* Arrow tabhi dikhao agar next story hai, ya close karne ke liye bhi dikhana hai to condition hata sakte ho */}
                             {/* Logic: Agar last story nahi hai to arrow dikhao */}
                            {currentStoryIndex < activeUserStories.length - 1 ? (
                                <button className="nav-arrow">
                                    <FaChevronRight />
                                </button>
                            ) : (
                                /* Last story par bhi user right tap karke close karna chahta hai, to icon optional hai */
                                null 
                            )}
                        </div>

                     </div>

                    {/* Heart Animation (Ye sabse upar rahega z-index me) */}
                    {showDoubleHeart && (
                        <div className="status-like-overlay">
                            <FaHeart className="double-tap-heart" style={{ fill: "url(#app-gradient)" }} />
                        </div>
                    )}
                </div>

                {currentStory.caption && <div className="status-caption-overlay">{currentStory.caption}</div>}

                <div className="status-bottom-bar">
                    {isOwner ? (
                        <>
                        <button className="see-views-btn" onClick={() => setShowViewsList(true)}>
                            <FaEye /> {currentStory.views ? currentStory.views.length : 0} Views
                        </button>
                        <button className="status-delete-btn" onClick={handleDeleteCurrent}>
                            <FaTrash />
                        </button>
                        </>
                    ) : (
                        <form onSubmit={handleReply} style={{display:'flex', width:'100%', gap:10, alignItems:'center'}}>
                            <input className="status-reply-input" placeholder="Reply..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                            <button type="button" className="status-action-btn" onClick={() => handleLike(currentStory)}>
                                 {isLiked ? <FaHeart style={{ fill: "url(#app-gradient)" }} /> : <FaRegHeart />}
                            </button>
                            {replyText.trim() && <button type="submit" className="status-action-btn" style={{fontSize:'1.5rem'}}><FaPaperPlane /></button>}
                        </form>
                    )}
                </div>

                {/* Views Modal */}
                {showViewsList && isOwner && (
                    <div className="views-modal-overlay">
                         <div className="views-modal-header">
                            <span>Views ({currentStory.views ? currentStory.views.length : 0})</span>
                            <button onClick={() => setShowViewsList(false)} style={{background:'none', border:'none', color:'white', fontSize:'1.2rem', cursor:'pointer'}}><FaTimes /></button>
                        </div>
                        <div className="views-list">
                            {currentStory.views && currentStory.views.length > 0 ? (
                                currentStory.views.map(viewer => {
                                    const hasLiked = currentStory.likes.includes(viewer._id);
                                    return (
                                        <div key={viewer._id} className="view-item">
                                            <div className="view-user-info">
                                                <Avatar src={viewer.profilePictureUrl} size="small" />
                                                <span className="view-user-name">{viewer.firstName} {viewer.lastName}</span>
                                            </div>
                                            {hasLiked ? <FaHeart className="view-icon" style={{ fill: "url(#app-gradient)" }} /> : <FaHeart className="view-icon not-liked" />}
                                        </div>
                                    );
                                })
                            ) : ( <div style={{color:'white', textAlign:'center', marginTop:20}}>No views yet.</div> )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )}
    </>
  );
}