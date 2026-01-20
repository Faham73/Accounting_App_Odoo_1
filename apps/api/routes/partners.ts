import express from 'express';
import { createPartner, listPartners } from '../controllers/partnersController';

const router = express.Router();

router.get('/partners', listPartners);
router.post('/partners', createPartner);

export default router;
