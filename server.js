const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory store of checked items per week
// Structure: { [weekKey]: { [itemName]: { checked: boolean, checkedBy: string, checkedAt: number } } }
const checkedItems = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/api/socketio',
  });

  io.on('connection', (socket) => {
    let currentWeek = null;

    socket.on('join-week', (weekKey) => {
      if (currentWeek) socket.leave(currentWeek);
      currentWeek = weekKey;
      socket.join(weekKey);
      // Send current state to newly joined client
      socket.emit('full-state', checkedItems[weekKey] || {});
    });

    socket.on('check-item', ({ weekKey, itemName, checked, checkedBy }) => {
      if (!checkedItems[weekKey]) checkedItems[weekKey] = {};
      if (checked) {
        checkedItems[weekKey][itemName] = { checked: true, checkedBy, checkedAt: Date.now() };
      } else {
        delete checkedItems[weekKey][itemName];
      }
      // Broadcast to everyone in the room including sender
      io.to(weekKey).emit('item-updated', { itemName, checked, checkedBy });
    });

    socket.on('clear-all', ({ weekKey }) => {
      checkedItems[weekKey] = {};
      io.to(weekKey).emit('full-state', {});
    });

    socket.on('disconnect', () => {});
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? 'dev' : 'prod'})`);
  });
});
