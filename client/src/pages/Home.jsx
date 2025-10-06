import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const nav = useNavigate();

  const [view, setView] = useState('home'); // default: home (friend posts)
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [friendPosts, setFriendPosts] = useState([]);
  const [file, setFile] = useState(null);
  const [msgs, setMsgs] = useState({});
  const [friends, setFriends] = useState([]);
  const [inputKey, setInputKey] = useState(0);

  // notifications state
  const [notif, setNotif] = useState({ newUsersCount: 0, friendRequestsCount: 0 });
  const pollingRef = useRef(null);

  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', mobile: '', email: '', username: '' });

  // processing state to avoid double clicks for accept/reject
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // track which posts are currently being liked/unliked (to disable quickly)
  const [likeProcessing, setLikeProcessing] = useState({}); // { [postId]: true }

  const [doubleLikedMap, setDoubleLikedMap] = useState({}); // { [postId]: true }

  // Chats state
const [chatList, setChatList] = useState([]); // friends + unreadCount
const [activeChatFriend, setActiveChatFriend] = useState(null); // friend object
const [chatMessages, setChatMessages] = useState([]); // messages for active chat
const [chatInput, setChatInput] = useState('');
const chatPollingRef = useRef(null);
const chatListPollingRef = useRef(null);
const chatContainerRef = useRef(null);
const [unreadSendersCount, setUnreadSendersCount] = useState(0); // Tracks count of friends with unread messages


  // --- On mount: load cached user from localStorage synchronously so UI shows it immediately,
  // then refresh from server in background to get authoritative data.
  useEffect(() => {
    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        const u = JSON.parse(cached);
        setProfile(u);
        setProfileForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          mobile: u.mobile || '',
          email: u.email || '',
          username: u.username || ''
        });
      } catch (e) {
        // ignore parse errors
      }
    }

    // also refresh profile from server in background to ensure fresh data (if token exists)
    (async () => {
      try {
        const res = await api.get('/users/me');
        if (res?.data) {
          setProfile(res.data);
          setProfileForm({
            firstName: res.data.firstName || '',
            lastName: res.data.lastName || '',
            mobile: res.data.mobile || '',
            email: res.data.email || '',
            username: res.data.username || ''
          });
          try { localStorage.setItem('user', JSON.stringify(res.data)); } catch (e) {}
        }
      } catch (err) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(()=> {
    if (view === 'addFriend') {
      loadUsers();
      markSuggestionsSeen();
    }

    if (view === 'chats') {
  loadChatsList();
  // stop any previous polling (just in case)
  if (chatPollingRef.current) clearInterval(chatPollingRef.current);
  // don't auto-open any friend; user will press Message
} else {
  // when leaving chats view, stop polling
  stopChatPolling();
  // also clear active chat
  setActiveChatFriend(null);
  setChatMessages([]);
}

    if (view === 'friendRequests') {
      loadRequests();
      markRequestsSeen();
    }
    if (view === 'yourPost') loadMyPosts();
    if (view === 'home') loadFriendPosts();
    if (view === 'yourFriends') loadFriends();
    if (view === 'profile') loadProfile();
  }, [view]);




  // start polling notifications on mount
  useEffect(() => {
    fetchNotifications(); // initial
    pollingRef.current = setInterval(fetchNotifications, 15000); // every 15s
    return () => clearInterval(pollingRef.current);
  }, []);

  useEffect(() => {
  loadChatsList(); // initial fetch
  // poll every 10 seconds to keep the unread count fresh
  chatListPollingRef.current = setInterval(loadChatsList, 10000); 
  return () => {
    if (chatListPollingRef.current) {
      clearInterval(chatListPollingRef.current);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // prefetch user's posts
  useEffect(() => { loadMyPosts(); }, []);

  function setMsgFor(viewName, text, autoClearMs = 4000) {
    setMsgs(prev => ({ ...prev, [viewName]: text }));
    if (autoClearMs) {
      setTimeout(() => {
        setMsgs(prev => {
          if (prev[viewName] === text) {
            const copy = { ...prev };
            delete copy[viewName];
            return copy;
          }
          return prev;
        });
      }, autoClearMs);
    }
  }

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Jab bhi chatMessages state update ho, chat ko auto-scroll karein
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // ---- API calls ----
  async function fetchNotifications() {
    try {
      const res = await api.get('/users/notifications');
      setNotif({
        newUsersCount: res.data.newUsersCount || 0,
        friendRequestsCount: res.data.friendRequestsCount || 0
      });
    } catch (err) {
      // ignore
    }
  }

  async function markSuggestionsSeen() {
    setNotif(n => ({ ...n, newUsersCount: 0 }));
    try { await api.post('/users/mark-suggestions-seen'); } catch (e) {}
  }

  async function markRequestsSeen() {
    setNotif(n => ({ ...n, friendRequestsCount: 0 }));
    try { await api.post('/users/mark-requests-seen'); } catch (e) {}
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

  // respond to friend request (accept/reject)
  async function respond(requestId, action) {
    if (!requestId || !['accept','reject'].includes(action)) {
      setMsgFor('friendRequests', 'Invalid request/action');
      return;
    }

    // prevent double submits
    if (processingRequestId) return;
    setProcessingRequestId(requestId);

    try {
      await api.post('/users/friend-requests/respond', { requestId, action });
      // refresh the incoming requests list so UI stays consistent
      await loadRequests();
      setMsgFor('friendRequests', action === 'accept' ? 'Request accepted' : 'Request rejected');
      // refresh friends list if accepted
      if (action === 'accept') loadFriends();
      // update notifications
      fetchNotifications();
    } catch (err) {
      // show server message if any
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

  // REMOVE FRIEND API call (new)
  async function removeFriend(friendId) {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.post('/users/remove-friend', { friendId });
      setMsgFor('yourFriends', 'Friend removed');
      // refresh friends list
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
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        mobile: res.data.mobile || '',
        email: res.data.email || '',
        username: res.data.username || ''
      });
      try { localStorage.setItem('user', JSON.stringify(res.data)); } catch (e) {}
    } catch (err) {
      setMsgFor('profile', err.response?.data?.message || 'Failed to load profile');
    }
  }

  async function updateProfile(e) {
    e.preventDefault();

    // ensure username is lowercase on client before sending
    const payload = { ...profileForm, username: (profileForm.username || '').toLowerCase() };

    try {
      const res = await api.put('/users/me', payload);
      setProfile(res.data);
      setProfileForm(prev => ({ ...prev, username: res.data.username || prev.username }));
      setMsgFor('profile', 'Profile updated');
      try { localStorage.setItem('user', JSON.stringify(res.data)); } catch (e) {}
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
      setMsgFor('createPost', 'Uploaded');
      setFile(null);
      setInputKey(k => k + 1);
      if (view === 'yourPost') loadMyPosts();
      if (view === 'home') loadFriendPosts();
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

  // toggle like (calls server)
  async function toggleLike(postId) {
    if (!postId) return;
    // prevent repeated clicks
    if (likeProcessing[postId]) return;
    setLikeProcessing(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await api.post(`/posts/${postId}/like`);
      const { liked, likesCount } = res.data;

      // update friendPosts
      setFriendPosts(prev => prev.map(p => {
        if ((p._id || p.id) === postId) {
          return { ...p, likedByMe: liked, likesCount };
        }
        return p;
      }));

      // update myPosts
      setMyPosts(prev => prev.map(p => {
        if ((p._id || p.id) === postId) {
          return { ...p, likedByMe: liked, likesCount };
        }
        return p;
      }));
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

  // Called when user double-clicks image area
async function handleDoubleLike(postId, currentlyLiked) {
  if (!postId) return;
  // If already liked by user, do nothing on double-click (instagram behaviour)
  if (currentlyLiked) {
    // still show a tiny feedback optionally
    setDoubleLikedMap(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setDoubleLikedMap(prev => {
        const copy = { ...prev };
        delete copy[postId];
        return copy;
      });
    }, 700);
    return;
  }

  // prevent spamming double-click while processing
  if (likeProcessing[postId]) return;

  // show overlay immediately for responsiveness
  setDoubleLikedMap(prev => ({ ...prev, [postId]: true }));
  setTimeout(() => {
    setDoubleLikedMap(prev => {
      const copy = { ...prev };
      delete copy[postId];
      return copy;
    });
  }, 700);

  // call the same toggleLike (server will like because currently not liked)
  try {
    await toggleLike(postId);
  } catch (e) {
    // toggleLike already handles errors and shows messages; nothing extra needed
  }
}

// load chat list (friends + unread counts)
async function loadChatsList() {
 try {
  const res = await api.get('/chats/list');
  const chatListData = res.data || [];
  setChatList(chatListData);
  // Requirement 2: Total messages ke bajaye, unread messages wale friends ka count karein
  const sendersWithUnread = chatListData.filter(f => f.unreadCount > 0).length;
  setUnreadSendersCount(sendersWithUnread);
 } catch (err) {
  // ignore silently or show small msg
 }
}

// open chat with friend: loads messages and sets active friend
async function openChat(friend) {
  if (!friend || !friend._id) return;
  setActiveChatFriend(friend);
  setChatMessages([]); // reset while loading
  try {
    const res = await api.get(`/chats/${friend._id}/messages`);
    setChatMessages(res.data || []);
    // after fetching, refresh global chat list/unread counts
    await loadChatsList();
    // start polling for active chat
    if (chatPollingRef.current) {
      clearInterval(chatPollingRef.current);
    }
    chatPollingRef.current = setInterval(async () => {
      // refresh active chat messages and chat list
      try {
        const r = await api.get(`/chats/${friend._id}/messages`);
        setChatMessages(r.data || []);
        await loadChatsList();
      } catch (e) {}
    }, 2500);
  } catch (err) {
    setMsgFor('chats', err.response?.data?.message || 'Failed to load chat');
  }
}

// send message in active chat
async function sendChatMessage(e) {
  e && e.preventDefault && e.preventDefault();
  if (!activeChatFriend) return setMsgFor('chats', 'Select a friend to message');
  const text = (chatInput || '').trim();
  if (!text) return;
  try {
    const res = await api.post(`/chats/${activeChatFriend._id}/message`, { text });
    // append to messages
    setChatMessages(prev => ([ ...prev, res.data ]));
    setChatInput('');
    // refresh chats list unread counts
    await loadChatsList();
  } catch (err) {
    setMsgFor('chats', err.response?.data?.message || 'Failed to send message');
  }
}



// cleanup polling when leaving chats view
function stopChatPolling() {
  if (chatPollingRef.current) {
    clearInterval(chatPollingRef.current);
    chatPollingRef.current = null;
  }
}


async function deleteAccount() {
  const confirmation = window.confirm(
    'ARE YOU SURE?\n\nThis will permanently delete your account, posts, messages, and all other data. This action cannot be undone.'
  );

  if (!confirmation) {
    return;
  }

  try {
    const res = await api.delete('/users/me');
    alert(res.data.message || 'Account deleted successfully.');
    // On success, log the user out completely
    logout(); // logout() function pehle se hi मौजूद hai
  } catch (err) {
    setMsgFor('profile', err.response?.data?.message || 'Failed to delete account');
  }
}


  // Logout function (new)
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setProfile(null);
    setFriends([]);
    setUsers([]);
    setRequests([]);
    nav('/');
  }

  const btnStyle = (name) => ({
    padding: '8px 12px',
    border: '1px solid #ccc',
    background: view === name ? '#1976d2' : '#fff',
    color: view === name ? '#fff' : '#000',
    borderRadius: 4,
    cursor: 'pointer',
    position: 'relative'
  });

  const badgeStyle = {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 12,
    height: 12,
    borderRadius: 12,
    background: '#e53935',
    boxShadow: '0 0 0 2px white'
  };

  const topRightContainer = {
    position: 'absolute',
    top: 12,
    right: 12,
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  };

  const topLeftContainer = {
    position: 'absolute',
    top: 12,
    left: 12,
    textAlign: 'left',
    lineHeight: 1.1
  };

  // Heart SVG component (props: liked:boolean)
  function HeartIcon({ liked }) {
    // For not-liked: white fill + black stroke (border). For liked: solid red fill, no border.
    const common = { width: 22, height: 22, verticalAlign: 'middle' };
    if (liked) {
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path
            fill="#e53935"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.99 4 6.5 4 7.74 4 8.94 4.5 9.77 5.36L12 7.6l2.23-2.24C15.06 4.5 16.26 4 17.5 4 20.01 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      );
    } else {
      return (
        <svg viewBox="0 0 24 24" style={common} aria-hidden="true">
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.99 4 6.5 4 7.74 4 8.94 4.5 9.77 5.36L12 7.6l2.23-2.24C15.06 4.5 16.26 4 17.5 4 20.01 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="1"
          />
        </svg>
      );
    }
  }

  // helper to render post block (used for both myPosts and friendPosts)
  function PostBlock({ p, showDelete }) {
    const postId = p._id || p.id;
    return (
      <div style={{ marginBottom:12, width: '100%', maxWidth: 420, textAlign: 'left' }}>
        <div style={{ marginBottom:6, fontWeight: 500 }}>
          {p.user?.firstName} {p.user?.lastName}
          <span style={{ color:'#666', marginLeft:8, fontSize:12 }}>@{p.user?.username}</span>
        </div>

        {/* image wrapper handles double-click */}
<div
  style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 350, borderRadius: 6, overflow: 'hidden' }}
  onDoubleClick={() => handleDoubleLike(postId, !!p.likedByMe)}
>
  <img
          // src={`http://localhost:5000${p.imageUrl}`} // <-- Is line ko badlein
          src={p.imageUrl} // <-- Isse replace karein. Cloudinary ab poora URL dega.
          style={{ width:'100%', display:'block', userSelect: 'none' }}
          alt="post"
          draggable={false}
        />

  {/* overlay big heart (center) shown briefly after double-click */}
  {doubleLikedMap[postId] && (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      animation: 'scaleFade 700ms ease-out'
    }}>
      <svg viewBox="0 0 24 24" style={{ width: 120, height: 120, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))' }} aria-hidden="true">
        <path
          fill="#e53935"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.99 4 6.5 4 7.74 4 8.94 4.5 9.77 5.36L12 7.6l2.23-2.24C15.06 4.5 16.26 4 17.5 4 20.01 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    </div>
  )}
</div>


        {/* actions row below image */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', marginTop:8, gap:8 }}>
          <button
            onClick={() => toggleLike(postId)}
            disabled={!!likeProcessing[postId]}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={p.likedByMe ? 'Unlike' : 'Like'}
          >
            <HeartIcon liked={!!p.likedByMe} />
            <span style={{ marginLeft: 6, fontSize: 14 }}>{p.likesCount || 0}</span>
          </button>

          {showDelete && (
            <button
              onClick={() => deletePost(postId)}
              style={{
                marginLeft: 12,
                background: '#e53935',
                color: '#fff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              title="Delete post"
            >
              🗑️ Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- UI ----
  return (
    <div style={{ textAlign:'center', padding:20, position:'relative' }}>
      {/* Top-left: user's name + username */}
      <div style={topLeftContainer}>
        {profile ? (
          <>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {profile.firstName} {profile.lastName}
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              {profile.username}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#999' }}>Loading...</div>
        )}
      </div>

      {/* Top-right logout */}
      <div style={topRightContainer}>
        <button
          onClick={logout}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #ccc',
            background: '#fff',
            cursor: 'pointer'
          }}
          title="Logout"
        >
          Logout
        </button>
      </div>

      <h2>Home</h2>

      {/* Buttons */}
      <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap' }}>
        <button style={btnStyle('home')} onClick={()=>setView('home')}>Home</button>

        <div style={{ position:'relative', display:'inline-block' }}>
          <button
            style={btnStyle('addFriend')}
            onClick={() => {
              setView('addFriend');
              markSuggestionsSeen();
            }}
          >
            Add friend
          </button>
          {notif.newUsersCount > 0 && <div style={badgeStyle} />}
        </div>

        <button style={btnStyle('yourFriends')} onClick={()=>setView('yourFriends')}>Your Friends</button>
        <div style={{ position:'relative', display:'inline-block' }}>
  <button
    style={btnStyle('chats')}
    onClick={() => {
      setView('chats');
      // Requirement 2: Click karte hi badge hide karein
      setUnreadSendersCount(0);
    }}
  >
    Chats
  </button>
  {unreadSendersCount > 0 && (
    <div style={{
      position: 'absolute',
      top: -6,
      right: -6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      padding: '0 4px',
      background: '#e53935',
      boxShadow: '0 0 0 2px white',
      fontSize: 10,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1
    }}>
      {unreadSendersCount}
    </div>
  )}
</div>

        <button style={btnStyle('createPost')} onClick={()=>setView('createPost')}>Create Post</button>
        <button style={btnStyle('yourPost')} onClick={()=>setView('yourPost')}>Your Post</button>

        <div style={{ position:'relative', display:'inline-block' }}>
          <button
            style={btnStyle('friendRequests')}
            onClick={() => {
              setView('friendRequests');
              markRequestsSeen();
            }}
          >
            Friend Request
          </button>
          {notif.friendRequestsCount > 0 && <div style={badgeStyle} />}
        </div>

        <button style={btnStyle('profile')} onClick={()=>setView('profile')}>Profile</button>
      </div>

      <div style={{ marginTop:20 }}>
        {msgs[view] && <div style={{ marginBottom: 12 }}>{msgs[view]}</div>}

          {view === 'chats' && (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'center' }}>
    {/* Left: friends / chat list */}
    <div style={{ width: 300, maxHeight: 500, overflowY: 'auto', border: '1px solid #eee', padding: 12, borderRadius: 8, background: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>Chats</h3>
      {chatList.length === 0 && <div style={{ color: '#666' }}>No friends yet</div>}
      {chatList.map(f => (
        <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px', borderBottom: '1px solid #f2f2f2' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{f.firstName} {f.lastName}</div>
            <div style={{ fontSize: 12, color: '#666' }}>@{f.username}</div>
          </div>
          
          {/* Requirement 3: Message button par count ke saath badge */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => openChat(f)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
            >
              Message
            </button>
            {f.unreadCount > 0 && (
              <div style={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                padding: '0 5px',
                background: '#e53935',
                boxShadow: '0 0 0 2px white',
                color: 'white',
                fontSize: 11,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}>
                {f.unreadCount}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Requirement 1: Jab tak friend select na ho, chat window hide rakhein */}
    {activeChatFriend && (
      <div style={{ width: 420, maxHeight: 500, border: '1px solid #eee', borderRadius: 8, background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #f2f2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
              <div style={{ fontWeight: 700 }}>{activeChatFriend.firstName} {activeChatFriend.lastName}</div>
              <div style={{ fontSize: 12, color: '#666' }}>@{activeChatFriend.username}</div>
          </div>
          <div>
            <button onClick={() => { setActiveChatFriend(null); setChatMessages([]); stopChatPolling(); }} style={{ padding: '6px 8px' }}>Close</button>
          </div>
        </div>

        {/* messages list */}
<div ref={chatContainerRef} style={{ padding: 12, overflowY: 'auto', flex: 1 }} id="chatMessagesContainer">
          {chatMessages.map(m => {
            const mine = m.from === (profile?._id);
            return (
              <div key={m._id || m.createdAt} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '78%',
                  background: mine ? '#1976d2' : '#f2f2f2',
                  color: mine ? '#fff' : '#000',
                  padding: '8px 10px',
                  borderRadius: 10,
                  lineHeight: 1.3,
                  wordBreak: 'break-word'
                }}>
                  <div style={{ fontSize: 14 }}>{m.text}</div>
                  <div style={{ fontSize: 11, color: mine ? 'rgba(255,255,255,0.85)' : '#666', marginTop: 6, textAlign: 'right' }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* input bar */}
        <form onSubmit={sendChatMessage} style={{ padding: 10, borderTop: '1px solid #f2f2f2', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div>
                    {['😀','😂','😍','👍','🙏','🔥','🎉'].map(emo => (
                        <button key={emo} type="button" onClick={() => setChatInput(c => (c || '') + emo)} style={{ fontSize: 18, padding: '4px 6px', background: 'transparent', border: 'none', cursor: 'pointer' }} title={emo}>{emo}</button>
                    ))}
                </div>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Message @${activeChatFriend.username}`} style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }} />
                <button type="submit" disabled={!chatInput.trim()} style={{ padding: '8px 12px', borderRadius: 6, background: '#1976d2', color: '#fff', border: 'none' }}>
                    Send
                </button>
            </div>
        </form>
      </div>
    )}
  </div>
)}

        

        {view === 'addFriend' && (
          <div>
            <h3>Other users</h3>
            {users.length === 0 && <div>No suggestions</div>}
            {users.map(u=> (
              <div key={u._id} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, margin:8 }}>
                <div>
                  <strong>{u.firstName} {u.lastName}</strong> <span>({u.username})</span>
                </div>
                <div>
                  <button onClick={()=>sendRequest(u._id)}>Add friend</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'yourFriends' && (
          <div>
            <h3>Your Friends</h3>
            {friends.length === 0 && <div>You have no friends yet</div>}
            {friends.map(f => (
              <div key={f._id} style={{ margin:8, display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:420 }}>
                <div>{f.firstName} {f.lastName} ({f.username})</div>
                <div>
                  <button
                    onClick={() => removeFriend(f._id)}
                    style={{
                      background: '#e53935',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'createPost' && (
          <form onSubmit={uploadPost}>
            <input
              key={inputKey}
              type="file"
              accept="image/*"
              onChange={e=>setFile(e.target.files[0])}
            />
            <button type="submit">Upload</button>
            <div>Only png/jpg/jpeg. Max 5MB.</div>
          </form>
        )}

        {view === 'yourPost' && (
          <div>
            <h3>Your Posts</h3>
            {myPosts.length === 0 && <div>No posts</div>}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:8 }}>
              {myPosts.map(p => (
                <PostBlock key={p._id || p.id} p={p} showDelete />
              ))}
            </div>
          </div>
        )}

        {view === 'friendRequests' && (
          <div>
            <h3>Incoming requests</h3>
            {requests.length === 0 && <div>No incoming requests</div>}
{requests.filter(r => r.from).map(r => (
              <div key={r._id} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, margin:8 }}>
                <div>{r.from.firstName} {r.from.lastName} ({r.from.username})</div>
                <div>
                  <button
                    onClick={() => respond(r._id, 'accept')}
                    disabled={processingRequestId === r._id}
                    style={{ marginRight: 6 }}
                  >
                    {processingRequestId === r._id ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => respond(r._id, 'reject')}
                    disabled={processingRequestId === r._id}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'home' && (
          <div>
            <h3>Friend Posts</h3>
            {friendPosts.length === 0 && <div>No friend posts</div>}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:8 }}>
              {friendPosts.map(p => (
                <PostBlock key={p._id || p.id} p={p} showDelete={false} />
              ))}
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
            <h3>Your Profile</h3>
            {!profile && <div>Loading...</div>}
            {profile && (
              <form onSubmit={updateProfile} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <label>
                  First name
                  <input
                    value={profileForm.firstName}
                    onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={profileForm.lastName}
                    onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Mobile
                  <input
                    value={profileForm.mobile}
                    onChange={e => setProfileForm(f => ({ ...f, mobile: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </label>

                <label>
                  Username
                  <input
                    value={profileForm.username}
                    onChange={e => {
                      // coerce to lowercase immediately
                      const v = (e.target.value || '').toLowerCase();
                      setProfileForm(f => ({ ...f, username: v }));
                    }}
                    pattern="^[a-z0-9@._-]+$"
                    title="lowercase letters, digits and @ . _ - allowed"
                    required
                  />
                </label>

                <div style={{ display:'flex', gap:8 }}>
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => {
                    setProfileForm({
                      firstName: profile.firstName || '',
                      lastName: profile.lastName || '',
                      mobile: profile.mobile || '',
                      email: profile.email || '',
                      username: profile.username || ''
                    });
                    setMsgFor('profile','Changes reverted', 2000);
                  }}>Cancel</button>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd', textAlign: 'right' }}>
      <button
        type="button"
        onClick={deleteAccount}
        style={{
          background: '#d32f2f',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        Delete My Account
      </button>
    </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
