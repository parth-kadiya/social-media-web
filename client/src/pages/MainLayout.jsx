// client/src/pages/MainLayout.jsx

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
      throw new Error('No image selected');
    }
    if (isUploadingProfilePic) return;

    setIsUploadingProfilePic(true);
    setMsgFor('profile', 'Uploading picture...', null);

    const formData = new FormData();
    formData.append('profilePic', imageFile, imageFile.name);

    try {
      const res = await api.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedUser = res.data.user;
      setProfile(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setMsgFor('profile', 'Profile picture updated successfully!');
    } catch (err) {
      console.error("Upload error in MainLayout:", err);
      const errorMsg = err.response?.data?.message || 'Failed to upload profile picture.';
      setMsgFor('profile', errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsUploadingProfilePic(false);
    }
  }

  async function removeProfilePicture() {
    if (isUploadingProfilePic) return;
    setIsUploadingProfilePic(true);
    setMsgFor('profile', 'Removing picture...', null);

    try {
      const res = await api.delete('/users/me/profile-picture');
      const updatedUser = res.data.user;
      setProfile(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setMsgFor('profile', 'Profile picture removed.');
    } catch (err) {
      console.error("Remove error in MainLayout:", err);
      const errorMsg = err.response?.data?.message || 'Failed to remove profile picture.';
      setMsgFor('profile', errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsUploadingProfilePic(false);
    }
  }

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
   */
  useEffect(() => {
    if (!profile?._id) return;
    if (socket.current) return;

    console.log('Attempting socket connect for user:', profile._id, 'to', SOCKET_URL);

    socket.current = io(SOCKET_URL, {
      query: { userId: profile._id },
      auth: { userId: profile._id },
      transports: ['websocket', 'polling']
    });

    socket.current.on('connect', () => console.log('Socket connected (client):', socket.current.id));
    socket.current.on('disconnect', (reason) => console.log('Socket disconnected (client):', reason));
    socket.current.on('connect_error', (err) => console.error('Socket connect_error (client):', err.message));

    const handleMessagesSeen = ({ readerId, senderId }) => {
      console.log(`'messages-seen' event received: User ${readerId} saw messages from ${senderId}`);
      if (senderId === profile?._id) {
        console.log(`Updating seen status for chat with ${readerId}`);
        setSeenByFriendMap(prevMap => ({
          ...prevMap,
          [readerId]: true
        }));
      }
    };
    socket.current.on('messages-seen', handleMessagesSeen);

    return () => {
      if (socket.current) {
        socket.current.off('messages-seen', handleMessagesSeen);
        socket.current.disconnect();
        socket.current = null;
        console.log('Socket connection cleaned up on unmount.');
      }
    };
  }, [profile?._id]);

  // EFFECT 2: Handling Incoming Messages
  useEffect(() => {
    const currentSocket = socket.current;
    if (!currentSocket) return;

    const handleReceiveMessage = (newMessage) => {
      console.log('receive-message event (client):', newMessage);

      if (newMessage.from !== activeChatFriend?._id && profile?._id === newMessage.to) {
        console.log(`New message received from ${newMessage.from}. Resetting seen status for this chat.`);
        setSeenByFriendMap(prevMap => {
          const newMap = { ...prevMap };
          delete newMap[newMessage.from];
          return newMap;
        });
      }

      // Case 1: message for currently open chat
      if (newMessage.from === activeChatFriend?._id) {
        console.log("Message is for the active chat. Updating UI now.");
        shouldScrollToBottom.current = true;
        setChatMessages(prevMessages => [...prevMessages, newMessage]);

        // If tab is hidden, increase unreadCount locally
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
      }
      // Case 2: message for a different chat (closed)
      else {
        setChatList(prevChatList => {
          const senderInList = prevChatList.find(friend => friend._id === newMessage.from);

          if (senderInList) {
            console.log(`INSTANT UPDATE: Message from known sender ${newMessage.from}. Incrementing count.`);
            return prevChatList.map(friend =>
              friend._id === newMessage.from
                ? { ...friend, unreadCount: (friend.unreadCount || 0) + 1 }
                : friend
            );
          } else {
            console.log(`STALE LIST: Message from ${newMessage.from} not in local list. Fetching fresh list from server.`);
            loadChatsList();
            return prevChatList;
          }
        });
      }
    };

    currentSocket.on('receive-message', handleReceiveMessage);

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
  }, [chatList]);

  // Final Scrolling Logic
  useLayoutEffect(() => {
    if (!chatContainerRef.current) return;

    if (firstUnreadMsgId.current) {
      const unreadElement = document.querySelector(`[data-message-id="${firstUnreadMsgId.current}"]`);
      if (unreadElement) {
        unreadElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      firstUnreadMsgId.current = null;
    } else if (shouldScrollToBottom.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 0);
      shouldScrollToBottom.current = false;
    }
  }, [chatMessages]);

  // Chat Functions
  async function openChat(friend) {
    if (!friend || !friend._id) return;

    setActiveChatFriend(friend);
    setChatMessages([]);
    firstUnreadMsgId.current = null;
    shouldScrollToBottom.current = false;

    try {
      const res = await api.get(`/chats/${friend._id}/messages`);
      const { messages, firstUnreadId } = res.data;

      try {
        const seenStatusRes = await api.get(`/chats/${friend._id}/seen-status`);
        console.log(`Seen status for ${friend.username}:`, seenStatusRes.data.hasSeen);

        if (seenStatusRes.data.hasSeen) {
          setSeenByFriendMap(prevMap => ({
            ...prevMap,
            [friend._id]: true
          }));
        } else {
          setSeenByFriendMap(prevMap => {
            const newMap = { ...prevMap };
            delete newMap[friend._id];
            return newMap;
          });
        }
      } catch (seenErr) {
        console.error("Failed to check seen status:", seenErr);
        setSeenByFriendMap(prevMap => {
          const newMap = { ...prevMap };
          delete newMap[friend._id];
          return newMap;
        });
      }

      if (firstUnreadId) {
        firstUnreadMsgId.current = firstUnreadId;
      } else {
        shouldScrollToBottom.current = true;
      }

      setChatMessages(res.data.messages || []);
      await loadChatsList();
    } catch (err) {
      setMsgFor('chats', err.response?.data?.message || 'Failed to load chat');
    }
  }

  async function sendChatMessage(e, directText = null) {
    e?.preventDefault?.();
    const textToSend = (directText || chatInput).trim();
    if (!textToSend || !activeChatFriend || !profile) return;

    setSeenByFriendMap(prevMap => {
      const newMap = { ...prevMap };
      delete newMap[activeChatFriend._id];
      return newMap;
    });

    if (!directText) setChatInput('');

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      from: profile._id,
      to: activeChatFriend._id,
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    shouldScrollToBottom.current = true;
    setChatMessages(prevMessages => [...prevMessages, optimisticMessage]);
    console.log("IMMEDIATE UI UPDATE:", optimisticMessage);

    try {
      const res = await api.post(`/chats/${activeChatFriend._id}/message`, { text: textToSend });
      const savedMessageFromServer = res.data;
      console.log("SERVER RESPONSE (REAL MESSAGE):", savedMessageFromServer);

      setChatMessages(prevMessages =>
        prevMessages.map(message =>
          message._id === tempId ? savedMessageFromServer : message
        )
      );
    } catch (err) {
      console.error("MESSAGE FAILED TO SEND:", err);
      setMsgFor('chats', 'Message failed to send. Please try again.');
      setChatMessages(prevMessages => prevMessages.filter(message => message._id !== tempId));
    } finally {
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
      throw new Error(errorMsg);
    }
  }

  async function handleDeleteAccount(password) {
    try {
      const res = await api.post('/users/delete-account', { password });
      return res.data.message || 'Your account and all associated data have been successfully deleted.';
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete account';
      setMsgFor('settings', errorMsg);
      throw new Error(errorMsg);
    }
  }

  async function handleSubmitFeedback(feedbackData) {
    const { type, message } = feedbackData;
    try {
      const res = await api.post('/feedback', { type, message });
      setMsgFor('settings', res.data.message);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send feedback';
      setMsgFor('settings', errorMsg);
      throw new Error(errorMsg);
    }
  }

  const contextProps = {
    users, loadUsers, sendRequest, requests, loadRequests, respond, processingRequestId,
    myPosts, loadMyPosts, deletePost, friendPosts, loadFriendPosts, file, setFile, uploadPost,
    inputKey, msgs, setMsgFor, friends, loadFriends, removeFriend, profile, profileForm,
    setProfileForm, updateProfile, likeProcessing, toggleLike, doubleLikedMap,
    handleDoubleLike, chatList, openChat, activeChatFriend, setActiveChatFriend, chatMessages,
    chatInput, setChatInput, sendChatMessage, stopChatPolling, chatContainerRef, firstUnreadMsgId, uploadProfilePicture,
    removeProfilePicture, isUploadingProfilePic, markRequestsSeen, markSuggestionsSeen, seenByFriendMap, loadChatsList, handleChangePassword, handleDeleteAccount,
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
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>☰</button>
        <div className="content-wrapper">
          <Outlet context={contextProps} />
        </div>
      </main>
    </div>
  );
}
