const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../client')));

const rooms = {};

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
  console.log(`[Network] Client connected: ${socket.id}`);

  socket.on('createRoom', (data) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = { id: roomCode, players: {}, created: Date.now() };

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.role = 'p1';

    rooms[roomCode].players[socket.id] = {
      id: socket.id,
      role: 'p1',
      username: data?.username || 'Player 1',
      x: -14, y: 1, z: -6, rotY: 0
    };

    socket.emit('roomCreated', { roomCode, role: 'p1', state: rooms[roomCode] });
  });

  socket.on('joinRoom', (data) => {
    const roomCode = data.roomCode;
    const room = rooms[roomCode];

    if (!room) return socket.emit('errorMsg', 'Room not found!');
    if (Object.keys(room.players).length >= 20) return socket.emit('errorMsg', 'Room is full!');

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.role = 'p2';

    room.players[socket.id] = {
      id: socket.id,
      role: 'p2',
      username: data?.username || 'Player 2',
      x: -14, y: 1, z: 6, rotY: 0
    };

    socket.emit('roomJoined', { roomCode, role: 'p2', state: room });
    socket.to(roomCode).emit('playerJoined', room.players[socket.id]);
  });

  socket.on('playerTransform', (transform) => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && rooms[roomCode].players[socket.id]) {
      const p = rooms[roomCode].players[socket.id];
      p.x = transform.x; p.y = transform.y; p.z = transform.z; p.rotY = transform.rotY;
      socket.to(roomCode).emit('playerMoved', { id: socket.id, x: p.x, y: p.y, z: p.z, rotY: p.rotY });
    }
  });

  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode]) {
      delete rooms[roomCode].players[socket.id];
      io.to(roomCode).emit('playerLeft', socket.id);
      if (Object.keys(rooms[roomCode].players).length === 0) delete rooms[roomCode];
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
