import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext({ user: null, setUser: () => {}, role: null, setRole: () => {} });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
