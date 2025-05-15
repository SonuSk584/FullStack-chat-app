import React, { createContext, useContext } from 'react';
import { useAuthStore } from '../store/useAuthStrore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { authUser } = useAuthStore();

  return (
    <AuthContext.Provider value={{ user: authUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 