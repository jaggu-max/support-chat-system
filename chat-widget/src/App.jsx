import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
// Fix: Removed 'react-uuid' import which was failing to resolve. 
// We will use the browser's built-in crypto.randomUUID() function for unique IDs instead.

// --- CONFIGURATION ---
const API_URL = 'http://localhost:5000/api/auth';
const SOCKET_SERVER_URL = 'http://localhost:5000';
const AGENT_ROOM = 'admin_room'; 

// --- STYLING CONSTANTS (WhatsApp Aesthetic) ---
const COLORS = {
    WA_DARK: '#075E54',      // Dark Teal Header
    WA_LIGHT: '#128C7E',     // Lighter Teal
    WA_GREEN: '#25D366',     // Send Button/Accent
    WA_BACKGROUND: '#ECE5DD', // Chat background
    MSG_MINE: '#DCF8C6',    // My Message Bubble
    MSG_OTHER: 'white',      // Other Message Bubble
};

// --- AUTH CONTEXT ---
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('userToken') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                // Simple token decoding (Note: In production, verify on backend)
                const payload = JSON.parse(atob(token.split('.')[1]));
                // Set default role to 'student' if not specified
                setUser({ username: payload.username, id: payload.id, role: payload.role || 'student' }); 
            } catch {
                localStorage.removeItem('userToken');
                setToken(null);
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            const { token: jwtToken, username: userName, _id: userId, role } = res.data;
            
            localStorage.setItem('userToken', jwtToken);
            setToken(jwtToken);
            setUser({ username: userName, id: userId, role });
            return true;
        } catch (err) {
             console.error("Login failed:", err.response?.data || err.message);
             return false; 
        }
    };

    const register = async (username, password, role = 'student') => {
        try {
            await axios.post(`${API_URL}/register`, { username, password, role });
            return await login(username, password);
        } catch (err) { 
             console.error("Registration failed:", err.response?.data || err.message);
             return false; 
        }
    }

    const logout = () => {
        localStorage.removeItem('userToken');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- PRIVATE ROUTE COMPONENT ---
const PrivateRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="text-center p-8">Loading Authentication...</div>;
    if (!user) return <Navigate to="/auth" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
    return children;
};


// --- CHAT COMPONENTS ---

