import express from 'express';
import { createAccount, listAccounts } from '../controllers/accountsController';

const router = express.Router();

router.get('/accounts', listAccounts);
router.post('/accounts', createAccount);

export default router;
