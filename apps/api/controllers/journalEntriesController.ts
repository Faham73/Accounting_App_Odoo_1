import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { EntryStatus, Prisma } from '@prisma/client';

interface JournalLineInput {
  accountCode: string;
  label?: string;
  debit: number;
  credit: number;
}

interface CreateJournalEntryBody {
  companyId?: string;
  journalCode: string;
  date: string;
  memo?: string;
  lines: JournalLineInput[];
}

export const createJournalEntry = async (req: Request, res: Response) => {
  try {
    const body: CreateJournalEntryBody = req.body;

    // Validation
    const errors: string[] = [];

    // journalCode: required
    if (!body.journalCode || typeof body.journalCode !== 'string') {
      errors.push('journalCode is required');
    }

    // date: required, format YYYY-MM-DD
    if (!body.date || typeof body.date !== 'string') {
      errors.push('date is required');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.date)) {
        errors.push('date must be in YYYY-MM-DD format');
      } else {
        const parsedDate = new Date(body.date);
        if (isNaN(parsedDate.getTime())) {
          errors.push('date is invalid');
        }
      }
    }

    // lines: required, array, at least 2
    if (!Array.isArray(body.lines)) {
      errors.push('lines is required and must be an array');
    } else {
      if (body.lines.length < 2) {
        errors.push('lines must contain at least 2 entries');
      }

      // Validate each line
      body.lines.forEach((line, index) => {
        if (!line.accountCode || typeof line.accountCode !== 'string') {
          errors.push(`lines[${index}].accountCode is required`);
        }

        if (line.debit === undefined || typeof line.debit !== 'number') {
          errors.push(`lines[${index}].debit is required and must be a number`);
        } else if (line.debit < 0) {
          errors.push(`lines[${index}].debit must be >= 0`);
        }

        if (line.credit === undefined || typeof line.credit !== 'number') {
          errors.push(`lines[${index}].credit is required and must be a number`);
        } else if (line.credit < 0) {
          errors.push(`lines[${index}].credit must be >= 0`);
        }

        if (line.debit > 0 && line.credit > 0) {
          errors.push(`lines[${index}] cannot have both debit and credit > 0`);
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    // Determine companyId
    let finalCompanyId = body.companyId;

    if (!finalCompanyId) {
      const firstCompany = await prisma.company.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (!firstCompany) {
        return res.status(404).json({
          error: 'No company found. Please seed the database first.',
        });
      }
      finalCompanyId = firstCompany.id;
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: finalCompanyId },
    });

    if (!company) {
      return res.status(404).json({
        error: `Company with id ${finalCompanyId} not found`,
      });
    }

    // Resolve journal by (companyId, journalCode)
    const journal = await prisma.journal.findUnique({
      where: {
        companyId_code: {
          companyId: finalCompanyId,
          code: body.journalCode,
        },
      },
    });

    if (!journal) {
      return res.status(404).json({
        error: `Journal with code "${body.journalCode}" not found for company`,
      });
    }

    // Resolve all accounts by (companyId, accountCode)
    const accountCodes = body.lines.map((line) => line.accountCode);
    const accounts = await prisma.account.findMany({
      where: {
        companyId: finalCompanyId,
        code: { in: accountCodes },
      },
    });

    // Check if all accounts exist
    const foundAccountCodes = new Set(accounts.map((a) => a.code));
    const missingCodes = accountCodes.filter((code) => !foundAccountCodes.has(code));

    if (missingCodes.length > 0) {
      return res.status(404).json({
        error: `Account(s) not found: ${missingCodes.join(', ')}`,
      });
    }

    // Create a map for quick account lookup
    const accountMap = new Map(accounts.map((a) => [a.code, a]));

    // Create journal entry with lines in a transaction
    const parsedDate = new Date(body.date);
    parsedDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const journalEntry = await prisma.journalEntry.create({
      data: {
        companyId: finalCompanyId,
        journalId: journal.id,
        date: parsedDate,
        number: null, // DRAFT entries have no number
        status: EntryStatus.DRAFT,
        memo: body.memo || null,
        journalLines: {
          create: body.lines.map((line) => ({
            accountId: accountMap.get(line.accountCode)!.id,
            label: line.label || null,
            debit: line.debit,
            credit: line.credit,
          })),
        },
      },
      include: {
        journal: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        journalLines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ data: journalEntry });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({
      error: 'Failed to create journal entry',
    });
  }
};

export const getJournalEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }

    const journalEntry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journal: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        journalLines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!journalEntry) {
      return res.status(404).json({
        error: `Journal entry with id ${id} not found`,
      });
    }

    res.json({ data: journalEntry });
  } catch (error) {
    console.error('Error getting journal entry:', error);
    res.status(500).json({
      error: 'Failed to get journal entry',
    });
  }
};

