// src/layouts/MainLayout.jsx
import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import io from 'socket.io-client';
import '../styles/MainLayout.css';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function MainLayout() {
  const nav = useNavigate();

  // States
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [friendPosts, setFriendPosts] = useState([]);
  const [file, setFile] = useState(null);
  const [msgs, setMsgs] = useState({});
  const [friends, setFriends] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', mobile: '', email: '', username: '' });
  const [notif, setNotif] = useState({ newUsersCount: 0, friendRequestsCount: 0 });
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false); 

  // Processing states
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [likeProcessing, setLikeProcessing] = useState({});
  const [doubleLikedMap, setDoubleLikedMap] = useState({});

  // Chat states
  const [chatList, setChatList] = useState([]);
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadSendersCount, setUnreadSendersCount] = useState(0);
  const [seenByFriendMap, setSeenByFriendMap] = useState({});

  // Refs
  const pollingRef = useRef(null);
  const chatListPollingRef = useRef(null);
  const chatContainerRef = useRef(null);
  const firstUnreadMsgId = useRef(null);
  const socket = useRef(null);

  // Scrolling Refs
  const shouldScrollToBottom = useRef(false);

  // UI State
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  async function uploadProfilePicture(imageFile) {
        if (!imageFile) {
             setMsgFor('profile', 'No image selected to upload.');
             throw new Error('No image selected'); // Indicate failure
        }
        if (isUploadingProfilePic) return; // Prevent double clicks

        setIsUploadingProfilePic(true);
        setMsgFor('profile', 'Uploading picture...', null); // Show persistent loading message

        const formData = new FormData();
        // Backend expects 'profilePic' field name based on uploadProfilePic.single('profilePic')
        formData.append('profilePic', imageFile, imageFile.name);

        try {
            // Call the new POST endpoint
            const res = await api.post('/users/me/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update profile state with the full user object returned from backend
            const updatedUser = res.data.user;
            setProfile(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser)); // Update local storage too
            setMsgFor('profile', 'Profile picture updated successfully!');

        } catch (err) {
            console.error("Upload error in MainLayout:", err);
            const errorMsg = err.response?.data?.message || 'Failed to upload profile picture.';
             setMsgFor('profile', errorMsg);
             throw new Error(errorMsg); // Re-throw so Profile.jsx knows it failed
        } finally {
            setIsUploadingProfilePic(false);
        }
    }


    async function removeProfilePicture() {
         if (isUploadingProfilePic) return;
         setIsUploadingProfilePic(true);
         setMsgFor('profile', 'Removing picture...', null);

         try {
            // Call the new DELETE endpoint
            const res = await api.delete('/users/me/profile-picture');

            // Update profile state with the user object from backend response
            const updatedUser = res.data.user;
            setProfile(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setMsgFor('profile', 'Profile picture removed.');

         } catch (err) {
             console.error("Remove error in MainLayout:", err);
             const errorMsg = err.response?.data?.message || 'Failed to remove profile picture.';
             setMsgFor('profile', errorMsg);
             throw new Error(errorMsg); // Re-throw
         } finally {
             setIsUploadingProfilePic(false);
         }
     }


     

  // add this above the first useEffect
async function loadProfile() {
  try {
    const res = await api.get('/users/me');
    setProfile(res.data);
    setProfileForm({
      firstName: res.data.firstName || '',
      lastName: res.data.lastName || '',
      mobile: res.data.mobile || '',
      email: res.data.email || '',
      username: res.data.username || ''
    });
    localStorage.setItem('user', JSON.stringify(res.data));
  } catch (err) {
    // if unauthorized, try to logout; if logout isn't available yet, navigate to login
    if (err.response?.status === 401) {
      try { logout(); } catch (e) { nav('/'); }
    }
    setMsgFor('profile', err.response?.data?.message || 'Failed to load profile');
  }
}


  // On mount: load cached user and profile
  useEffect(() => {
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        const u = JSON.parse(cached);
        setProfile(u);
        setProfileForm({
          firstName: u.firstName || '', lastName: u.lastName || '', mobile: u.mobile || '',
          email: u.email || '', username: u.username || ''
        });
      } catch (e) { /* ignore */ }
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * WebSocket Connection useEffect
   * - create socket when profile._id available
   * - add debug listeners
   * - cleanup on unmount or profile change
   */
  useEffect(() => {
    // Agar profile nahi hai, to kuch mat karo.
    if (!profile?._id) return;

    // Agar pehle se connection hai, to bhi kuch mat karo.
    if (socket.current) return;

    console.log('Attempting socket connect for user:', profile._id, 'to', SOCKET_URL);
    
    // Naya socket connection create karo.
    socket.current = io(SOCKET_URL, {
        query: { userId: profile._id },
        auth: { userId: profile._id },
        transports: ['websocket', 'polling']
    });

    // Connection events ke liye listeners.
    socket.current.on('connect', () => console.log('Socket connected (client):', socket.current.id));
    socket.current.on('disconnect', (reason) => console.log('Socket disconnected (client):', reason));
    socket.current.on('connect_error', (err) => console.error('Socket connect_error (client):', err.message));

    const handleMessagesSeen = ({ readerId, senderId }) => {
   console.log(`'messages-seen' event received: User ${readerId} saw messages from ${senderId}`);
   // Agar hum hi sender the (matlab hamare messages friend ne dekhe)
   if (senderId === profile?._id) {
    console.log(`Updating seen status for chat with ${readerId}`);
    setSeenByFriendMap(prevMap => ({
     ...prevMap,
     [readerId]: true // Mark karo ki is friend ne hamare messages dekh liye hain
    }));
   }
  };
    socket.current.on('messages-seen', handleMessagesSeen);

    
    
    // Cleanup function: Jab component destroy hoga (logout), to connection band kar dega.
    return () => {
        if (socket.current) {
            socket.current.off('messages-seen', handleMessagesSeen);
            socket.current.disconnect();
            socket.current = null;
            console.log('Socket connection cleaned up on unmount.');
        }
    };
}, [profile?._id]); // <-- Dependency sirf profile._id hai, taaki yeh baar-baar na chale.

// EFFECT 2: Handling Incoming Messages
// Yeh effect naye messages ko sunega aur handle karega.
useEffect(() => {
  const currentSocket = socket.current;
  // Agar socket connected nahi hai, to kuch mat karo.
  if (!currentSocket) return;

  // Jab 'receive-message' event aaye to yeh function chalega.
  const handleReceiveMessage = (newMessage) => {
  console.log('receive-message event (client):', newMessage);

    // --- YEH LOGIC WAISE HI RAHEGI ---
  if (newMessage.from !== activeChatFriend?._id && profile?._id === newMessage.to) {
    console.log(`New message received from ${newMessage.from}. Resetting seen status for this chat.`);
    setSeenByFriendMap(prevMap => {
     const newMap = { ...prevMap };
     delete newMap[newMessage.from]; // Seen status hata do kyunki naya unread message aa gaya hai
     return newMap;
    });
  }
    // --- YAHAN TAK ---


  // Case 1: Agar message uss chat ke liye hai jo abhi khuli hui hai
  if (newMessage.from === activeChatFriend?._id) {
    console.log("Message is for the active chat. Updating UI now.");
    shouldScrollToBottom.current = true;
    setChatMessages(prevMessages => [...prevMessages, newMessage]);
   
        // --- NAYA/MODIFIED LOGIC START ---
        // Agar chat active hai, LEKIN tab background mein hai,
        // toh sidebar mein unread count dikhao.
        if (document.hidden) {
            console.log("Tab is hidden. Updating unread count in sidebar for active chat.");
            setChatList(prevChatList =>
                prevChatList.map(friend =>
                    friend._id === newMessage.from
                        ? { ...friend, unreadCount: (friend.unreadCount || 0) + 1 }
                        : friend
                )
            );
        }
        // --- NAYA/MODIFIED LOGIC END ---

  }
  // Case 2: Agar message uss chat ke liye hai jo band hai
  else {
    setChatList(prevChatList => {
      // Check karo ki message bhejne wala user hamari local list mein hai ya nahi
      const senderInList = prevChatList.find(friend => friend._id === newMessage.from);

      if (senderInList) {
        // AGAR SENDER LIST MEIN HAI (Fast Path):
        // Count ko turant locally update karo.
        console.log(`INSTANT UPDATE: Message from known sender ${newMessage.from}. Incrementing count.`);
        return prevChatList.map(friend =>
          friend._id === newMessage.from
            ? { ...friend, unreadCount: (friend.unreadCount || 0) + 1 }
            : friend
        );
      } else {
        // AGAR SENDER LIST MEIN NAHI HAI (Fallback Path):
        // Iska matlab hamari local list purani hai. Server se fresh list fetch karo.
        console.log(`STALE LIST: Message from ${newMessage.from} not in local list. Fetching fresh list from server.`);
        loadChatsList();
        // Abhi ke liye state ko mat badlo, API call ke baad woh khud update ho jayegi.
        return prevChatList;
      }
    });
  }
};

    // Event listener set karo.
    currentSocket.on('receive-message', handleReceiveMessage);

    // Cleanup function: Jab activeChatFriend badle, to purana listener hata do.
    // Isse memory leak nahi hoga aur har message pe multiple listeners nahi चलेंगे.
    return () => {
        currentSocket.off('receive-message', handleReceiveMessage);
    };
}, [activeChatFriend?._id, profile?._id, loadChatsList]);

  // Polling for notifications and chat list
  useEffect(() => {
    fetchNotifications();
    pollingRef.current = setInterval(fetchNotifications, 15000);
    return () => clearInterval(pollingRef.current);
  }, []);

  useEffect(() => {
    loadChatsList();
    chatListPollingRef.current = setInterval(loadChatsList, 10000);
    return () => clearInterval(chatListPollingRef.current);
  }, []);

  useEffect(() => {
    const count = chatList.filter(f => f.unreadCount > 0).length;
    setUnreadSendersCount(count);
}, [chatList]); // Jab bhi chatList badlegi, yeh chalega.

  // Final Scrolling Logic
  useLayoutEffect(() => {
    if (!chatContainerRef.current) return;

    // Priority 1: Agar koi specific unread message hai, to uspar jao.
    if (firstUnreadMsgId.current) {
      const unreadElement = document.querySelector(`[data-message-id="${firstUnreadMsgId.current}"]`);
      if (unreadElement) {
        unreadElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      // Kaam hone ke baad ID ko reset kar do.
      firstUnreadMsgId.current = null;
    } 
    // Priority 2: Agar neeche scroll karne ka flag 'true' hai, to end tak scroll karo.
    else if (shouldScrollToBottom.current) {
      // YAHAN BADLAV KAREIN ==============================================

      // PURANA CODE (isko comment ya delete kar dein):
      // chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      
      // NAYA CODE (isko add karein):
      // Humne scroll logic ko setTimeout me daal diya hai taaki browser ko
      // final height calculate karne ka poora time mil jaye.
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 0);

      // ===================================================================

      // Kaam hone ke baad flag ko reset kar do.
      shouldScrollToBottom.current = false;
    }
  }, [chatMessages]);

  // Chat Functions
  async function openChat(friend) {
    if (!friend || !friend._id) return;

    setActiveChatFriend(friend);
    setChatMessages([]);

    firstUnreadMsgId.current = null;
    // Scroll flag ko shuruaat mein false set kar do
    shouldScrollToBottom.current = false; 

    setSeenByFriendMap(prevMap => {
   const newMap = { ...prevMap };
   delete newMap[friend._id];
   return newMap;
  });

    try {
        const res = await api.get(`/chats/${friend._id}/messages`);
        const { messages, firstUnreadId } = res.data;

        if (firstUnreadId) {
            // UNREAD MSG CASE: Specific message par scroll karne ke liye ID set karo.
            // Yeh tumhara purana, sahi logic hai.
            firstUnreadMsgId.current = firstUnreadId;
        } else {
            // NO UNREAD MSG CASE: Neeche tak scroll karne ke liye flag set karo.
            shouldScrollToBottom.current = true;
        }

        setChatMessages(res.data.messages || []);
        if (res.data.firstUnreadId) {
    firstUnreadMsgId.current = res.data.firstUnreadId;
   } else {
    shouldScrollToBottom.current = true;
   }
        await loadChatsList();
        
    } catch (err) {
        setMsgFor('chats', err.response?.data?.message || 'Failed to load chat');
    }
}

  async function sendChatMessage(e, directText = null) { // 1. Add directText parameter
    e?.preventDefault?.();

    // 2. Determine the text to send
    const textToSend = (directText || chatInput).trim();

    // 3. Check if textToSend is valid
    if (!textToSend || !activeChatFriend || !profile) return;

    setSeenByFriendMap(prevMap => {
   const newMap = { ...prevMap };
   delete newMap[activeChatFriend._id]; // Is chat ka seen status reset karo
   return newMap;
  });

    // 4. Clear input ONLY if it was a form submission (not a direct emoji send)
    if (!directText) {
      setChatInput('');
      // Height reset will be handled in Chats.jsx via a useEffect
    }

    // Step 1: Ek temporary message object banakar UI mein turant dikhao.
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      from: profile._id, // Apni ID
      to: activeChatFriend._id,
      text: textToSend, // 5. Use textToSend
      createdAt: new Date().toISOString(),
    };

    // Step 2: React state ko update karke message UI par foran show karo.
    shouldScrollToBottom.current = true;
    setChatMessages(prevMessages => [...prevMessages, optimisticMessage]);
    
    console.log("IMMEDIATE UI UPDATE:", optimisticMessage);

    try {
      // Step 3: Ab background mein server ko request bhejo.
      const res = await api.post(`/chats/${activeChatFriend._id}/message`, { text: textToSend }); // 6. Use textToSend
      const savedMessageFromServer = res.data;

      console.log("SERVER RESPONSE (REAL MESSAGE):", savedMessageFromServer);

      // Step 4: UI mein temporary message ko server se mile final message se badal do.
      setChatMessages(prevMessages =>
        prevMessages.map(message =>
          message._id === tempId ? savedMessageFromServer : message
        )
      );

    } catch (err) {
      console.error("MESSAGE FAILED TO SEND:", err);
      setMsgFor('chats', 'Message failed to send. Please try again.');
      // Agar message fail ho gaya, to UI se temporary message hata do.
      setChatMessages(prevMessages => prevMessages.filter(message => message._id !== tempId));
    } finally {
      // Chat list (sidebar) ko update karo.
      await loadChatsList();
    }
  }

  // Other Functions
  function setMsgFor(viewName, text, autoClearMs = 4000) {
    setMsgs(prev => ({ ...prev, [viewName]: text }));
    if (autoClearMs) {
      setTimeout(() => {
        setMsgs(prev => {
          const copy = { ...prev };
          delete copy[viewName];
          return copy;
        });
      }, autoClearMs);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await api.get('/users/notifications');
      setNotif({ newUsersCount: res.data.newUsersCount || 0, friendRequestsCount: res.data.friendRequestsCount || 0 });
    } catch (err) { /* ignore */ }
  }
  async function markSuggestionsSeen() { setNotif(n => ({ ...n, newUsersCount: 0 })); try { await api.post('/users/mark-suggestions-seen'); } catch (e) { } }
  async function markRequestsSeen() { setNotif(n => ({ ...n, friendRequestsCount: 0 })); try { await api.post('/users/mark-requests-seen'); } catch (e) { } }
  async function loadUsers() { try { const res = await api.get('/users/others'); setUsers(res.data); } catch (err) { setMsgFor('addFriend', err.response?.data?.message || 'Failed to load users'); } }
  async function sendRequest(toId) { try { await api.post('/users/friend-request', { toUserId: toId }); setMsgFor('addFriend', 'Request sent'); setUsers(prev => prev.filter(u => u._id !== toId)); fetchNotifications(); } catch (err) { setMsgFor('addFriend', err.response?.data?.message || 'Failed to send request'); } }
  async function loadRequests() { try { const res = await api.get('/users/friend-requests'); setRequests(res.data); } catch (err) { setMsgFor('friendRequests', err.response?.data?.message || 'Failed to load requests'); } }
  async function respond(requestId, action) { if (processingRequestId) return; setProcessingRequestId(requestId); try { await api.post('/users/friend-requests/respond', { requestId, action }); await loadRequests(); setMsgFor('friendRequests', action === 'accept' ? 'Request accepted' : 'Request rejected'); if (action === 'accept') loadFriends(); fetchNotifications(); } catch (err) { setMsgFor('friendRequests', err.response?.data?.message || 'Failed to respond'); } finally { setProcessingRequestId(null); } }
  async function loadFriends() { try { const res = await api.get('/users/friends'); setFriends(res.data); } catch (err) { setMsgFor('yourFriends', err.response?.data?.message || 'Failed to load friends'); } }
  async function removeFriend(friendId) { if (!window.confirm('Are you sure you want to remove this friend?')) return; try { await api.post('/users/remove-friend', { friendId }); setMsgFor('yourFriends', 'Friend removed'); loadFriends(); fetchNotifications(); } catch (err) { setMsgFor('yourFriends', err.response?.data?.message || 'Failed to remove friend'); } }
  async function loadMyPosts() { try { const res = await api.get('/posts/mine'); setMyPosts(res.data || []); } catch (err) { setMsgFor('yourPost', 'Failed to load posts'); } }
  async function loadFriendPosts() { try { const res = await api.get('/posts/friends'); setFriendPosts(res.data || []); } catch (err) { setMsgFor('home', 'Failed to load friend posts'); } }
  async function loadChatsList() {
    try {
        const res = await api.get('/chats/list');
        const chatListData = res.data || [];
        setChatList(chatListData);
    } catch (err) { /* ignore */ }
}
  function stopChatPolling() { if (chatListPollingRef.current) { clearInterval(chatListPollingRef.current); chatListPollingRef.current = null; } }
  
  function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); nav('/'); }

  async function updateProfile(e) {
    e.preventDefault();
    const payload = { ...profileForm, username: (profileForm.username || '').toLowerCase() };
    try {
      const res = await api.put('/users/me', payload);
      setProfile(res.data);
      setProfileForm(prev => ({ ...prev, username: res.data.username || prev.username }));
      setMsgFor('profile', 'Profile updated');
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (err) {
      setMsgFor('profile', err.response?.data?.message || 'Failed to update profile');
    }
  }

  async function uploadPost(e) {
    e.preventDefault();
    if (!file) return setMsgFor('createPost', 'Select file');
    const form = new FormData();
    form.append('image', file);
    try {
      await api.post('/posts/create', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsgFor('createPost', 'Uploaded successfully!');
      setFile(null);
      setInputKey(k => k + 1);
      nav('/home/your-posts');
    } catch (err) {
      setMsgFor('createPost', err.response?.data?.message || 'Upload error');
    }
  }

  async function deletePost(postId) {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setMyPosts(prev => prev.filter(p => (p._id || p.id) !== postId));
      setMsgFor('yourPost', 'Post deleted');
    } catch (err) {
      setMsgFor('yourPost', err.response?.data?.message || 'Failed to delete post');
    }
  }

  async function toggleLike(postId) {
    if (likeProcessing[postId]) return;
    setLikeProcessing(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await api.post(`/posts/${postId}/like`);
      const { liked, likesCount } = res.data;
      const updatePosts = (posts) => posts.map(p => (p._id || p.id) === postId ? { ...p, likedByMe: liked, likesCount } : p);
      setFriendPosts(updatePosts);
      setMyPosts(updatePosts);
    } catch (err) {
      setMsgFor('home', err.response?.data?.message || 'Failed to like/unlike');
    } finally {
      setLikeProcessing(prev => { const copy = { ...prev }; delete copy[postId]; return copy; });
    }
  }

  async function handleDoubleLike(postId, currentlyLiked) {
    if (!postId || likeProcessing[postId]) return;
    setDoubleLikedMap(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => setDoubleLikedMap(prev => { const copy = { ...prev }; delete copy[postId]; return copy; }), 700);
    if (!currentlyLiked) { await toggleLike(postId); }
  }

  async function handleChangePassword(passwordData) {
    const { oldPassword, newPassword, confirmNewPassword } = passwordData;
    try {
      const res = await api.post('/users/change-password', {
        oldPassword,
        newPassword,
        confirmNewPassword
      });
      setMsgFor('settings', res.data.message);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to change password';
      setMsgFor('settings', errorMsg);
      throw new Error(errorMsg); // Re-throw error taaki component ko pata chale
    }
  }

  async function handleDeleteAccount(password) {
  try {
   const res = await api.post('/users/delete-account', { password });
      // --- CHANGES START ---
   // alert(res.data.message || 'Account deleted successfully.'); // <-- YEH LINE HATA DO
   // logout(); // <-- YEH LINE BHI HATA DO
      return res.data.message || 'Your account and all associated data have been successfully deleted.'; // <-- YEH LINE ADD KARO
      // --- CHANGES END ---
  } catch (err) {
   const errorMsg = err.response?.data?.message || 'Failed to delete account';
   setMsgFor('settings', errorMsg);
   throw new Error(errorMsg); // Re-throw error
  }
 }

  async function handleSubmitFeedback(feedbackData) {
  const { type, message } = feedbackData;
  try {
      // YEH LINE BADLI HAI: '/api/feedback' se '/feedback' kiya
   const res = await api.post('/feedback', { type, message }); 
   setMsgFor('settings', res.data.message);
  } catch (err) {
   const errorMsg = err.response?.data?.message || 'Failed to send feedback';
   setMsgFor('settings', errorMsg);
   throw new Error(errorMsg); // Re-throw error
  }
 }

  const contextProps = {
    users, loadUsers, sendRequest, requests, loadRequests, respond, processingRequestId,
    myPosts, loadMyPosts, deletePost, friendPosts, loadFriendPosts, file, setFile, uploadPost,
    inputKey, msgs, setMsgFor, friends, loadFriends, removeFriend, profile, profileForm,
    setProfileForm, updateProfile, likeProcessing, toggleLike, doubleLikedMap,
    handleDoubleLike, chatList, openChat, activeChatFriend, setActiveChatFriend, chatMessages,
    chatInput, setChatInput, sendChatMessage, stopChatPolling, chatContainerRef, firstUnreadMsgId, uploadProfilePicture,   // <--- ADD
        removeProfilePicture, isUploadingProfilePic, 
    markRequestsSeen, markSuggestionsSeen, seenByFriendMap, loadChatsList, handleChangePassword, handleDeleteAccount,
    handleSubmitFeedback, logout
  };

  return (
    <div className="main-layout">
      <Sidebar
        profile={profile} notif={notif}
        unreadSendersCount={unreadSendersCount} isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className="main-content">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
          ☰
        </button>
        <div className="content-wrapper">
          <Outlet context={contextProps} />
        </div>
      </main>
    </div>
  );
}
