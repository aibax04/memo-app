
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';

import MeetingsList from './pages/MeetingsList';
import MeetingDetail from './pages/MeetingDetail';
import Templates from './pages/Templates';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AuthLayout from './components/AuthLayout';
import ProtectedLayout from './components/ProtectedLayout';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-center" closeButton />
        <div className="min-h-screen bg-[#F3F3F3]">
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Auth Routes */}
            <Route path="/login" element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            } />

            {/* Admin Route (standalone auth) */}
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Protected Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<MeetingsList />} />
              <Route path="/meetings" element={<MeetingsList />} />
              <Route path="/meetings/:id" element={<MeetingDetail />} />
              <Route path="/templates" element={<Templates />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router >
  );
};

export default App;
