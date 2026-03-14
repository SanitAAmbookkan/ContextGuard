const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  task: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  focusScore: { type: Number, default: 100 },
  distractions: [{
    url: String,
    title: String,
    timestamp: Date,
  }]
});

module.exports = mongoose.model('Session', sessionSchema);
