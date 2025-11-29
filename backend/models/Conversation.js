const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['customer', 'agent', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
    websiteId: { type: String, required: true },
    customerId: { type: String, required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null }, 
    status: { type: String, enum: ['pending', 'active', 'closed'], default: 'pending' },
    messages: [messageSchema],
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Conversation', conversationSchema);