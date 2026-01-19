import express from 'express';
import {
  createJournalEntry,
  getJournalEntry,
  postJournalEntry,
} from '../controllers/journalEntriesController';

const router = express.Router();

router.post('/journal-entries', createJournalEntry);
router.get('/journal-entries/:id', getJournalEntry);
router.post('/journal-entries/:id/post', postJournalEntry);

export default router;
