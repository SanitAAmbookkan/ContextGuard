const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  totalFocusTimeSeconds: { type: Number, default: 0 },
  totalDistractionAttempts: { type: Number, default: 0 },
  blockedWebsites: [{
    url: String,
    count: Number
  }],
  averageFocusScore: { type: Number, default: 100 }
});

module.exports = mongoose.model('Analytics', analyticsSchema);
