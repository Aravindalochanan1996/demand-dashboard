import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { auth } = useAuth();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && auth.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
