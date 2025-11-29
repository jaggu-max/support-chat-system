// AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
const API_URL = 'http://localhost:5000/api/auth';

export const AuthProvider = ({ children }) => {
    const [agent, setAgent] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('agentToken') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Decode token locally (simple check)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setAgent({ username: 'Agent', id: payload.id }); 
            } catch {
                localStorage.removeItem('agentToken');
                setToken(null);
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            const { token: jwtToken, username: agentName, _id: agentId } = res.data;
            
            localStorage.setItem('agentToken', jwtToken);
            setToken(jwtToken);
            setAgent({ username: agentName, id: agentId });
            return true;
        } catch (err) { return false; }
    };
    
    const register = async (username, password) => {
         try {
            const res = await axios.post(`${API_URL}/register`, { username, password });
            const { token: jwtToken } = res.data;
            
            localStorage.setItem('agentToken', jwtToken);
            setToken(jwtToken);
            // Re-login to get agent details for simplicity
            return await login(username, password); 
        } catch (err) { return false; }
    }

    const logout = () => {
        localStorage.removeItem('agentToken');
        setToken(null);
        setAgent(null);
    };

    return (
        <AuthContext.Provider value={{ agent, token, loading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};