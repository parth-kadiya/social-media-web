// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const initializeSocket = require('./socket');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// User ID aur Socket ID ko store karne ke liye
const userSocketMap = {}; 

initializeSocket(io, userSocketMap); 

app.use(cors());
app.use(express.json());

// Middleware: Har request mein 'io' aur 'userSocketMap' ko attach karein
app.use((req, res, next) => {
  req.io = io;
  req.userSocketMap = userSocketMap;
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/chats', require('./routes/chats'));

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