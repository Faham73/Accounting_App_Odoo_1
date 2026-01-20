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

interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isCustomer: boolean;
  isVendor: boolean;
}

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  incomeAccountCode: string;
}

interface CustomerInvoice {
  id: string;
  number: string | null;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: string;
  partner: {
    id: string;
    name: string;
  };
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    incomeAccount: {
      code: string;
      name: string;
    };
  }>;
  journalEntry: {
    id: string;
    number: string | null;
  } | null;
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

  // Section D: Partners
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);

  // Section E: Customer Invoices
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    partnerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    memo: '',
  });
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPrice: 0, incomeAccountCode: '' },
  ]);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceCreateError, setInvoiceCreateError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<CustomerInvoice | null>(null);
  const [postingInvoiceId, setPostingInvoiceId] = useState<string | null>(null);
  const [invoicePostError, setInvoicePostError] = useState<string | null>(null);

  // Fetch accounts and partners on mount
  useEffect(() => {
    fetchAccounts();
    fetchPartners();
    fetchInvoices();
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

  // Partners functions
  const fetchPartners = async () => {
    setPartnersLoading(true);
    setPartnersError(null);
    try {
      const response = await fetch('/api/partners');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch partners');
      }
      const data = await response.json();
      setPartners(data.data || []);
    } catch (err: any) {
      setPartnersError(err.message || 'Failed to fetch partners');
    } finally {
      setPartnersLoading(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerSubmitting(true);
    setPartnersError(null);

    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: partnerForm.name,
          email: partnerForm.email || undefined,
          phone: partnerForm.phone || undefined,
          isCustomer: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create partner');
      }

      // Reset form
      setPartnerForm({ name: '', email: '', phone: '' });
      // Refresh partners list
      await fetchPartners();
    } catch (err: any) {
      setPartnersError(err.message || 'Failed to create partner');
    } finally {
      setPartnerSubmitting(false);
    }
  };

  // Customer Invoices functions
  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const response = await fetch('/api/customer-invoices');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch invoices');
      }
      const data = await response.json();
      setInvoices(data.data || []);
    } catch (err: any) {
      setInvoicesError(err.message || 'Failed to fetch invoices');
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleAddInvoiceLine = () => {
    setInvoiceLines([
      ...invoiceLines,
      { description: '', quantity: 1, unitPrice: 0, incomeAccountCode: '' },
    ]);
  };

  const handleRemoveInvoiceLine = (index: number) => {
    if (invoiceLines.length > 1) {
      setInvoiceLines(invoiceLines.filter((_, i) => i !== index));
    }
  };

  const handleUpdateInvoiceLine = (
    index: number,
    field: keyof InvoiceLine,
    value: string | number
  ) => {
    const updated = [...invoiceLines];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceLines(updated);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceSubmitting(true);
    setInvoiceCreateError(null);
    setCreatedInvoice(null);

    try {
      const response = await fetch('/api/customer-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partnerId: invoiceForm.partnerId,
          invoiceDate: invoiceForm.invoiceDate,
          dueDate: invoiceForm.dueDate || undefined,
          memo: invoiceForm.memo || undefined,
          lines: invoiceLines,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      const data = await response.json();
      setCreatedInvoice(data.data);

      // Reset form
      setInvoiceForm({
        partnerId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        memo: '',
      });
      setInvoiceLines([
        { description: '', quantity: 1, unitPrice: 0, incomeAccountCode: '' },
      ]);
      // Refresh invoices list
      await fetchInvoices();
    } catch (err: any) {
      setInvoiceCreateError(err.message || 'Failed to create invoice');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handlePostInvoice = async (invoiceId: string) => {
    setPostingInvoiceId(invoiceId);
    setInvoicePostError(null);

    try {
      const response = await fetch(`/api/customer-invoices/${invoiceId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post invoice');
      }

      // Refresh invoices list
      await fetchInvoices();
    } catch (err: any) {
      setInvoicePostError(err.message || 'Failed to post invoice');
    } finally {
      setPostingInvoiceId(null);
    }
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

      {/* Section D: Partners */}
      <section>
        <h2>Partners (Customers/Vendors)</h2>
        {partnersError && <div className="error">{partnersError}</div>}

        <form onSubmit={handleCreatePartner}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={partnerForm.name}
              onChange={(e) =>
                setPartnerForm({ ...partnerForm, name: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Email (optional):</label>
            <input
              type="email"
              value={partnerForm.email}
              onChange={(e) =>
                setPartnerForm({ ...partnerForm, email: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Phone (optional):</label>
            <input
              type="text"
              value={partnerForm.phone}
              onChange={(e) =>
                setPartnerForm({ ...partnerForm, phone: e.target.value })
              }
            />
          </div>
          <button type="submit" disabled={partnerSubmitting}>
            {partnerSubmitting ? 'Creating...' : 'Create Customer'}
          </button>
        </form>

        <div>
          <button onClick={fetchPartners} disabled={partnersLoading}>
            {partnersLoading ? 'Loading...' : 'Refresh List'}
          </button>
        </div>

        {partners.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Customer</th>
                <th>Vendor</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td>{partner.name}</td>
                  <td>{partner.email || '-'}</td>
                  <td>{partner.phone || '-'}</td>
                  <td>{partner.isCustomer ? 'Yes' : 'No'}</td>
                  <td>{partner.isVendor ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Section E: Customer Invoices */}
      <section>
        <h2>Customer Invoices (AR)</h2>
        {invoicesError && <div className="error">{invoicesError}</div>}
        {invoiceCreateError && <div className="error">{invoiceCreateError}</div>}
        {invoicePostError && <div className="error">{invoicePostError}</div>}
        {createdInvoice && (
          <div className="success">
            <strong>Invoice Created!</strong>
            <br />
            ID: {createdInvoice.id}
            <br />
            Status: {createdInvoice.status}
            <br />
            Total: {parseFloat(createdInvoice.totalAmount).toFixed(2)}
          </div>
        )}

        <form onSubmit={handleCreateInvoice}>
          <div className="form-group">
            <label>Partner (Customer):</label>
            <select
              value={invoiceForm.partnerId}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, partnerId: e.target.value })
              }
              required
            >
              <option value="">Select a customer</option>
              {partners
                .filter((p) => p.isCustomer)
                .map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label>Invoice Date:</label>
            <input
              type="date"
              value={invoiceForm.invoiceDate}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Due Date (optional):</label>
            <input
              type="date"
              value={invoiceForm.dueDate}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Memo (optional):</label>
            <textarea
              value={invoiceForm.memo}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, memo: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="journal-lines">
            <h3>Invoice Lines:</h3>
            {invoiceLines.map((line, index) => (
              <div key={index} className="line-row">
                <div className="form-group">
                  <label>Description:</label>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) =>
                      handleUpdateInvoiceLine(index, 'description', e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={line.quantity}
                    onChange={(e) =>
                      handleUpdateInvoiceLine(
                        index,
                        'quantity',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Unit Price:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.unitPrice}
                    onChange={(e) =>
                      handleUpdateInvoiceLine(
                        index,
                        'unitPrice',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Income Account Code:</label>
                  <input
                    type="text"
                    value={line.incomeAccountCode}
                    onChange={(e) =>
                      handleUpdateInvoiceLine(
                        index,
                        'incomeAccountCode',
                        e.target.value
                      )
                    }
                    required
                  />
                </div>
                {invoiceLines.length > 1 && (
                  <button
                    type="button"
                    className="remove-line-btn"
                    onClick={() => handleRemoveInvoiceLine(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-line-btn"
              onClick={handleAddInvoiceLine}
            >
              Add Line
            </button>
          </div>

          <button type="submit" disabled={invoiceSubmitting}>
            {invoiceSubmitting ? 'Creating...' : 'Create Draft Invoice'}
          </button>
        </form>

        <div>
          <button onClick={fetchInvoices} disabled={invoicesLoading}>
            {invoicesLoading ? 'Loading...' : 'Refresh Invoice List'}
          </button>
        </div>

        {invoices.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th>Partner</th>
                <th>Status</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.number || 'DRAFT'}</td>
                  <td>{invoice.invoiceDate}</td>
                  <td>{invoice.partner.name}</td>
                  <td>{invoice.status}</td>
                  <td>{parseFloat(invoice.totalAmount).toFixed(2)}</td>
                  <td>
                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePostInvoice(invoice.id)}
                        disabled={postingInvoiceId === invoice.id}
                        style={{ fontSize: '12px', padding: '5px 10px' }}
                      >
                        {postingInvoiceId === invoice.id
                          ? 'Posting...'
                          : 'Post'}
                      </button>
                    )}
                    {invoice.status === 'POSTED' && invoice.journalEntry && (
                      <span style={{ fontSize: '12px', color: '#28a745' }}>
                        Posted (JE: {invoice.journalEntry.number || invoice.journalEntry.id.slice(0, 8)})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Accounting;
