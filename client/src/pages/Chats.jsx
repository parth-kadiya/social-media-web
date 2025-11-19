// client/src/pages/Chats.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import Avatar from '../components/Avatar';
import '../styles/Chats.css';
import { FaPaperPlane, FaRegSmile } from 'react-icons/fa';
import api from '../services/api';

const quickEmojis = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

export default function Chats() {
  const {
    profile,
    chatList,
    openChat,
    activeChatFriend,
    setActiveChatFriend,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    stopChatPolling,
    chatContainerRef,
    msgs,
    seenByFriendMap,
    setSeenByFriendMap,
    loadChatsList
  } = useOutletContext();

  // 🔥 NEW JUGAD STATE
  const [paddingClass, setPaddingClass] = useState('');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPanelRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const chatInputRef = useRef(null);

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-GB');
  };

  const adjustHeight = (val) => {
    if (!chatInputRef.current) return;
    const textarea = chatInputRef.current;
    const value = val ?? chatInput;
    const hasNewline = value.includes('\n');

    if (hasNewline) {
      textarea.style.whiteSpace = 'normal';
      textarea.style.overflowX = 'hidden';
      textarea.style.height = 'auto';
      textarea.style.overflowY = 'visible';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.overflowY = 'hidden';
      const maxHeight = 120;
      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    } else {
      textarea.style.whiteSpace = 'pre';
      textarea.style.overflowX = 'auto';
      textarea.style.overflowY = 'hidden';
      textarea.style.height = '23px';
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(event.target) &&
        emojiBtnRef.current &&
        !emojiBtnRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => adjustHeight(), [chatInput]);

  useEffect(() => {
    return () => {
      setActiveChatFriend(null);
      stopChatPolling();
    };
  }, []);

  // ---------------------------------------------------
  // 🔥 JUGAD STEP 2: Chat change → padding reset
  useEffect(() => {
    setPaddingClass('');
  }, [activeChatFriend]);
  // ---------------------------------------------------

  // ---------------------------------------------------
  // 🔥 JUGAD STEP 3: Last msg incoming → padding reset
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg.from !== profile?._id) {
        setPaddingClass('');
      }
    }
  }, [chatMessages, profile?._id]);
  // ---------------------------------------------------

  // ---------------------------------------------------
  // 🔥 JUGAD STEP 4: SEND WRAPPERS
  const handleSendWrapper = (e) => {
    setPaddingClass('sent-padding'); // padding ON
    sendChatMessage(e);
  };

  const handleQuickEmojiWrapper = (emoji) => {
    setPaddingClass('sent-padding');
    sendChatMessage(null, emoji);
    setChatInput('');
    setShowEmojiPicker(false);
  };
  // ---------------------------------------------------

  // MARK AS READ LOGIC (same)
  const markActiveChatAsRead = useCallback(async () => {
    if (activeChatFriend?._id && profile?._id && !document.hidden) {
      try {
        await api.post(`/chats/${activeChatFriend._id}/mark-read`);
        setSeenByFriendMap(prev => ({
          ...prev,
          [activeChatFriend._id]: true
        }));
        if (loadChatsList) loadChatsList();
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    }
  }, [activeChatFriend?._id, profile?._id, loadChatsList]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) markActiveChatAsRead();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [markActiveChatAsRead]);

  useEffect(() => {
    markActiveChatAsRead();
  }, [activeChatFriend?._id, markActiveChatAsRead]);

  useEffect(() => {
    if (chatMessages.length > 0 && !document.hidden) {
      markActiveChatAsRead();
    }
  }, [chatMessages, markActiveChatAsRead]);

  const handleChange = (e) => {
    const value = e.target.value;
    setChatInput(value);
    adjustHeight(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.trim()) {
        handleSendWrapper(e);
      }
    }
  };

  return (
    <div className="chats-page">
      <h2 className="page-header">Chats</h2>
      {msgs.chats && <div className="page-message">{msgs.chats}</div>}
      <div className="chat-container">

        {/* LEFT SIDEBAR */}
        <div className={`chat-sidebar ${activeChatFriend ? 'mobile-hidden' : ''}`}>
          {chatList.length === 0 && (
            <div className="empty-state">No friends to chat with.</div>
          )}

          {chatList.map((f) => (
            <div
              key={f._id}
              className={`chat-contact ${activeChatFriend?._id === f._id ? 'active' : ''}`}
              onClick={() => openChat(f)}
            >
              <div className="chat-contact-main">
                <Avatar src={f.profilePictureUrl} alt={f.firstName} size="medium" />
                <div className="contact-info">
                  <div className="contact-name">{f.firstName} {f.lastName}</div>
                  <div className="contact-username">@{f.username}</div>
                </div>
              </div>
              {f.unreadCount > 0 && <div className="unread-badge">{f.unreadCount}</div>}
            </div>
          ))}
        </div>

        {/* RIGHT CHAT WINDOW */}
        <div className={`chat-window ${!activeChatFriend ? 'mobile-hidden' : ''}`}>
          {!activeChatFriend ? (
            <div className="no-chat-selected"><p>Select a friend to start chatting</p></div>
          ) : (
            <>
              {/* HEADER */}
              <div className="chat-window-header">
                <Avatar src={activeChatFriend.profilePictureUrl} alt="" size="small" />
                <h3>{activeChatFriend.firstName} {activeChatFriend.lastName}</h3>
                <button className="close-chat-btn" onClick={() => setActiveChatFriend(null)}>← Back</button>
              </div>

              {/* CHAT MESSAGES */}
              <div className={`chat-messages ${paddingClass}`} ref={chatContainerRef}>
                {chatMessages.map((m, index, all) => {
                  const mine = m.from === profile?._id;

                  let showSeen = false;
                  if (
                    mine &&
                    index === all.length - 1 &&
                    seenByFriendMap &&
                    seenByFriendMap[activeChatFriend._id]
                  ) {
                    showSeen = true;
                  }

                  let dateSeparator = null;
                  const msgDate = new Date(m.createdAt);
                  const prev = all[index - 1];
                  const prevDate = prev ? new Date(prev.createdAt) : null;
                  if (index === 0 || (prevDate && msgDate.toDateString() !== prevDate.toDateString())) {
                    dateSeparator = (
                      <div className="date-separator"><span>{formatDate(msgDate)}</span></div>
                    );
                  }

                  return (
                    <React.Fragment key={m._id || m.createdAt}>
                      {dateSeparator}
                      <div className={`message-container ${mine ? 'sent' : 'received'}`}>
                        <div className="message-bubble-wrapper">
                          <div className="message-bubble">
                            <div className="message-text">{m.text}</div>
                            <div className="message-timestamp">
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        {showSeen && <div className="seen-status">Seen</div>}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* INPUT BOX */}
              <div className="chat-input-wrapper">
                {showEmojiPicker && (
                  <div className="emoji-picker-panel" ref={emojiPanelRef}>
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="quick-emoji-btn"
                        onClick={() => handleQuickEmojiWrapper(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendWrapper} className="chat-input-form">
                  <button
                    type="button"
                    className="emoji-picker-btn"
                    ref={emojiBtnRef}
                    onClick={() => setShowEmojiPicker(p => !p)}
                  >
                    <FaRegSmile />
                  </button>

                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Message"
                    className="chat-input"
                    rows={1}
                  />

                  <button
                    type="submit"
                    className="send-button"
                    disabled={!chatInput.trim()}
                  >
                    <FaPaperPlane />
                  </button>
                </form>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
