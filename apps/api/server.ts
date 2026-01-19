import express from 'express';
import accountsRouter from './routes/accounts';
import journalEntriesRouter from './routes/journalEntries';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Suppress Chrome DevTools CSP warning (optional - this warning is harmless)
app.use('/.well-known', (req, res) => {
  res.status(204).end();
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Accounting API',
    endpoints: {
      health: '/health',
      accounts: {
        list: 'GET /api/accounts',
        create: 'POST /api/accounts'
      },
      journalEntries: {
        create: 'POST /api/journal-entries',
        get: 'GET /api/journal-entries/:id'
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', accountsRouter);
app.use('/api', journalEntriesRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
