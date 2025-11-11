import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FaCamera, FaTrash } from 'react-icons/fa';
import '../styles/Profile.css';
import Avatar from '../components/Avatar';

// --- NEW Helper function --- (From react-image-crop docs, slightly modified)
function getCroppedImg(image, crop, fileName = 'profilePic.jpeg') {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;

    // Ensure crop dimensions are valid numbers
    const cropWidth = typeof crop.width === 'number' ? crop.width : 0;
    const cropHeight = typeof crop.height === 'number' ? crop.height : 0;
    const cropX = typeof crop.x === 'number' ? crop.x : 0;
    const cropY = typeof crop.y === 'number' ? crop.y : 0;

    canvas.width = Math.floor(cropWidth * pixelRatio);
    canvas.height = Math.floor(cropHeight * pixelRatio);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return Promise.reject(new Error('Could not get canvas context'));
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        cropX * scaleX,
        cropY * scaleY,
        cropWidth * scaleX,
        cropHeight * scaleY,
        0,
        0,
        cropWidth,
        cropHeight
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                // Assign filename to blob
                const file = new File([blob], fileName, { type: blob.type });
                resolve(file);
            },
            'image/jpeg',
            0.9 // Quality (0 to 1)
        );
    });
}
// --- END NEW Helper ---


export default function Profile() {
    const {
        profile, profileForm, setProfileForm, updateProfile, deleteAccount,
        msgs, setMsgFor,
        // --- NEW Context Functions ---
        uploadProfilePicture,
        removeProfilePicture,
        isUploadingProfilePic // Optional loading state from context
        // --- END NEW ---
    } = useOutletContext();

    // --- NEW State for Cropping ---
    const [imgSrc, setImgSrc] = useState(''); // Base64 source for cropper
    const [crop, setCrop] = useState(); // Current crop state { x, y, width, height, unit }
    const [completedCrop, setCompletedCrop] = useState(); // Final crop details
    const [showCropper, setShowCropper] = useState(false); // Flag to show/hide cropper
    const imgRef = useRef(null); // Ref for the <img/> inside cropper
    const fileInputRef = useRef(null); // Ref for the hidden file input
    const [internalLoading, setInternalLoading] = useState(false); // Component-specific loading
    // --- END NEW State ---

    // Load profile form data when profile loads or changes
    useEffect(() => {
        if (profile) {
            setProfileForm({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                mobile: profile.mobile || '',
                email: profile.email || '',
                username: profile.username || ''
            });
        }
    }, [profile, setProfileForm]);


    // --- NEW Functions for Cropping and Upload ---
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined); // Reset crop area
            setCompletedCrop(undefined); // Reset completed crop
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImgSrc(reader.result?.toString() || '');
                setShowCropper(true); // Show the cropper UI
            });
            reader.readAsDataURL(e.target.files[0]);
            e.target.value = ''; // Allow selecting the same file again
        }
    };

    // When image loads in the cropper, set a default centered crop
    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1 / 1, width, height),
            width,
            height
        );
        setCrop(initialCrop);
         setCompletedCrop(initialCrop); // Also set completed initially
    };

    // Function to handle saving the cropped image
    const handleSaveCrop = async () => {
        if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) {
            setMsgFor('profile', 'Please select an area to crop first.');
            return;
        }

        setInternalLoading(true);
        try {
            // Generate the cropped image Blob/File
            const croppedFile = await getCroppedImg(
                imgRef.current,
                completedCrop,
                'profilePic.jpg' // Filename for the blob
            );

            // Call the upload function passed from MainLayout context
            await uploadProfilePicture(croppedFile);
            setShowCropper(false); // Hide cropper on success
            setImgSrc(''); // Clear cropper image source

        } catch (error) {
             // Error message is already set in uploadProfilePicture or getCroppedImg
            console.error("Cropping/Upload failed:", error);
        } finally {
            setInternalLoading(false);
        }
    };

    // Function to handle removing the profile picture
    const handleRemoveClick = async () => {
         if (internalLoading || isUploadingProfilePic) return;
         if (window.confirm('Are you sure you want to remove your profile picture?')) {
             setInternalLoading(true);
             try {
                 // Call remove function from context
                 await removeProfilePicture();
             } catch (error) {
                 // Error message is already set in removeProfilePicture
                console.error("Remove failed:", error);
             } finally {
                setInternalLoading(false);
             }
         }
     };

    // Trigger the hidden file input when Edit button is clicked
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Cancel cropping
    const handleCancelCrop = () => {
        setShowCropper(false);
        setImgSrc('');
    };
    // --- END NEW Functions ---


    const handleInputChange = (e) => {
        setProfileForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Determine effective loading state
    const isLoading = internalLoading || isUploadingProfilePic;

    return (
        <div className="profile-page">
            <h2 className="page-header">Edit Profile</h2>
            {msgs.profile && <div className={`page-message ${msgs.profile.includes('Failed') || msgs.profile.includes('error') ? 'error' : ''}`}>{msgs.profile}</div>}

            {/* --- NEW: Profile Picture Section --- */}
            <div className="profile-picture-section">
                <div className="profile-picture-container">
                    <Avatar 
                        src={profile?.profilePictureUrl} 
                        alt="Profile Avatar" 
                        size="profile" // Hum yeh new size CSS mein add karenge
                    />
                     <button
                        className="edit-picture-btn"
                        onClick={triggerFileInput}
                        title="Change Profile Picture"
                        disabled={isLoading} // Disable while loading
                     >
                        <FaCamera />
                    </button>
                    {/* Remove Button (only show if picture exists) */}
                    {profile?.profilePictureUrl && (
                         <button
                            className="remove-picture-btn"
                            onClick={handleRemoveClick}
                            title="Remove Profile Picture"
                            disabled={isLoading} // Disable while loading
                         >
                            <FaTrash />
                        </button>
                     )}
                </div>
                 {/* Hidden File Input */}
                 <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }} // Keep it hidden
                />
            </div>
            {/* --- END NEW Section --- */}


             {/* --- NEW: Cropper Modal/Section --- */}
             {showCropper && (
                <div className="cropper-modal"> {/* You need to style this modal */}
                     <div className="cropper-content">
                        <h3>Crop Your Image</h3>
                        {imgSrc && (
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1} // Force square aspect ratio
                                circularCrop={true} // Makes the preview selection circular
                                keepSelection={true}
                            >
                                <img
                                    ref={imgRef}
                                    alt="Crop preview"
                                    src={imgSrc}
                                    onLoad={onImageLoad} // Set initial crop on load
                                    style={{ maxHeight: '60vh', maxWidth: '80vw' }} // Adjust size limits
                                />
                            </ReactCrop>
                        )}
                         <div className="cropper-actions">
                            <button
                                 onClick={handleSaveCrop}
                                 className="btn-primary"
                                 // Disable if no crop area or while loading
                                 disabled={isLoading || !completedCrop?.width || !completedCrop.height}
                            >
                                {isLoading ? 'Saving...' : 'Save Picture'}
                            </button>
                            <button onClick={handleCancelCrop} className="btn-secondary" disabled={isLoading}>
                                Cancel
                            </button>
                        </div>
                     </div>
                </div>
             )}
             {/* --- END Cropper --- */}

            <form onSubmit={updateProfile} className="profile-form">
                {/* Existing form inputs */}
                 <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input type="text" id="firstName" name="firstName" value={profileForm.firstName} onChange={handleInputChange} required disabled={isLoading} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input type="text" id="lastName" name="lastName" value={profileForm.lastName} onChange={handleInputChange} required disabled={isLoading} />
                    </div>
                </div>
                 <div className="form-group">
                    <label htmlFor="mobile">Mobile</label>
                    <input type="tel" id="mobile" name="mobile" value={profileForm.mobile} onChange={handleInputChange} required disabled={isLoading} />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email" value={profileForm.email} onChange={handleInputChange} required disabled={isLoading} />
                </div>
                 <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input type="text" id="username" name="username" value={profileForm.username} onChange={handleInputChange} required pattern="^[a-z0-9@._-]+$" title="Lowercase letters, numbers, and @ . _ - only." disabled={isLoading} />
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={isLoading}>Update Profile</button>
                </div>
            </form>

            
        </div>
    );
}