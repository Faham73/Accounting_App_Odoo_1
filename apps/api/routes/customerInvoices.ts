import express from 'express';
import {
  createCustomerInvoice,
  listCustomerInvoices,
  getCustomerInvoice,
  postCustomerInvoice,
} from '../controllers/customerInvoicesController';

const router = express.Router();

router.get('/customer-invoices', listCustomerInvoices);
router.post('/customer-invoices', createCustomerInvoice);
router.get('/customer-invoices/:id', getCustomerInvoice);
router.post('/customer-invoices/:id/post', postCustomerInvoice);

export default router;
