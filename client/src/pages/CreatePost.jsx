import React, { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css'; 
import '../styles/CreatePost.css';
import { FaCloudUploadAlt, FaTrash } from 'react-icons/fa'; 

// --- Helper function for Cropping (Keep this exactly same) ---
function getCroppedImg(image, crop, fileName = 'postImage.jpeg') {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;

  const cropWidth = crop.width;
  const cropHeight = crop.height;
  const cropX = crop.x;
  const cropY = crop.y;

  canvas.width = Math.floor(cropWidth * scaleX * pixelRatio);
  canvas.height = Math.floor(cropHeight * scaleY * pixelRatio);

  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('No 2d context'));

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    cropX * scaleX,
    cropY * scaleY,
    cropWidth * scaleX,
    cropHeight * scaleY,
    0,
    0,
    cropWidth * scaleX,
    cropHeight * scaleY
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 1 
    );
  });
}

export default function CreatePost() {
  // MainLayout se functions aur states le rahe hain
  const { file, setFile, uploadPost, inputKey, msgs, setMsgFor } = useOutletContext();

  // --- Local States ---
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [showCropper, setShowCropper] = useState(false);
  const [loadingCrop, setLoadingCrop] = useState(false);
  
  // Requirement 4: Uploading Loader State
  const [isUploading, setIsUploading] = useState(false);

  // NEW: Caption State
  const [caption, setCaption] = useState('');

  const imgRef = useRef(null);

  // 1. File Selection Handler (Keep same)
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Size check (Client side 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setMsgFor('createPost', 'File size exceeds 10MB limit.');
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setShowCropper(true);
      });
      reader.readAsDataURL(selectedFile);
      e.target.value = ''; 
    }
  };

  // ---------------------------------------------------------
  // 2. Image Load Handler (UPDATED CODE HERE)
  // ---------------------------------------------------------
  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    
    // Step A: Image ka natural aspect ratio calculate karo
    const imageAspect = width / height;

    // Step B: Aspect ratio pass karke initial crop generate karo
    // Isse wo width ke hisab se height automatically calculate karega
    const initialCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 }, // 90% width cover karega
        imageAspect, // <-- CHANGE: 'undefined' ki jagah 'imageAspect' pass kiya
        width,
        height
      ),
      width,
      height
    );
    
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };
  // ---------------------------------------------------------

  // 3. Save Crop (Keep same)
  const handleSaveCrop = async () => {
    if (!completedCrop || !imgRef.current) return;

    setLoadingCrop(true);
    try {
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop, 'my_post.jpg');
      setFile(croppedFile);
      setShowCropper(false);
      setImgSrc('');
    } catch (err) {
      console.error(err);
      setMsgFor('createPost', 'Failed to crop image');
    } finally {
      setLoadingCrop(false);
    }
  };

  // 4. Cancel Crop (Keep same)
  const handleCancelCrop = () => {
    setShowCropper(false);
    setImgSrc('');
    setFile(null);
  };

  // 5. Clear Selection (Keep same)
  const clearSelection = () => {
    setFile(null);
  };

  // UPDATED: Handle Upload with Caption
  const handleUploadClick = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    
    try {
        // Pass caption as extra data to uploadPost.
        // NOTE: MainLayout's uploadPost should accept a second argument for extraData.
        await uploadPost(e, { caption }); // Pass caption
        setCaption(''); // Clear caption on success
    } catch (error) {
        console.error("Upload failed", error);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="create-post-page">
      <h2 className="page-header">Create a New Post</h2>
      
      {/* Message Display */}
      {msgs.createPost && (
        <div className={`page-message ${msgs.createPost.includes('successfully') ? '' : 'error'}`}>
          {msgs.createPost}
        </div>
      )}
      
      {/* --- Cropper Modal --- */}
      {showCropper && (
        <div className="cropper-modal-overlay">
           <div className="cropper-container">
              <h3>Crop Your Photo</h3>
              <p className="crop-instruction">Drag corners to adjust size.</p>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                // NOTE: Yahan hum aspect prop nahi de rahe hain, 
                // taaki user rectangle ko free-form adjust kar sake.
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  style={{ maxHeight: '60vh', maxWidth: '100%' }} 
                />
              </ReactCrop>
              
              <div className="cropper-actions">
                <button className="btn-secondary" onClick={handleCancelCrop} disabled={loadingCrop}>Cancel</button>
                <button className="btn-primary" onClick={handleSaveCrop} disabled={loadingCrop || !completedCrop?.width}>
                  {loadingCrop ? 'Processing...' : 'Done'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Main Upload UI (Updated with Caption) --- */}
      <form onSubmit={handleUploadClick} className="upload-form">
        
        {file ? (
           <div className="preview-container">
              <img src={URL.createObjectURL(file)} alt="Final Preview" className="image-preview" />
              <button type="button" className="remove-preview-btn" onClick={clearSelection} disabled={isUploading}>
                 <FaTrash /> Change Photo
              </button>
           </div>
        ) : (
          /* Upload Box */
          <div className="file-drop-area">
            <input
              key={inputKey}
              type="file"
              id="file-input"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="file-input" className="file-label">
               <div className="upload-icon-wrapper">
                  <FaCloudUploadAlt className="upload-svg-icon" />
               </div>
               <div className="upload-text">
                  Click to Upload Photo
               </div>
               <div className="upload-limit-text">
                 (MAX 10 MB)
               </div>
            </label>
          </div>
        )}
        
        {/* NEW: Caption Input Area (Only show if file selected) */}
        {file && (
            <div style={{ width: '100%', maxWidth: '500px' }}>
                <textarea 
                    className="comment-input" // Reusing styling
                    style={{ width: '100%', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', minHeight: '80px' }}
                    placeholder="Write a caption... (Max 2200 characters)"
                    maxLength={2200}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    disabled={isUploading}
                />
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#8e8e8e' }}>
                    {caption.length}/2200
                </div>
            </div>
        )}
        
        <button type="submit" className="upload-button" disabled={!file || isUploading}>
           {isUploading ? (<>
               <div className="spinner"></div> Uploading...
             </>) : (
               'Upload Post'
           )}
        </button>
      </form>
    </div>
  );
}
