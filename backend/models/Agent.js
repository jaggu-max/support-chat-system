const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
});

module.exports = mongoose.model('Agent', AgentSchema);