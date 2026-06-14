const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

// ── Socket layer: a pure relay ──────────────────────────────────────────────
// The DATABASE is the single source of truth for all shopping-list state, both
// checked items and structural edits. Clients persist every change through the
// HTTP API and load the current state from it whenever they open a list. This
// server holds no state and never touches the database — it only forwards live
// updates to the OTHER clients in the same list room (via socket.to, which
// excludes the sender) so they stay in sync between reads. If a relayed message
// is ever missed, the next read from the DB makes the client correct again.

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/api/socketio',
  });

  io.on('connection', (socket) => {
    let currentList = null;

    socket.on('join-list', (listId) => {
      if (!listId) return;
      if (currentList) socket.leave(currentList);
      currentList = listId;
      socket.join(listId);
      const room = io.sockets.adapter.rooms.get(listId);
      io.to(listId).emit('shopper-count', room ? room.size : 1);
    });

    // A check/uncheck. The sender has already updated its own UI and persisted
    // to the DB; forward the delta to everyone else in the room.
    socket.on('check-item', (payload) => {
      if (!payload || !payload.listId || !payload.itemName) return;
      socket.to(payload.listId).emit('item-updated', payload);
    });

    // "Uncheck all" — forward to the rest of the room.
    socket.on('clear-all', (payload) => {
      const listId = payload && payload.listId;
      if (!listId) return;
      socket.to(listId).emit('cleared');
    });

    // A structural edit (add/delete/rename/recategorize/reorder/subtitle) was
    // persisted to the DB. Tell the others to re-pull the list.
    socket.on('list-changed', (payload) => {
      const listId = payload && payload.listId;
      if (!listId) return;
      socket.to(listId).emit('list-changed');
    });

    socket.on('disconnect', () => {
      if (currentList) {
        const room = io.sockets.adapter.rooms.get(currentList);
        io.to(currentList).emit('shopper-count', room ? room.size : 0);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? 'dev' : 'prod'})`);
  });
});
