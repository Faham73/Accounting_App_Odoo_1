import { useState, useEffect } from 'react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface JournalLine {
  accountCode: string;
  label: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  number: string | null;
  status: string;
  journalLines: Array<{
    debit: string;
    credit: string;
  }>;
}

function Accounting() {
  // Section A: Accounts
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    type: 'ASSET',
  });
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  // Section B: Create Draft Journal Entry
  const [journalForm, setJournalForm] = useState({
    journalCode: 'GEN',
    date: new Date().toISOString().split('T')[0],
    memo: '',
  });
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { accountCode: '', label: '', debit: 0, credit: 0 },
    { accountCode: '', label: '', debit: 0, credit: 0 },
  ]);
  const [journalSubmitting, setJournalSubmitting] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [createdEntry, setCreatedEntry] = useState<JournalEntry | null>(null);

  // Section C: Post Entry
  const [entryId, setEntryId] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postedEntry, setPostedEntry] = useState<JournalEntry | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data.data || []);
    } catch (err: any) {
      setAccountsError(err.message || 'Failed to fetch accounts');
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountSubmitting(true);
    setAccountsError(null);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create account');
      }

      // Reset form
      setAccountForm({ code: '', name: '', type: 'ASSET' });
      // Refresh accounts list
      await fetchAccounts();
    } catch (err: any) {
      setAccountsError(err.message || 'Failed to create account');
    } finally {
      setAccountSubmitting(false);
    }
  };

  const handleAddJournalLine = () => {
    setJournalLines([
      ...journalLines,
      { accountCode: '', label: '', debit: 0, credit: 0 },
    ]);
  };

  const handleRemoveJournalLine = (index: number) => {
    if (journalLines.length > 2) {
      setJournalLines(journalLines.filter((_, i) => i !== index));
    }
  };

  const handleUpdateJournalLine = (
    index: number,
    field: keyof JournalLine,
    value: string | number
  ) => {
    const updated = [...journalLines];
    updated[index] = { ...updated[index], [field]: value };
    setJournalLines(updated);
  };

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setJournalSubmitting(true);
    setJournalError(null);
    setCreatedEntry(null);

    try {
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journalCode: journalForm.journalCode,
          date: journalForm.date,
          memo: journalForm.memo || undefined,
          lines: journalLines,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create journal entry');
      }

      const data = await response.json();
      setCreatedEntry(data.data);

      // Reset form
      setJournalForm({
        journalCode: 'GEN',
        date: new Date().toISOString().split('T')[0],
        memo: '',
      });
      setJournalLines([
        { accountCode: '', label: '', debit: 0, credit: 0 },
        { accountCode: '', label: '', debit: 0, credit: 0 },
      ]);
    } catch (err: any) {
      setJournalError(err.message || 'Failed to create journal entry');
    } finally {
      setJournalSubmitting(false);
    }
  };

  const handlePostEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryId.trim()) {
      setPostError('Entry ID is required');
      return;
    }

    setPosting(true);
    setPostError(null);
    setPostedEntry(null);

    try {
      const response = await fetch(`/api/journal-entries/${entryId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post entry');
      }

      const data = await response.json();
      setPostedEntry(data.data);
      setEntryId(''); // Clear input on success
    } catch (err: any) {
      setPostError(err.message || 'Failed to post entry');
    } finally {
      setPosting(false);
    }
  };

  // Calculate totals for created entry
  const getEntryTotals = (entry: JournalEntry) => {
    const totalDebit = entry.journalLines.reduce(
      (sum, line) => sum + parseFloat(line.debit),
      0
    );
    const totalCredit = entry.journalLines.reduce(
      (sum, line) => sum + parseFloat(line.credit),
      0
    );
    return { totalDebit, totalCredit };
  };

  return (
    <div>
      <h1>Accounting</h1>

      {/* Section A: Accounts */}
      <section>
        <h2>Accounts</h2>
        {accountsError && <div className="error">{accountsError}</div>}

        <form onSubmit={handleCreateAccount}>
          <div className="form-group">
            <label>Code:</label>
            <input
              type="text"
              value={accountForm.code}
              onChange={(e) =>
                setAccountForm({ ...accountForm, code: e.target.value })
              }
              required
              maxLength={20}
            />
          </div>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={accountForm.name}
              onChange={(e) =>
                setAccountForm({ ...accountForm, name: e.target.value })
              }
              required
              maxLength={120}
            />
          </div>
          <div className="form-group">
            <label>Type:</label>
            <select
              value={accountForm.type}
              onChange={(e) =>
                setAccountForm({ ...accountForm, type: e.target.value })
              }
              required
            >
              <option value="ASSET">ASSET</option>
              <option value="LIABILITY">LIABILITY</option>
              <option value="EQUITY">EQUITY</option>
              <option value="INCOME">INCOME</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
          </div>
          <button type="submit" disabled={accountSubmitting}>
            {accountSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <div>
          <button onClick={fetchAccounts} disabled={accountsLoading}>
            {accountsLoading ? 'Loading...' : 'Refresh List'}
          </button>
        </div>

        {accounts.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.code}</td>
                  <td>{account.name}</td>
                  <td>{account.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Section B: Create Draft Journal Entry */}
      <section>
        <h2>Create Draft Journal Entry</h2>
        {journalError && <div className="error">{journalError}</div>}
        {createdEntry && (
          <div className="success">
            <strong>Entry Created!</strong>
            <br />
            ID: {createdEntry.id}
            <br />
            Number: {createdEntry.number || 'DRAFT (no number yet)'}
            <br />
            Status: {createdEntry.status}
            <br />
            Total Debit: {getEntryTotals(createdEntry).totalDebit.toFixed(2)}
            <br />
            Total Credit: {getEntryTotals(createdEntry).totalCredit.toFixed(2)}
          </div>
        )}

        <form onSubmit={handleCreateJournalEntry}>
          <div className="form-group">
            <label>Journal:</label>
            <select
              value={journalForm.journalCode}
              onChange={(e) =>
                setJournalForm({ ...journalForm, journalCode: e.target.value })
              }
              required
            >
              <option value="GEN">GEN - General</option>
              <option value="SAL">SAL - Sales</option>
              <option value="PUR">PUR - Purchase</option>
              <option value="BNK">BNK - Bank</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date:</label>
            <input
              type="date"
              value={journalForm.date}
              onChange={(e) =>
                setJournalForm({ ...journalForm, date: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Memo:</label>
            <textarea
              value={journalForm.memo}
              onChange={(e) =>
                setJournalForm({ ...journalForm, memo: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="journal-lines">
            <h3>Lines:</h3>
            {journalLines.map((line, index) => (
              <div key={index} className="line-row">
                <div className="form-group">
                  <label>Account Code:</label>
                  <input
                    type="text"
                    value={line.accountCode}
                    onChange={(e) =>
                      handleUpdateJournalLine(index, 'accountCode', e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Label:</label>
                  <input
                    type="text"
                    value={line.label}
                    onChange={(e) =>
                      handleUpdateJournalLine(index, 'label', e.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Debit:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.debit}
                    onChange={(e) =>
                      handleUpdateJournalLine(
                        index,
                        'debit',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Credit:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.credit}
                    onChange={(e) =>
                      handleUpdateJournalLine(
                        index,
                        'credit',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    required
                  />
                </div>
                {journalLines.length > 2 && (
                  <button
                    type="button"
                    className="remove-line-btn"
                    onClick={() => handleRemoveJournalLine(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-line-btn"
              onClick={handleAddJournalLine}
            >
              Add Line
            </button>
          </div>

          <button type="submit" disabled={journalSubmitting}>
            {journalSubmitting ? 'Creating...' : 'Create Entry'}
          </button>
        </form>
      </section>

      {/* Section C: Post Entry */}
      <section>
        <h2>Post Entry</h2>
        {postError && <div className="error">{postError}</div>}
        {postedEntry && (
          <div className="success">
            <strong>Entry Posted Successfully!</strong>
            <br />
            ID: {postedEntry.id}
            <br />
            Number: {postedEntry.number}
            <br />
            Status: {postedEntry.status}
          </div>
        )}

        <form onSubmit={handlePostEntry}>
          <div className="form-group">
            <label>Entry ID:</label>
            <input
              type="text"
              value={entryId}
              onChange={(e) => setEntryId(e.target.value)}
              placeholder="Enter journal entry ID"
              required
            />
          </div>
          <button type="submit" disabled={posting}>
            {posting ? 'Posting...' : 'Post Entry'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Accounting;
