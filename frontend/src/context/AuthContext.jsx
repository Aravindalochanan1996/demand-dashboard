import React, { createContext, useContext, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("username");
    return token ? { token, role, username } : null;
  });

  const login = async (username, password) => {
    const res = await api.post("/api/auth/login", { username, password });
    const { access_token, role, username: uname } = res.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("role", role);
    localStorage.setItem("username", uname);
    setAuth({ token: access_token, role, username: uname });
    return role;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
