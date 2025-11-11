import React, { useEffect, useState, useRef, useCallback } from 'react'; // useCallback add kiya
import { useOutletContext } from 'react-router-dom';
import Avatar from '../components/Avatar';
import '../styles/Chats.css';
import { FaPaperPlane, FaRegSmile } from 'react-icons/fa';
import api from '../services/api'; // api service import kiya

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
    loadChatsList // loadChatsList ko context se liya
  } = useOutletContext();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPanelRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const chatInputRef = useRef(null); // Ref for textarea

  // --- adjustHeight function ---
  const adjustHeight = (val) => {
    if (!chatInputRef.current) return;
    const textarea = chatInputRef.current;
    const value = val ?? chatInput;
    const hasNewline = value.includes('\n');

    if (hasNewline) {
      // Multi-line mode
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
      // Single-line mode
      textarea.style.whiteSpace = 'pre';
      textarea.style.overflowX = 'auto';
      textarea.style.overflowY = 'hidden';
      textarea.style.height = '23px';
    }
  };

  // --- useEffect for handleClickOutside (Emoji Picker) ---
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- useEffect to adjust height on input change ---
  useEffect(() => {
    adjustHeight();
  }, [chatInput]);

  // --- useEffect for cleanup on unmount ---
  useEffect(() => {
    // Component unmount hone par active chat ko null set karo aur polling stop karo
    return () => {
      setActiveChatFriend(null);
      stopChatPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Yeh sirf unmount par chalna chahiye

  // --- Mark Read Function with Visibility Check ---
  const markActiveChatAsRead = useCallback(async () => {
    // Sirf check karo ki chat active hai aur tab visible hai
    if (activeChatFriend?._id && profile?._id && !document.hidden) {
      
      // --- FAULTY OPTIMIZATION REMOVED ---
      // const currentChatInfo = chatList.find(f => f._id === activeChatFriend._id);
      // if (!currentChatInfo || currentChatInfo.unreadCount > 0) {
      // --- END REMOVED ---

        // Ab hum hamesha API call karenge jab tab visible/active hota hai.
        // Server check kar lega ki kuch naya update karna hai ya nahi (modifiedCount > 0).
        console.log(`Tab is visible and chat with ${activeChatFriend.username} is active. Attempting to mark messages as read...`);
        try {
          await api.post(`/chats/${activeChatFriend._id}/mark-read`);
          console.log(`Successfully POSTed to mark-read for ${activeChatFriend.username}.`);
          // Sidebar count update karo (server se event aane ke alawa)
          if (loadChatsList) {
             loadChatsList();
          }
        } catch (error) {
          console.error("Failed to mark messages as read:", error);
        }

    } else {
        console.log(`Skipping mark-read: ActiveFriend=${!!activeChatFriend?._id}, Profile=${!!profile?._id}, Hidden=${document.hidden}`);
    }
  }, [activeChatFriend?._id, profile?._id, loadChatsList]);

  // --- Effect for Visibility Change ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log("Visibility changed. Hidden:", document.hidden);
      if (!document.hidden) {
        markActiveChatAsRead();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    console.log("Visibility listener added.");
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      console.log("Visibility listener removed.");
    };
  }, [markActiveChatAsRead]);

  // --- Effect for Active Chat Change ---
  useEffect(() => {
    console.log("Active chat friend changed or component mounted:", activeChatFriend?.username);
    markActiveChatAsRead();
  }, [activeChatFriend?._id, markActiveChatAsRead]);


  // --- Event Handlers ---
  const handleQuickEmojiSend = (emoji) => {
    sendChatMessage(null, emoji);
    setChatInput('');
    setShowEmojiPicker(false);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setChatInput(newValue);
    adjustHeight(newValue);
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.trim()) {
        sendChatMessage(e);
      }
    }
  };

  // --- Return JSX ---
  return (
    <div className="chats-page">
      <h2 className="page-header">Chats</h2>
      {msgs.chats && <div className="page-message">{msgs.chats}</div>}
      <div className="chat-container">
        {/* Left: Friends List */}
        <div className={`chat-sidebar ${activeChatFriend ? 'mobile-hidden' : ''}`}>
          {chatList.length === 0 && (
            <div className="empty-state">No friends to chat with.</div>
          )}
          {chatList.map((f) => (
            <div
              key={f._id}
              className={`chat-contact ${
                activeChatFriend?._id === f._id ? 'active' : ''
              }`}
              onClick={() => openChat(f)}
            >
              <div className="chat-contact-main">
                <Avatar src={f.profilePictureUrl} alt={f.firstName} size="medium" />
                <div className="contact-info">
                  <div className="contact-name">
                    {f.firstName} {f.lastName}
                  </div>
                  <div className="contact-username">@{f.username}</div>
                </div>
              </div>
              {f.unreadCount > 0 && (
                <div className="unread-badge">{f.unreadCount}</div>
              )}
            </div>
          ))}
        </div>

        {/* Right: Active Chat Window */}
        <div className={`chat-window ${!activeChatFriend ? 'mobile-hidden' : ''}`}>
          {!activeChatFriend ? (
            <div className="no-chat-selected">
              <p>Select a friend to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat Window Header */}
              <div className="chat-window-header">
                <Avatar
                  src={activeChatFriend.profilePictureUrl}
                  alt={activeChatFriend.firstName}
                  size="small"
                />
                <h3>
                  {activeChatFriend.firstName} {activeChatFriend.lastName}
                </h3>
                <button
                  className="close-chat-btn"
                  onClick={() => setActiveChatFriend(null)}
                >
                  ← Back
                </button>
              </div>

              {/* Chat Messages */}
              <div className="chat-messages" ref={chatContainerRef}>
                {chatMessages.map((m, index, allMessages) => {
                  const mine = m.from === profile?._id;
                  let showSeenStatus = false;
                  if (
                      index === allMessages.length - 1 &&
                      mine &&
                      seenByFriendMap && seenByFriendMap[activeChatFriend._id]
                     ) {
                       showSeenStatus = true;
                     }

                  let dateSeparator = null;
                  const currentMsgDate = new Date(m.createdAt);
                  const prevMsg = allMessages[index - 1];
                  const prevMsgDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                  if (
                      index === 0 ||
                      (prevMsgDate && currentMsgDate.toDateString() !== prevMsgDate.toDateString())
                     ) {
                       dateSeparator = (
                         <div className="date-separator">
                           <span>{currentMsgDate.toLocaleDateString('en-GB')}</span>
                         </div>
                       );
                     }

                  return (
                    <React.Fragment key={m._id || m.createdAt}>
                      {dateSeparator}
                      <div className={`message-container ${mine ? 'sent' : 'received'}`}>
                        <div
                          data-message-id={m._id}
                          className={`message-bubble-wrapper ${mine ? 'sent' : 'received'}`}
                        >
                          <div className="message-bubble">
                            <div className="message-text">{m.text}</div>
                            <div className="message-timestamp">
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                        {showSeenStatus && (
                          <div className="seen-status">Seen</div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Chat Input Wrapper */}
              <div className="chat-input-wrapper">
                {/* Emoji Panel */}
                {showEmojiPicker && (
                  <div className="emoji-picker-panel" ref={emojiPanelRef}>
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="quick-emoji-btn"
                        onClick={() => handleQuickEmojiSend(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                {/* Input Form */}
                <form onSubmit={sendChatMessage} className="chat-input-form">
                  <button
                    type="button"
                    className="emoji-picker-btn"
                    ref={emojiBtnRef}
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
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