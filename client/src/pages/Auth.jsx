// client\src\pages\Auth.jsx

import React, { useState } from 'react';
import Signup from './Signup';
import Login from './Login';
import '../styles/Auth.css';

export default function Auth() {
  const [activeForm, setActiveForm] = useState('login');

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-panel">
          <div className="auth-panel-content">
            {activeForm === 'login' ? (
              <>
                <h1>Welcome Back!</h1>
                <p>Connect with your friends and share your moments. Login to continue your journey.</p>
              </>
            ) : (
              <>
                <h1>Create an Account</h1>
                <p>Join our community! It's quick and easy.</p>
              </>
            )}
          </div>
        </div>

        <div className="auth-forms-wrapper">
          {activeForm === 'login' ? (
            <div className="auth-card">
              <h3 className="auth-title">Login</h3>
              <Login />
              <p className="auth-toggle-text">
                Don't have an account?{' '}
                <button onClick={() => setActiveForm('signup')} className="auth-toggle-button">
                  Sign Up
                </button>
              </p>
            </div>
          ) : (
            <div className="auth-card">
              <h3 className="auth-title">Create Account</h3>
              <Signup />
              <p className="auth-toggle-text">
                Already have an account?{' '}
                <button onClick={() => setActiveForm('login')} className="auth-toggle-button">
                  Login
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}