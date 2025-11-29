// AdminDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_SERVER_URL = 'http://localhost:5000';

const AdminDashboard = () => {
    const { token, agent, logout } = useAuth();
    const [socket, setSocket] = useState(null);
    const [activeChats, setActiveChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // 1. Connection and Initialization (Agent-Side)
    useEffect(() => {
        if (!token) return;

        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            // Send the JWT token for verification
            newSocket.emit('agentConnect', token); 
        });
        
        // Handle auth failure (will be caught by AuthProvider)
        newSocket.on('authError', logout);

        newSocket.on('activeConversations', (chats) => {
            setActiveChats(chats);
        });

        // Update active chats on new request
        newSocket.on('newChatRequest', (newChat) => {
            setActiveChats(prevChats => [newChat, ...prevChats]);
        });

        // 2. Message Handling (Update both list and selected chat)
        newSocket.on('newMessage', (message) => {
            setActiveChats(prevChats => prevChats.map(chat => {
                if (chat._id === message.conversationId) {
                    return { ...chat, messages: [...chat.messages, message], status: message.sender === 'agent' ? 'active' : chat.status };
                }
                return chat;
            }));

            // Update messages in the currently selected chat
            setSelectedChat(prevChat => {
                if (prevChat && prevChat._id === message.conversationId) {
                    return { ...prevChat, messages: [...prevChat.messages, message] };
                }
                return prevChat;
            });
        });

        return () => newSocket.disconnect();
    }, [token, logout]);

    // 3. Handle chat selection
    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
        if (socket) {
            // Join the specific room to receive live updates
            socket.emit('agentJoinChat', { conversationId: chat._id });
        }
    };
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedChat?.messages.length]);

    // 4. Send Message (Agent)
    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && socket && selectedChat && agent) {
            const tempMessage = { sender: 'agent', content: input, timestamp: new Date(), conversationId: selectedChat._id };
            
            setSelectedChat(prevChat => ({
                ...prevChat,
                messages: [...prevChat.messages, tempMessage]
            }));

            socket.emit('agentMessage', {
                conversationId: selectedChat._id,
                messageContent: input,
                agentId: agent.id // Send agent ID for DB tracking
            });
            setInput('');
        }
    };

    return (
        <div style={adminStyles.dashboardContainer}>
            <button 
                onClick={logout} 
                style={{ position: 'absolute', top: '10px', right: '10px', padding: '8px 15px', zIndex: 100 }}
            >
                Logout ({agent?.username})
            </button>
            <div style={adminStyles.sidebar}>
                <h2>Active Chats ({activeChats.length})</h2>
                {activeChats.map(chat => (
                    <div 
                        key={chat._id} 
                        onClick={() => handleSelectChat(chat)}
                        style={{...adminStyles.chatItem, backgroundColor: selectedChat?._id === chat._id ? '#e6f3ff' : 'white'}}
                    >
                        <p>Website: **{chat.websiteId}**</p>
                        <p>Status: **{chat.status.toUpperCase()}**</p>
                        <p>Latest: {chat.messages.slice(-1)[0]?.content.substring(0, 30) || 'New Chat'}</p>
                    </div>
                ))}
            </div>
            <div style={adminStyles.chatView}>
                {selectedChat ? (
                    <>
                        <h3 style={adminStyles.chatHeader}>Chat ID: {selectedChat._id.substring(0, 12)}...</h3>
                        <div style={adminStyles.messagesContainer}>
                            {selectedChat.messages.map((msg, index) => (
                                <div 
                                    key={index} 
                                    style={msg.sender === 'agent' ? adminStyles.agentMessage : adminStyles.customerMessage}
                                >
                                    <strong>{msg.sender}:</strong> {msg.content}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={sendMessage} style={adminStyles.inputForm}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your reply..."
                                style={adminStyles.inputField}
                            />
                            <button type="submit" style={adminStyles.sendButton}>Send</button>
                        </form>
                    </>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        Select a chat from the sidebar to begin responding.
                    </div>
                )}
            </div>
        </div>
    );
};

// Simple inline styles for Admin Dashboard
const adminStyles = {
    dashboardContainer: { display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', position: 'relative' },
    sidebar: { width: '300px', borderRight: '1px solid #ccc', padding: '15px', overflowY: 'auto', backgroundColor: '#f4f4f4' },
    chatItem: { padding: '10px', borderBottom: '1px solid #ddd', cursor: 'pointer', marginBottom: '5px', borderRadius: '5px' },
    chatView: { flex: 1, display: 'flex', flexDirection: 'column' },
    chatHeader: { padding: '15px', borderBottom: '1px solid #ccc', backgroundColor: '#fff' },
    messagesContainer: { flexGrow: 1, overflowY: 'auto', padding: '20px' },
    customerMessage: { textAlign: 'left', margin: '5px 0', padding: '8px', borderRadius: '10px', backgroundColor: '#ffe6e6', maxWidth: '60%', fontSize: '14px' },
    agentMessage: { textAlign: 'right', margin: '5px 0', padding: '8px', borderRadius: '10px', backgroundColor: '#e6f3ff', maxWidth: '60%', marginLeft: 'auto', fontSize: '14px' },
    inputForm: { display: 'flex', padding: '15px', borderTop: '1px solid #ccc', backgroundColor: '#fff' },
    inputField: { flexGrow: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '10px' },
    sendButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default AdminDashboard;