/**
 * Helper function to format journal entry number
 * Format: "<JOURNAL_CODE>/<YEAR>/<0001>"
 * Example: "GEN/2026/0001"
 */
function formatJournalEntryNumber(
  journalCode: string,
  year: number,
  sequence: number
): string {
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `${journalCode}/${year}/${paddedSequence}`;
}

export const postJournalEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'id parameter is required' });
    }

    // Fetch entry with journal and lines
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journal: {
          select: {
            id: true,
            code: true,
            nextNumber: true,
          },
        },
        journalLines: true,
      },
    });

    if (!entry) {
      return res.status(404).json({
        error: `Journal entry with id ${id} not found`,
      });
    }

    // Validate entry is DRAFT
    if (entry.status !== EntryStatus.DRAFT) {
      return res.status(409).json({
        error: `Journal entry is already posted (status: ${entry.status})`,
      });
    }

    // Validate entry has at least 2 lines
    if (!entry.journalLines || entry.journalLines.length < 2) {
      return res.status(400).json({
        error: 'Journal entry must have at least 2 lines',
      });
    }

    // Calculate totals using Decimal-safe logic
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const line of entry.journalLines) {
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    }

    // Validate balance (Debit == Credit)
    if (!totalDebit.equals(totalCredit)) {
      return res.status(400).json({
        error: `Journal entry is unbalanced. Debit total: ${totalDebit.toString()}, Credit total: ${totalCredit.toString()}`,
      });
    }

    // Get year from entry.date
    const year = entry.date.getFullYear();

    // Use transaction to safely assign number and increment sequence
    const updatedEntry = await prisma.$transaction(async (tx) => {
      // Lock the journal row by fetching it again in the transaction
      const journal = await tx.journal.findUniqueOrThrow({
        where: { id: entry.journalId },
        select: {
          id: true,
          code: true,
          nextNumber: true,
        },
      });

      // Format the entry number
      const entryNumber = formatJournalEntryNumber(
        journal.code,
        year,
        journal.nextNumber
      );

      // Update entry and increment journal nextNumber in the same transaction
      const [postedEntry] = await Promise.all([
        tx.journalEntry.update({
          where: { id },
          data: {
            number: entryNumber,
            status: EntryStatus.POSTED,
            postedAt: new Date(),
          },
          include: {
            journal: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            journalLines: {
              include: {
                account: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        }),
        tx.journal.update({
          where: { id: journal.id },
          data: {
            nextNumber: {
              increment: 1,
            },
          },
        }),
      ]);

      return postedEntry;
    });

    res.json({ data: updatedEntry });
  } catch (error: any) {
    // Handle unique constraint violation for entry.number
    if (
      error.code === 'P2002' &&
      error.meta?.target?.includes('companyId_number')
    ) {
      // This shouldn't happen in practice with proper locking, but handle it gracefully
      console.error('Duplicate entry number detected:', error);
      return res.status(500).json({
        error: 'Failed to post journal entry: duplicate entry number detected',
      });
    }

    console.error('Error posting journal entry:', error);
    res.status(500).json({
      error: 'Failed to post journal entry',
    });
  }
};
