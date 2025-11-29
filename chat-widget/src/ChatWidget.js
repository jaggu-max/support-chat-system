// ChatWidget.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import uuid from 'react-uuid'; 

const SOCKET_SERVER_URL = 'http://localhost:5000';

const ChatWidget = ({ websiteId = "demo_site_123" }) => {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);
    
    // Persist customerId using localStorage
    const customerId = useRef(localStorage.getItem('chat_customer_id') || uuid());

    useEffect(() => {
        localStorage.setItem('chat_customer_id', customerId.current);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const newSocket = io(SOCKET_SERVER_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('initChat', { websiteId, customerId: customerId.current });
        });

        newSocket.on('chatInitialized', ({ conversationId, messages: initialMessages }) => {
            setConversationId(conversationId);
            setMessages(initialMessages);
        });

        newSocket.on('newMessage', (message) => {
            // Only update messages if it belongs to the current conversation
            if (message.conversationId === conversationId) {
                setMessages(prevMessages => [...prevMessages, message]);
            }
        });

        return () => newSocket.disconnect();
    }, [isOpen, websiteId, conversationId]); // Reconnect only if isOpen or websiteId changes

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && socket && conversationId) {
            const tempMessage = { sender: 'customer', content: input, timestamp: new Date(), conversationId };
            
            setMessages(prevMessages => [...prevMessages, tempMessage]);

            socket.emit('customerMessage', {
                conversationId,
                messageContent: input
            });
            setInput('');
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} style={{...styles.openButton, backgroundColor: '#007bff'}}>
                💬 Live Chat
            </button>
        );
    }

    return (
        <div style={styles.chatWindow}>
            <div style={styles.header}>Live Support <button onClick={() => setIsOpen(false)} style={styles.closeButton}>X</button></div>
            <div style={styles.messagesContainer}>
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        style={msg.sender === 'customer' ? styles.customerMessage : styles.agentMessage}
                    >
                        {msg.sender !== 'system' && <strong>{msg.sender}: </strong>} {msg.content}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} style={styles.inputForm}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    style={styles.inputField}
                />
                <button type="submit" style={styles.sendButton}>Send</button>
            </form>
        </div>
    );
};

// Simplified styles (place in a separate CSS file for a real project)
const styles = {
    openButton: { position: 'fixed', bottom: '20px', right: '20px', padding: '15px 25px', borderRadius: '50px', border: 'none', color: 'white', cursor: 'pointer', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' },
    chatWindow: { position: 'fixed', bottom: '20px', right: '20px', width: '300px', height: '400px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' },
    header: { backgroundColor: '#007bff', color: 'white', padding: '10px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    closeButton: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' },
    messagesContainer: { flexGrow: 1, overflowY: 'auto', padding: '10px' },
    customerMessage: { textAlign: 'right', margin: '5px 0', padding: '8px', borderRadius: '10px', backgroundColor: '#e6f3ff', maxWidth: '80%', marginLeft: 'auto', fontSize: '14px' },
    agentMessage: { textAlign: 'left', margin: '5px 0', padding: '8px', borderRadius: '10px', backgroundColor: '#f1f1f1', maxWidth: '80%', marginRight: 'auto', fontSize: '14px' },
    inputForm: { display: 'flex', padding: '10px', borderTop: '1px solid #ccc' },
    inputField: { flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '5px' },
    sendButton: { padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

export default ChatWidget;