import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { Toaster } from "react-hot-toast";
import { useAuthStore } from './store/useAuthStrore';
import { useThemeStore } from './store/useThemeStore';
import { SocketContextProvider } from "./context/SocketContext";
import CallManager from "./components/calls/CallManager";
import Navbar from './components/Navbar.jsx';
import HomePage from './pages/HomePage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import SettingPage from './pages/SettingPage';
import ProfilePage from './pages/ProfilePage';

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      {authUser ? (
        <SocketContextProvider>
          <Router>
            <Navbar />
            <main className="container mx-auto px-4 pt-20">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/settings" element={<SettingPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <CallManager />
            <Toaster position="bottom-right" />
          </Router>
        </SocketContextProvider>
      ) : (
        <Router>
          <main className="container mx-auto px-4 pt-20">
            <Routes>
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </main>
          <Toaster position="bottom-right" />
        </Router>
      )}
    </div>
  );
};

export default App;