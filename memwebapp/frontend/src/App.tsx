
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';

import MeetingsList from './pages/MeetingsList';
import MeetingDetail from './pages/MeetingDetail';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import AuthLayout from './components/AuthLayout';
import ProtectedLayout from './components/ProtectedLayout';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-[#F8FAFC]">
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Auth Routes */}
            <Route path="/login" element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            } />
            <Route path="/signup" element={
              <AuthLayout>
                <SignUp />
              </AuthLayout>
            } />

            {/* Protected Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<MeetingsList />} />
              <Route path="/meetings" element={<MeetingsList />} />
              <Route path="/meetings/:id" element={<MeetingDetail />} />
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
