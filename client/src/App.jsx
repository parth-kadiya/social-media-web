import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import MainLayout from './pages/MainLayout';
import Home from './pages/Home';
import AddFriend from './pages/AddFriend';
import YourFriends from './pages/YourFriends';
import Chats from './pages/Chats';
import CreatePost from './pages/CreatePost';
import YourPosts from './pages/YourPosts';
import FriendRequests from './pages/FriendRequests';
import Profile from './pages/Profile';
import './setupAxios';
import './App.css';

// Simple PrivateRoute component
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/auth" element={<Auth />} />

        {/* Nested routes under MainLayout */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="feed" replace />} /> {/* Default route */}
          <Route path="feed" element={<Home />} />
          <Route path="add-friend" element={<AddFriend />} />
          <Route path="your-friends" element={<YourFriends />} />
          <Route path="chats" element={<Chats />} />
          <Route path="create-post" element={<CreatePost />} />
          <Route path="your-posts" element={<YourPosts />} />
          <Route path="friend-requests" element={<FriendRequests />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;