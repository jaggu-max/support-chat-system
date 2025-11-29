// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const PrivateRoute = ({ children }) => {
    const { agent, loading } = useAuth();

    if (loading) {
        return <div style={{textAlign: 'center', marginTop: '50px'}}>Loading...</div>;
    }

    // If agent is logged in, render the children (Dashboard)
    return agent ? children : <Navigate to="/login" />;
};

const AppContent = () => {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                    <PrivateRoute>
                        <AdminDashboard />
                    </PrivateRoute>
                } />
            </Routes>
        </Router>
    );
};

const App = () => (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
);

export default App;