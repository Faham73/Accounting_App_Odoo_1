import express from 'express';
import accountsRouter from './routes/accounts';
import journalEntriesRouter from './routes/journalEntries';
import partnersRouter from './routes/partners';
import customerInvoicesRouter from './routes/customerInvoices';

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
      },
      partners: {
        list: 'GET /api/partners',
        create: 'POST /api/partners'
      },
      customerInvoices: {
        list: 'GET /api/customer-invoices',
        create: 'POST /api/customer-invoices',
        get: 'GET /api/customer-invoices/:id',
        post: 'POST /api/customer-invoices/:id/post'
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', accountsRouter);
app.use('/api', journalEntriesRouter);
app.use('/api', partnersRouter);
app.use('/api', customerInvoicesRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
