// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const initializeSocket = require('./socket');

// --- IMPORT CRON JOB ---
const startStatusCleanup = require('./cron/statusCleanup'); 

require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const userSocketMap = {};
initializeSocket(io, userSocketMap);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  req.userSocketMap = userSocketMap;
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/status', require('./routes/status')); 

// --- START CRON JOBS ---
startStatusCleanup(); // Ye background me chalta rahega

// --- DB CONNECTION & SERVER START ---
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Mongo connected');
    server.listen(PORT, () => {
      console.log('Server running on', PORT);
      console.log('Socket.io ready. allowed client origin:', process.env.CLIENT_URL || 'http://localhost:3000');
    });
  })
  .catch(err => console.error(err));