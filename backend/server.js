// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Agent = require('./models/Agent'); 
const Conversation = require('./models/Conversation'); 

const app = express();
const server = http.createServer(app);
const AGENT_ROOM = 'admin_room'; 

// --- DB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Middleware ---
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

// --- JWT Helper ---
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// --- API Routes (Auth) ---

// Register Agent (Use this once to create your first agent)
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    const existingAgent = await Agent.findOne({ username });
    if (existingAgent) return res.status(400).json({ message: 'Agent exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const agent = await Agent.create({ username, password: hashedPassword });
        
    res.status(201).json({ token: generateToken(agent._id) });
});

// Login Agent
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const agent = await Agent.findOne({ username });

    if (agent && (await bcrypt.compare(password, agent.password))) {
        res.json({ _id: agent._id, username: agent.username, token: generateToken(agent._id) });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// --- Socket.io Setup ---
const io = socketIo(server, { cors: { origin: ['http://localhost:3000', 'http://localhost:3001'] } });

io.on('connection', (socket) => {
    // 1. CUSTOMER INIT CHAT
    socket.on('initChat', async ({ websiteId, customerId }) => {
        let conversation = await Conversation.findOne({ customerId, status: { $in: ['pending', 'active'] } });

        if (!conversation) {
            conversation = new Conversation({ websiteId, customerId });
            await conversation.save();
            io.to(AGENT_ROOM).emit('newChatRequest', conversation);
        }

        const conversationId = conversation._id.toString();
        socket.join(conversationId);
        socket.emit('chatInitialized', { conversationId, messages: conversation.messages });
    });

    // 2. CUSTOMER SENDS MESSAGE
    socket.on('customerMessage', async ({ conversationId, messageContent }) => {
        const message = { sender: 'customer', content: messageContent };
        try {
            await Conversation.findByIdAndUpdate(conversationId, { $push: { messages: message } });
            io.to(conversationId).emit('newMessage', {...message, conversationId });
        } catch (error) { console.error('Error saving customer message:', error); }
    });
    
    // 3. AGENT CONNECTS
    socket.on('agentConnect', async (agentToken) => {
        try {
            // Basic Token verification (for simple scaffold)
            const decoded = jwt.verify(agentToken, process.env.JWT_SECRET);
            
            socket.join(AGENT_ROOM);
            const activeConversations = await Conversation.find({ status: { $in: ['pending', 'active'] } }).sort({ createdAt: -1 });
            socket.emit('activeConversations', activeConversations);
        } catch (error) {
            console.error('Agent auth failed:', error);
            socket.emit('authError', 'Invalid token');
        }
    });
    
    // 4. AGENT JOINS A CHAT ROOM 
    socket.on('agentJoinChat', ({ conversationId }) => {
        socket.join(conversationId);
    });

    // 5. AGENT SENDS MESSAGE
    socket.on('agentMessage', async ({ conversationId, messageContent, agentId }) => {
        const message = { sender: 'agent', content: messageContent };
        try {
            await Conversation.findByIdAndUpdate(
                conversationId,
                { $push: { messages: message }, status: 'active', agentId: agentId } // Assign agent and set active
            );
            io.to(conversationId).emit('newMessage', {...message, conversationId });
        } catch (error) { console.error('Error saving agent message:', error); }
    });
});

server.listen(process.env.PORT, () => console.log(`Server running on http://localhost:${process.env.PORT}`));