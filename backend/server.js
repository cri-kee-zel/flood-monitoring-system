const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create sensor data schema
const sensorDataSchema = new mongoose.Schema({
  waterLevel: Number,
  waterFlow: Number,
  timestamp: { type: Date, default: Date.now }
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Routes
app.get('/api/sensor-data/latest', async (req, res) => {
  try {
    const latestData = await SensorData.findOne().sort({ timestamp: -1 });
    res.json(latestData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/sensor-data/history', async (req, res) => {
  try {
    const history = await SensorData.find().sort({ timestamp: -1 }).limit(100);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/sensor-data', async (req, res) => {
  try {
    const { waterLevel, waterFlow } = req.body;
    const newData = new SensorData({ waterLevel, waterFlow });
    await newData.save();
    
    // Emit to all connected clients
    io.emit('sensor-update', { waterLevel, waterFlow, timestamp: new Date() });
    
    res.status(201).json(newData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Admin routes
app.post('/api/send-sms', async (req, res) => {
  try {
    const { phoneNumber, message, password } = req.body;
    
    // Very simple authentication
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    // In a real app, you would integrate with SMS API here
    console.log(`Sending SMS to ${phoneNumber}: ${message}`);
    
    // For now, just return success
    res.json({ success: true, message: 'SMS command sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));