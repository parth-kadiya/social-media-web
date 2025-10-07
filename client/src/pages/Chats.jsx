import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import '../styles/Chats.css';
import { FaPaperPlane } from 'react-icons/fa';

export default function Chats() {
  const {
    profile, chatList, openChat, activeChatFriend, setActiveChatFriend,
    chatMessages, chatInput, setChatInput, sendChatMessage, stopChatPolling,
    chatContainerRef, msgs
  } = useOutletContext();

  useEffect(() => {
    return () => {
      // Jab component chhod ke jayein to active chat aur polling band kar dein.
      setActiveChatFriend(null);
      stopChatPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // YAHAN SE PURANA SCROLLING useEffect HATA DIYA GAYA HAI.
  // Saara logic ab MainLayout.jsx me hai.

  return (
    <div className="chats-page">
      <h2 className="page-header">Chats</h2>
      {msgs.chats && <div className="page-message">{msgs.chats}</div>}

      <div className="chat-container">
        {/* Left: Friends List */}
        <div className={`chat-sidebar ${activeChatFriend ? 'mobile-hidden' : ''}`}>
          {chatList.length === 0 && <div className="empty-state">No friends to chat with.</div>}
          {chatList.map(f => (
            <div
              key={f._id}
              className={`chat-contact ${activeChatFriend?._id === f._id ? 'active' : ''}`}
              onClick={() => openChat(f)}
            >
              <div className="contact-info">
                <div className="contact-name">{f.firstName} {f.lastName}</div>
                <div className="contact-username">@{f.username}</div>
              </div>
              {f.unreadCount > 0 && <div className="unread-badge">{f.unreadCount}</div>}
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
              <div className="chat-window-header">
                <h3>{activeChatFriend.firstName} {activeChatFriend.lastName}</h3>
                <button className="close-chat-btn" onClick={() => setActiveChatFriend(null)}>← Back</button>
              </div>
              <div className="chat-messages" ref={chatContainerRef}>
                {chatMessages.map(m => {
                  const mine = m.from === profile?._id;
                  return (
                    // YAHAN BADLAV KIYA GAYA HAI: data-message-id add kiya gaya hai
                    <div
                      key={m._id || m.createdAt}
                      data-message-id={m._id} // <-- YEH ATTRIBUTE ADD KIYA GAYA HAI
                      className={`message-bubble-wrapper ${mine ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble">
                        <div className="message-text">{m.text}</div>
                        <div className="message-timestamp">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={sendChatMessage} className="chat-input-form">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={`Message @${activeChatFriend.username}`}
                  className="chat-input"
                />
                <button type="submit" className="send-button" disabled={!chatInput.trim()}>
                  <FaPaperPlane />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}