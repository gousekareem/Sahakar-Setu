import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("sahakarsetu_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const persist = (user, token) => {
    localStorage.setItem("sahakarsetu_token", token);
    localStorage.setItem("sahakarsetu_user", JSON.stringify(user));
    setUser(user);
  };

  const login = useCallback(async (phone, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { phone, password });
      persist(data.user, data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerCustomer = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/customer", payload);
      persist(data.user, data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerWorker = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/worker", payload);
      persist(data.user, data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerInstitution = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/institution", payload);
      persist(data.user, data.token);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sahakarsetu_token");
    localStorage.removeItem("sahakarsetu_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, registerCustomer, registerWorker, registerInstitution, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