// Shared Chat Window (WhatsApp Style)
const ChatWindow = ({ messages, sendMessage, title, isAgent, disabled = false }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() && !disabled) {
            sendMessage(input);
            setInput('');
        }
    };
    
    // Style Definitions for Chat Bubbles
    const messageStyle = (msg) => ({
        maxWidth: '80%', 
        margin: '5px 0', 
        padding: '8px 10px',
        borderRadius: '8px', 
        fontSize: '14px',
        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
        position: 'relative',
    });

    const myBubbleStyle = { 
        ...messageStyle(),
        background: COLORS.MSG_MINE, 
        marginLeft: 'auto', 
        borderRadius: '8px 8px 0 8px', 
    };

    const otherBubbleStyle = { 
        ...messageStyle(),
        background: COLORS.MSG_OTHER, 
        marginRight: 'auto', 
        borderRadius: '8px 8px 8px 0', 
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="p-4 flex items-center shadow-md" style={{ backgroundColor: COLORS.WA_DARK, color: 'white' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3" style={{ backgroundColor: COLORS.WA_GREEN }}>
                    {title[0]}
                </div>
                <span className="text-lg font-semibold">{title}</span>
            </div>
            
            {/* Messages Container */}
            <div className="flex-grow overflow-y-auto p-3 space-y-2" style={{ backgroundColor: COLORS.WA_BACKGROUND }}>
                {messages.map((msg, index) => {
                    const isMyMsg = msg.sender === (isAgent ? 'agent' : 'customer');
                    return (
                        <div 
                            key={index} 
                            style={isMyMsg ? myBubbleStyle : otherBubbleStyle}
                            className={`flex flex-col ${isMyMsg ? 'self-end' : 'self-start'}`}
                        >
                            <span className="text-black">{msg.content}</span>
                            <span className="text-xs mt-1" style={{ color: COLORS.WA_DARK }}>
                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="flex p-3 border-t bg-gray-50">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={disabled ? "Chat connecting..." : "Type a message..."}
                    className="flex-grow p-3 rounded-full border-none focus:outline-none"
                    style={{ backgroundColor: 'white', marginRight: '10px' }}
                    disabled={disabled}
                />
                <button 
                    type="submit" 
                    className="p-3 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold transition-transform transform hover:scale-105"
                    style={{ backgroundColor: disabled ? 'gray' : COLORS.WA_GREEN }}
                    disabled={disabled}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.894 2.556a.99.99 0 00-1.788 0l-7 14A.999.999 0 003 18h14c.732 0 1.258-.654 1.154-1.344l-7-14z"></path></svg>
                </button>
            </form>
        </div>
    );
};

// Chat List (Lecturer Sidebar)
const ChatList = ({ chats, selectedChat, onSelectChat }) => {
    return (
        <div className="flex-shrink-0 w-full sm:w-1/3 border-r overflow-y-auto bg-gray-100" style={{ maxHeight: 'calc(100vh - 64px)' }}>
            <h3 className="p-4 text-white font-semibold sticky top-0" style={{ backgroundColor: COLORS.WA_DARK }}>
                Active Support Tickets ({chats.length})
            </h3>
            {chats.map(chat => (
                <div 
                    key={chat._id} 
                    onClick={() => onSelectChat(chat)}
                    className="flex items-center p-3 border-b cursor-pointer transition duration-150 hover:bg-gray-200"
                    style={{ backgroundColor: selectedChat?._id === chat._id ? COLORS.WA_BACKGROUND : 'white' }}
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3" style={{ backgroundColor: COLORS.WA_GREEN, color: 'white' }}>
                        S
                    </div>
                    <div>
                        <p className="font-semibold text-sm m-0">Customer: {chat.customerId.substring(0, 8)}...</p>
                        <p className="text-xs text-gray-500 m-0">Status: {chat.status.toUpperCase()}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};


// --- PAGES ---

// Login/Register Form
const LoginRegister = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const { login, register, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate(user.role === 'lecturer' ? '/lecturer' : '/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        let success;
        if (isRegister) {
            success = await register(username, password, role); 
        } else {
            success = await login(username, password);
        }
        
        if (!success) {
            setError(isRegister ? 'Registration failed. Username may exist.' : 'Invalid credentials.');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm">
                <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: COLORS.WA_DARK }}>
                    {isRegister ? 'System Registration' : 'System Login'}
                </h2>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                
                {isRegister && (
                    <div className="mb-4">
                        <label className="text-sm font-medium block mb-1">Role (for Testing):</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500">
                            <option value="student">Student (Chat User)</option>
                            <option value="lecturer">Lecturer (Admin Access)</option>
                        </select>
                    </div>
                )}
                
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full p-3 mb-4 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full p-3 mb-6 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                
                <button 
                    type="submit" 
                    className="w-full p-3 text-white font-bold rounded-full transition duration-200 hover:bg-opacity-90"
                    style={{ backgroundColor: COLORS.WA_GREEN }}
                >
                    {isRegister ? 'Register & Login' : 'Login'}
                </button>
                
                <p className="mt-4 text-center text-sm cursor-pointer" style={{ color: COLORS.WA_DARK }} onClick={() => setIsRegister(!isRegister)}>
                    {isRegister ? 'Already have an account? Login here.' : "Need an account? Register here."}
                </p>
            </form>
        </div>
    );
};

// Student/Public Portal
const StudentPortal = () => {
    const { user, logout } = useAuth();
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    // Using crypto.randomUUID() for guaranteed unique ID generation without external libraries.
    const customerId = useRef(localStorage.getItem('chat_customer_id') || crypto.randomUUID());
    const websiteId = 'University_Portal'; 

    useEffect(() => {
        localStorage.setItem('chat_customer_id', customerId.current);
        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            // Initiate chat for guest/student user
            newSocket.emit('initChat', { websiteId, customerId: customerId.current });
        });

        newSocket.on('chatInitialized', ({ conversationId, messages: initialMessages }) => {
            setConversationId(conversationId);
            setMessages(initialMessages || []);
        });

        newSocket.on('newMessage', (message) => {
            setMessages(prevMessages => [...prevMessages, message]);
        });
        
        newSocket.on('disconnect', () => {
             console.log("Socket disconnected.");
        });

        return () => newSocket.disconnect();
    }, []);

    const sendMessage = (content) => {
        if (socket && conversationId) {
            socket.emit('customerMessage', { conversationId, messageContent: content });
            // Optimistic update
            setMessages(prevMessages => [...prevMessages, { sender: 'customer', content, timestamp: Date.now() }]);
        }
    };

    return (
        <div className="min-h-screen p-5 sm:p-10 bg-gray-50 flex flex-col items-center">
            <div className="w-full max-w-4xl text-center mb-6">
                <h1 className="text-4xl font-light" style={{ color: COLORS.WA_DARK }}>Student & Guest Helpdesk</h1>
                <p className="text-gray-600 mt-2">Welcome, {user?.username || 'Guest'}. Connect with a lecturer using the chat below.</p>
                {user && user.role !== 'lecturer' && 
                    <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                        Logout ({user.username})
                    </button>
                }
            </div>

            {/* Chat Widget Container - Fixed Size & Mobile Responsive */}
            <div className="w-full max-w-lg h-96 sm:h-[600px] border-4 rounded-xl shadow-2xl overflow-hidden" style={{ borderColor: COLORS.WA_DARK }}>
                <ChatWindow 
                    messages={messages} 
                    sendMessage={sendMessage} 
                    title={conversationId ? "University Support Chat" : "Connecting to Helpdesk..."}
                    isAgent={false} 
                    disabled={!conversationId}
                />
            </div>
        </div>
    );
};

// Lecturer/Admin Portal
const LecturerPortal = () => {
    const { token, user, logout } = useAuth();
    const [socket, setSocket] = useState(null);
    const [activeChats, setActiveChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);

    // 1. Connection and Initialization (Agent-Side)
    useEffect(() => {
        if (!token || user.role === 'student') return; 

        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('agentConnect', token); 
        });
        
        newSocket.on('activeConversations', (chats) => {
            setActiveChats(chats);
        });

        newSocket.on('newChatRequest', (newChat) => {
            // Display alert/notification in the UI (not with window.alert)
            console.log(`New chat request received: ${newChat._id}`);
            setActiveChats(prevChats => [newChat, ...prevChats]);
        });

        newSocket.on('newMessage', (message) => {
            // Update the message list in the sidebar 
            setActiveChats(prevChats => prevChats.map(chat => {
                if (chat._id === message.conversationId) {
                    return { ...chat, messages: [...chat.messages, message] };
                }
                return chat;
            }));

            // Update the currently selected chat window
            setSelectedChat(prevChat => {
                if (prevChat && prevChat._id === message.conversationId) {
                    return { ...prevChat, messages: [...prevChat.messages, message] };
                }
                return prevChat;
            });
        });

        return () => newSocket.disconnect();
    }, [token, user]);

    // 2. Handle chat selection and join room
    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
        if (socket) {
            // Note: The original code had agentJoinChat, but the backend server.js 
            // does not currently define a listener for it. It's often handled implicitly 
            // by the initial agentConnect fetching all active chats. However, keeping 
            // the emit here is harmless if the backend is later updated.
            socket.emit('agentJoinChat', { conversationId: chat._id });
        }
    };

    // 3. Send Message (Agent)
    const sendMessage = (content) => {
        if (socket && selectedChat && user) {
            
            // Optimistic update
            const tempMessage = { sender: 'agent', content: content, timestamp: Date.now(), conversationId: selectedChat._id };
            setSelectedChat(prevChat => ({ ...prevChat, messages: [...prevChat.messages, tempMessage] }));
            
            socket.emit('agentMessage', {
                conversationId: selectedChat._id,
                messageContent: content,
                agentId: user.id 
            });
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Top Bar */}
            <div className="flex-shrink-0 p-4 shadow-lg flex justify-between items-center" style={{ backgroundColor: COLORS.WA_LIGHT, color: 'white' }}>
                <h2 className="text-xl font-light">Lecturer Support Portal ({user.role.toUpperCase()})</h2>
                <button onClick={logout} className="px-4 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                    Logout ({user.username})
                </button>
            </div>

            {/* Main Content Area (Mobile: Stacked, Desktop: Side-by-Side) */}
            <div className="flex flex-grow overflow-hidden flex-col sm:flex-row">
                {/* Chat List (Sidebar) */}
                <div className="flex-shrink-0 w-full sm:w-80 border-r overflow-y-auto" style={{ height: '50vh', sm: '100%', backgroundColor: '#f0f0f0' }}>
                    <ChatList 
                        chats={activeChats} 
                        selectedChat={selectedChat} 
                        onSelectChat={handleSelectChat}
                    />
                </div>

                {/* Chat Window */}
                <div className="flex-grow flex flex-col bg-white">
                    {selectedChat ? (
                        <ChatWindow
                            messages={selectedChat.messages || []}
                            sendMessage={sendMessage}
                            title={`Chat with ${selectedChat.customerId.substring(0, 10)}...`}
                            isAgent={true}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-grow p-5 text-gray-500 text-center bg-gray-50">
                            <p className="text-xl font-light">
                                Welcome, {user.username}. Select a conversation from the left to start assisting a user.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="font-sans min-h-screen">
                    <Routes>
                        {/* 1. Public Portal (Student View) */}
                        <Route path="/" element={<StudentPortal />} />
                        
                        {/* 2. Authentication Route */}
                        <Route path="/auth" element={<LoginRegister />} />
                        
                        {/* 3. Protected Lecturer/Admin Route */}
                        <Route path="/lecturer" element={
                            <PrivateRoute allowedRoles={['lecturer', 'admin']}>
                                <LecturerPortal />
                            </PrivateRoute>
                        } />
                        
                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </AuthProvider>
        </Router>
    );
};