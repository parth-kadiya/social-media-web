import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Home from './pages/Home';
import './setupAxios'; // ensure interceptor loaded

function App(){
  return (
    <BrowserRouter>
      <Routes>
        {/* root shows combined Login + Signup page */}
        <Route path="/" element={<Auth />} />
        <Route path="/home" element={<Home/>} />
        {/* keep explicit routes if you want direct links */}
        <Route path="/auth" element={<Auth />} />
        {/* fallback -> home page (or auth if not logged in) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
