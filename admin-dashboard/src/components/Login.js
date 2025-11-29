// Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const success = isRegister 
            ? await register(username, password)
            : await login(username, password);
        
        if (success) {
            navigate('/');
        } else {
            setError(isRegister ? 'Registration failed.' : 'Login failed.');
        }
    };

    return (
        <div style={loginStyles.container}>
            <form onSubmit={handleSubmit} style={loginStyles.form}>
                <h2>{isRegister ? 'Agent Register' : 'Agent Login'}</h2>
                {error && <p style={loginStyles.error}>{error}</p>}
                
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={loginStyles.input}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={loginStyles.input}
                />
                
                <button type="submit" style={loginStyles.button}>
                    {isRegister ? 'Register' : 'Login'}
                </button>
                
                <p style={loginStyles.toggle} onClick={() => setIsRegister(!isRegister)}>
                    {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
                </p>
            </form>
        </div>
    );
};

const loginStyles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f4' },
    form: { backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', minWidth: '300px' },
    input: { width: '100%', padding: '10px', margin: '10px 0', border: '1px solid #ccc', borderRadius: '4px' },
    button: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' },
    toggle: { cursor: 'pointer', color: '#007bff', textAlign: 'center', marginTop: '15px' },
    error: { color: 'red', textAlign: 'center', marginBottom: '10px' }
};

export default Login;