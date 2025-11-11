import React, { useState } from 'react';
import { FaWhatsapp, FaEnvelope } from 'react-icons/fa';

export default function ContactUs({ handleSubmitFeedback, setMsgFor }) {
  const [type, setType] = useState('problem');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setMsgFor('settings', 'Message cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      await handleSubmitFeedback({ type, message });
      setMessage(''); // Clear textarea on success
    } catch (error) {
      // Error is set in MainLayout
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-us-section">
      {/* ----- Feedback Section ----- */}
      <section>
        <h3 className="page-header">Report or Suggest</h3>
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="contact-form-group">
            <label htmlFor="contact-type">Reason for Contact</label>
            <select
              id="contact-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={loading}
            >
              <option value="problem">Report a Problem</option>
              <option value="suggestion">Suggest New Features</option>
            </select>
          </div>

          <div className="contact-form-group">
            <label htmlFor="contact-message">Your Message</label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'problem'
                  ? 'Describe the issue you are facing...'
                  : 'What new feature would you like to see?'
              }
              required
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </form>
      </section>

      {/* ----- Collaboration & Sponsorship Section ----- */}
      <section>
        <h3 className="page-header">Collaboration & Sponsorship</h3>
        <div className="collaboration-links">
          <a
            href="https://wa.me/919081818478"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaWhatsapp /> Contact on WhatsApp
          </a>

          {/* Email button with pre-filled subject and message */}
          <a
            href="mailto:kadiyaparth612@gmail.com?subject=Collaboration%20%26%20Sponsorship%20Inquiry&body=Hello%20Sir%2C%0A%0AI%20hope%20you%27re%20doing%20well.%20I%20am%20interested%20in%20discussing%20a%20potential%20collaboration%20and%20sponsorship%20opportunity%20with%20you.%0A%0APlease%20let%20me%20know%20a%20suitable%20time%20to%20connect.%0A%0ABest%20Regards%2C%0A[Your%20Name]%0A[Your%20Organization]%0A[Contact%20Details]"
          >
            <FaEnvelope /> Send an Email
          </a>
        </div>
      </section>
    </div>
  );
}
