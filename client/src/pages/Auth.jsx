import React from 'react';
import Signup from './Signup';
import Login from './Login';
import '../styles/Auth.css'; // Import the new CSS file

export default function Auth() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Decorative Side Panel */}
        <div className="auth-panel">
          <div className="auth-panel-content">
            <h1>Welcome Back!</h1>
            <p>Connect with your friends and share your moments. Login to continue your journey.</p>
          </div>
        </div>

        {/* Forms Side */}
        <div className="auth-forms-wrapper">
          <div className="auth-card">
            <h3 className="auth-title">Create Account</h3>
            <Signup />
          </div>

          <div className="auth-divider">
            <span className="auth-divider-text">OR</span>
          </div>

          <div className="auth-card">
            <h3 className="auth-title">Login</h3>
            <Login />
          </div>
        </div>
      </div>
    </div>
  );
}