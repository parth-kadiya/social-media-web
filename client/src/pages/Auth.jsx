import React from 'react';
import Signup from './Signup';
import Login from './Login';

/*
  Auth page shows Signup and Login on same screen.
  Layout: side-by-side on wide screens, stacked on small screens.
*/

export default function Auth() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <h3 style={styles.title}>Create Account</h3>
          <Signup />
        </div>

        <div style={styles.dividerWrapper}>
          <div style={styles.dividerLine} />
          <div style={styles.orText}>OR</div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.title}>Login</h3>
          <Login />
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: '#f7f7f7'
  },
  container: {
    width: '100%',
    maxWidth: 980,
    display: 'flex',
    gap: 20,
    alignItems: 'stretch',
    justifyContent: 'center',
    // responsive: stack on small screens
    flexWrap: 'wrap',
  },
  card: {
    flex: '1 1 320px',
    minWidth: 280,
    background: '#fff',
    padding: 20,
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
    boxSizing: 'border-box'
  },
  title: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 18,
    textAlign: 'center'
  },
  dividerWrapper: {
    width: 60,
    minWidth: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'column'
  },
  dividerLine: {
    width: 1,
    height: '60%',
    background: '#ddd'
  },
  orText: {
    position: 'absolute',
    background: '#f7f7f7',
    padding: '4px 6px',
    borderRadius: 4,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 12,
    color: '#666'
  }
};
