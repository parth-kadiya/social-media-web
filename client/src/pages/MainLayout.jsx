import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import '../styles/MainLayout.css';

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
  
  // Refs
  const pollingRef = useRef(null);
  const chatPollingRef = useRef(null);
  const chatListPollingRef = useRef(null);
  const chatContainerRef = useRef(null);
  const firstUnreadMsgId = useRef(null);
  
  // --- YAHAN NAYE REFS ADD KIYE GAYE HAIN ---
  const isInitialLoadForChat = useRef(false);
  const isSendingMessage = useRef(false);

  // UI State
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // --- On mount effects ---
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

  useEffect(() => {
    fetchNotifications();
    pollingRef.current = setInterval(fetchNotifications, 15000);
    return () => clearInterval(pollingRef.current);
  }, []);

  useEffect(() => {
    loadChatsList();
    chatListPollingRef.current = setInterval(loadChatsList, 10000);
    return () => clearInterval(chatListPollingRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  // --- API Call Functions ---
  async function fetchNotifications() {
    try {
      const res = await api.get('/users/notifications');
      setNotif({
        newUsersCount: res.data.newUsersCount || 0,
        friendRequestsCount: res.data.friendRequestsCount || 0
      });
    } catch (err) { /* ignore */ }
  }

  async function markSuggestionsSeen() {
    setNotif(n => ({ ...n, newUsersCount: 0 }));
    try { await api.post('/users/mark-suggestions-seen'); } catch (e) { }
  }

  async function markRequestsSeen() {
    setNotif(n => ({ ...n, friendRequestsCount: 0 }));
    try { await api.post('/users/mark-requests-seen'); } catch (e) { }
  }

  async function loadUsers() {
    try {
      const res = await api.get('/users/others');
      setUsers(res.data);
    } catch (err) {
      setMsgFor('addFriend', err.response?.data?.message || 'Failed to load users');
    }
  }

  async function sendRequest(toId) {
    try {
      await api.post('/users/friend-request', { toUserId: toId });
      setMsgFor('addFriend', 'Request sent');
      setUsers(prev => prev.filter(u => u._id !== toId));
      fetchNotifications();
    } catch (err) {
      setMsgFor('addFriend', err.response?.data?.message || 'Failed to send request');
    }
  }

  async function loadRequests() {
    try {
      const res = await api.get('/users/friend-requests');
      setRequests(res.data);
    } catch (err) {
      setMsgFor('friendRequests', err.response?.data?.message || 'Failed to load requests');
    }
  }

  async function respond(requestId, action) {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    try {
      await api.post('/users/friend-requests/respond', { requestId, action });
      await loadRequests();
      setMsgFor('friendRequests', action === 'accept' ? 'Request accepted' : 'Request rejected');
      if (action === 'accept') loadFriends();
      fetchNotifications();
    } catch (err) {
      setMsgFor('friendRequests', err.response?.data?.message || 'Failed to respond');
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function loadFriends() {
    try {
      const res = await api.get('/users/friends');
      setFriends(res.data);
    } catch (err) {
      setMsgFor('yourFriends', err.response?.data?.message || 'Failed to load friends');
    }
  }

  async function removeFriend(friendId) {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.post('/users/remove-friend', { friendId });
      setMsgFor('yourFriends', 'Friend removed');
      loadFriends();
      fetchNotifications();
    } catch (err) {
      setMsgFor('yourFriends', err.response?.data?.message || 'Failed to remove friend');
    }
  }

  async function loadMyPosts() {
    try {
      const res = await api.get('/posts/mine');
      setMyPosts(res.data || []);
    } catch (err) {
      setMsgFor('yourPost', 'Failed to load posts');
    }
  }

  async function loadFriendPosts() {
    try {
      const res = await api.get('/posts/friends');
      setFriendPosts(res.data || []);
    } catch (err) {
      setMsgFor('home', 'Failed to load friend posts');
    }
  }

  async function loadProfile() {
    try {
      const res = await api.get('/users/me');
      setProfile(res.data);
      setProfileForm({
        firstName: res.data.firstName || '', lastName: res.data.lastName || '',
        mobile: res.data.mobile || '', email: res.data.email || '',
        username: res.data.username || ''
      });
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (err) {
      if (err.response?.status === 401) {
          logout();
      }
      setMsgFor('profile', err.response?.data?.message || 'Failed to load profile');
    }
  }

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
      const updatePosts = (posts) => posts.map(p => 
        (p._id || p.id) === postId ? { ...p, likedByMe: liked, likesCount } : p
      );
      setFriendPosts(updatePosts);
      setMyPosts(updatePosts);
    } catch (err) {
      setMsgFor('home', err.response?.data?.message || 'Failed to like/unlike');
    } finally {
      setLikeProcessing(prev => {
        const copy = { ...prev };
        delete copy[postId];
        return copy;
      });
    }
  }

  async function handleDoubleLike(postId, currentlyLiked) {
    if (!postId || likeProcessing[postId]) return;
    setDoubleLikedMap(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => setDoubleLikedMap(prev => {
      const copy = { ...prev };
      delete copy[postId];
      return copy;
    }), 700);
    if (!currentlyLiked) {
      await toggleLike(postId);
    }
  }
  
  async function loadChatsList() {
    try {
      const res = await api.get('/chats/list');
      const chatListData = res.data || [];
      setChatList(chatListData);
      const sendersWithUnread = chatListData.filter(f => f.unreadCount > 0).length;
      setUnreadSendersCount(sendersWithUnread);
    } catch (err) { /* ignore */ }
  }

  async function openChat(friend) {
    if (!friend || !friend._id) return;
    setActiveChatFriend(friend);
    setChatMessages([]); 
    // firstUnreadMsgId.current = null; // Iski ab zaroorat nahi, hata sakte hain
    try {
      isInitialLoadForChat.current = true;
      const res = await api.get(`/chats/${friend._id}/messages`);
      const { messages } = res.data;
      
      // === BAS YAHAN BADLAV KARNA HAI ===
      // Pehle: setChatMessages(messages || []);
      // Ab:
      setChatMessages((messages || []).slice().reverse()); // Array ko reverse karke set karein

      await loadChatsList();

      if (chatPollingRef.current) clearInterval(chatPollingRef.current);
      chatPollingRef.current = setInterval(async () => {
        try {
          const r = await api.get(`/chats/${friend._id}/messages`);
          if (r.data?.messages?.length !== chatMessages.length) { // Condition ko thoda better kiya
            // === AUR YAHAN BHI REVERSE KAREIN ===
            setChatMessages((r.data.messages || []).slice().reverse());
          }
          await loadChatsList();
        } catch (e) { /* ignore */ }
      }, 3000);
    } catch (err) {
      setMsgFor('chats', err.response?.data?.message || 'Failed to load chat');
    }
}
  
  async function sendChatMessage(e) {
    e && e.preventDefault && e.preventDefault();
    if (!activeChatFriend) return;
    const text = (chatInput || '').trim();
    if (!text) return;
    
    // isSendingMessage.current = true; // Iski ab zaroorat nahi
    try {
      const res = await api.post(`/chats/${activeChatFriend._id}/message`, { text });
      
      // === YAHAN BADLAV KAREIN ===
      // Pehle: setChatMessages(prev => ([...prev, res.data]));
      // Ab:
      setChatMessages(prev => ([res.data, ...prev])); // Naye message ko array ke START me add karein

      setChatInput('');
      await loadChatsList();
    } catch (err) {
      // isSendingMessage.current = false; // Iski ab zaroorat nahi
      setMsgFor('chats', err.response?.data?.message || 'Failed to send message');
    }
}

  function stopChatPolling() {
    if (chatPollingRef.current) {
      clearInterval(chatPollingRef.current);
      chatPollingRef.current = null;
    }
  }

  async function deleteAccount() {
    if (!window.confirm('ARE YOU SURE?\n\nThis will permanently delete your account, posts, messages, and all other data. This action cannot be undone.')) return;
    try {
      const res = await api.delete('/users/me');
      alert(res.data.message || 'Account deleted successfully.');
      logout();
    } catch (err) {
      setMsgFor('profile', err.response?.data?.message || 'Failed to delete account');
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    nav('/');
  }

  const contextProps = {
    users, loadUsers, sendRequest, requests, loadRequests, respond, processingRequestId,
    myPosts, loadMyPosts, deletePost, friendPosts, loadFriendPosts, file, setFile,
    uploadPost, inputKey, msgs, setMsgFor, friends, loadFriends, removeFriend,
    profile, profileForm, setProfileForm, updateProfile, deleteAccount, likeProcessing,
    toggleLike, doubleLikedMap, handleDoubleLike, chatList, openChat, activeChatFriend,
    setActiveChatFriend, chatMessages, chatInput, setChatInput, sendChatMessage,
    stopChatPolling, chatContainerRef, firstUnreadMsgId, markRequestsSeen, markSuggestionsSeen
  };

  return (
    <div className="main-layout">
      <Sidebar 
        profile={profile} logout={logout} notif={notif}
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