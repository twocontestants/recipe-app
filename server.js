const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory checked state (source of truth for live sync)
// Seeded from DB on first join, written back on every change
const checkedItems = {};

// Lazy DB pool — same connection string as lib/db.ts
let _pool = null;
function getPool() {
  if (!_pool) {
    const connStr = process.env.POSTGRES_URL ||
      'postgresql://neondb_owner:npg_Da4LVXg8EdHB@ep-purple-glitter-a773calm.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    _pool = new Pool({ connectionString: connStr });
  }
  return _pool;
}

// Load checked state for a week from DB into memory
async function loadCheckedState(weekKey) {
  if (checkedItems[weekKey] !== undefined) return; // already loaded
  try {
    const result = await getPool().query(
      'SELECT checked_state FROM shopping_list_edits WHERE week_start = $1',
      [weekKey]
    );
    checkedItems[weekKey] = result.rows[0]?.checked_state ?? {};
  } catch {
    checkedItems[weekKey] = {};
  }
}

// Debounced DB write per week key
const saveTimers = {};
function scheduleCheckedSave(weekKey) {
  if (saveTimers[weekKey]) clearTimeout(saveTimers[weekKey]);
  saveTimers[weekKey] = setTimeout(async () => {
    try {
      await getPool().query(
        `INSERT INTO shopping_list_edits (week_start, checked_state)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (week_start) DO UPDATE SET
           checked_state = EXCLUDED.checked_state,
           updated_at    = NOW()`,
        [weekKey, JSON.stringify(checkedItems[weekKey] ?? {})]
      );
    } catch (e) {
      console.error('Failed to save checked state:', e.message);
    }
  }, 500);
}

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

    socket.on('join-week', async (weekKey) => {
      if (currentWeek) socket.leave(currentWeek);
      currentWeek = weekKey;
      socket.join(weekKey);
      await loadCheckedState(weekKey);
      socket.emit('full-state', checkedItems[weekKey] || {});
      // Broadcast updated shopper count
      const room = io.sockets.adapter.rooms.get(weekKey);
      io.to(weekKey).emit('shopper-count', room ? room.size : 1);
    });

    socket.on('check-item', ({ weekKey, itemName, checked, checkedBy }) => {
      if (!checkedItems[weekKey]) checkedItems[weekKey] = {};
      if (checked) {
        checkedItems[weekKey][itemName] = { checked: true, checkedBy, checkedAt: Date.now() };
      } else {
        delete checkedItems[weekKey][itemName];
      }
      io.to(weekKey).emit('item-updated', { itemName, checked, checkedBy });
      scheduleCheckedSave(weekKey);
    });

    socket.on('clear-all', ({ weekKey }) => {
      checkedItems[weekKey] = {};
      io.to(weekKey).emit('full-state', {});
      scheduleCheckedSave(weekKey);
    });

    socket.on('disconnect', () => {
      if (currentWeek) {
        const room = io.sockets.adapter.rooms.get(currentWeek);
        io.to(currentWeek).emit('shopper-count', room ? room.size : 0);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? 'dev' : 'prod'})`);
  });
});
