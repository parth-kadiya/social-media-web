import React from 'react';
import { useOutletContext } from 'react-router-dom';
import '../styles/CreatePost.css';

export default function CreatePost() {
  const { file, setFile, uploadPost, inputKey, msgs } = useOutletContext();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="create-post-page">
      <h2 className="page-header">Create a New Post</h2>
      {msgs.createPost && <div className="page-message">{msgs.createPost}</div>}
      
      <form onSubmit={uploadPost} className="upload-form">
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
            {file ? (
              <img src={URL.createObjectURL(file)} alt="Preview" className="image-preview" />
            ) : (
              <div className="upload-placeholder">
                <p>Drag & drop your image here, or click to select a file.</p>
                <span>Only .png, .jpg, .jpeg allowed. Max 5MB.</span>
              </div>
            )}
          </label>
        </div>
        
        <button type="submit" className="upload-button" disabled={!file}>Upload Post</button>
      </form>
    </div>
  );
}