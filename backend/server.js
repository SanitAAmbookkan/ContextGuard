require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const Session = require('./models/Session');
const Analytics = require('./models/Analytics');
const { analyzeDistraction } = require('./ai');

const app = express();
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// --- MongoDB setup --- 
// Using a mock memory-based connection approach or a local connection string.
// Default to locale mongo instance.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/contextguard';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// --- API Endpoints ---
app.post('/start-session', async (req, res) => {
  try {
    const { userId, task } = req.body;
    // close previous active sessions
    await Session.updateMany({ userId, status: 'active' }, { status: 'completed', endTime: Date.now() });
    
    const session = new Session({ userId, task });
    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/end-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findById(sessionId);
    if (!session || session.status === 'completed') {
      return res.json({ success: true });
    }

    session.status = 'completed';
    session.endTime = Date.now();
    await session.save();

    // Update daily analytics
    const focusDurationSeconds = Math.round((session.endTime - session.startTime) / 1000);
    const date = new Date().toISOString().split('T')[0];
    
    await Analytics.findOneAndUpdate(
      { userId: session.userId, date },
      { 
        $inc: { totalFocusTimeSeconds: focusDurationSeconds },
        $set: { averageFocusScore: session.focusScore } // Simplified: just take the last score
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/log-distraction', async (req, res) => {
  try {
    const { userId, url, title } = req.body;
    const date = new Date().toISOString().split('T')[0];
    
    // Find active session
    const session = await Session.findOne({ userId, status: 'active' });
    if (session) {
      session.distractions.push({ url, title, timestamp: Date.now() });
      session.focusScore = Math.max(0, session.focusScore - 5); // Subtract from score
      await session.save();
    }

    // Update global analytics
    await Analytics.findOneAndUpdate(
      { userId, date },
      { 
        $inc: { totalDistractionAttempts: 1 },
        $addToSet: { blockedWebsites: { url, count: 1 } } // Note: addToSet doesn't handle count well, usually you'd iterate
      },
      { upsert: true }
    );
    
    // Better way to update blockedWebsites count
    const analytics = await Analytics.findOne({ userId, date });
    const siteIndex = analytics.blockedWebsites.findIndex(s => s.url === url);
    if (siteIndex > -1) {
      analytics.blockedWebsites[siteIndex].count += 1;
    } else {
      analytics.blockedWebsites.push({ url, count: 1 });
    }
    await analytics.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/session-status', async (req, res) => {
  try {
    const { userId } = req.query;
    const session = await Session.findOne({ userId, status: 'active' });
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/analyze-tab', async (req, res) => {
  try {
    const { task, tab_title } = req.body;
    const result = await analyzeDistraction(task, tab_title);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/focus-stats', async (req, res) => {
  try {
    const { userId } = req.query;
    const sessions = await Session.find({ userId });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/distraction-history', async (req, res) => {
  try {
    const { userId } = req.query;
    const sessions = await Session.find({ userId });
    const distractions = sessions.map(s => s.distractions).flat();
    res.json({ distractions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/daily-productivity', async (req, res) => {
  try {
    const { userId } = req.query;
    const date = new Date().toISOString().split('T')[0];
    const analytics = await Analytics.findOne({ userId, date });
    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mobile Sync endpoints
app.post('/generate-sync-qr', (req, res) => {
  // Generates a mock sync token and URL
  const { sessionId } = req.body;
  const syncToken = Math.random().toString(36).substring(2, 10);
  // Ideally store in redis or db, but keeping simple in memory for now
  res.json({ syncToken, url: `http://localhost:5173/sync?token=${syncToken}` });
});

app.post('/connect-device', (req, res) => {
  const { syncToken } = req.body;
  res.json({ success: true, message: "Connected to sync token" });
});

app.post('/sync-timer', (req, res) => {
  const { timeRemaining, activeTask, mode } = req.body;
  io.emit('sync-timer', { timeRemaining, activeTask, mode });
  res.json({ success: true });
});


// --- WebSockets ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Mobile device joins a sync room
  socket.on('join-sync', (syncToken) => {
    socket.join(syncToken);
    console.log(`Socket ${socket.id} joined sync room ${syncToken}`);
  });

  // Desktop extension sends timer updates
  socket.on('timer-update', (data) => {
    // data: { syncToken, timeRemaining, state }
    io.to(data.syncToken).emit('sync-timer', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
