import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma, InvoiceStatus, EntryStatus } from '@prisma/client';

interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  incomeAccountCode: string;
}

interface CreateCustomerInvoiceBody {
  companyId?: string;
  partnerId: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  memo?: string;
  lines: InvoiceLineInput[];
}

export const listCustomerInvoices = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;

    let finalCompanyId = companyId as string | undefined;

    // If no companyId provided, default to first/seeded company
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

    const invoices = await prisma.customerInvoice.findMany({
      where: { companyId: finalCompanyId },
      orderBy: { invoiceDate: 'desc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            incomeAccount: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({ data: invoices });
  } catch (error) {
    console.error('Error listing customer invoices:', error);
    res.status(500).json({
      error: 'Failed to list customer invoices',
    });
  }
};

export const getCustomerInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.customerInvoice.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            baseCurrency: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        lines: {
          include: {
            incomeAccount: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
        journalEntry: {
          select: {
            id: true,
            number: true,
            date: true,
            status: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        error: `Customer invoice with id ${id} not found`,
      });
    }

    res.json({ data: invoice });
  } catch (error) {
    console.error('Error getting customer invoice:', error);
    res.status(500).json({
      error: 'Failed to get customer invoice',
    });
  }
};

export const createCustomerInvoice = async (req: Request, res: Response) => {
  try {
    const body: CreateCustomerInvoiceBody = req.body;

    // Validation
    const errors: string[] = [];

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

    // partnerId: required
    if (!body.partnerId || typeof body.partnerId !== 'string' || body.partnerId.trim() === '') {
      errors.push('partnerId is required');
    }

    // invoiceDate: required, format YYYY-MM-DD
    let invoiceDate: Date | null = null;
    if (!body.invoiceDate || typeof body.invoiceDate !== 'string' || body.invoiceDate.trim() === '') {
      errors.push('invoiceDate is required (format: YYYY-MM-DD)');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.invoiceDate)) {
        errors.push('invoiceDate must be in YYYY-MM-DD format');
      } else {
        invoiceDate = new Date(body.invoiceDate + 'T00:00:00.000Z');
        if (isNaN(invoiceDate.getTime())) {
          errors.push('invoiceDate is not a valid date');
        }
      }
    }

    // dueDate: optional, format YYYY-MM-DD
    let dueDate: Date | null = null;
    if (body.dueDate !== undefined && body.dueDate !== null) {
      if (typeof body.dueDate !== 'string') {
        errors.push('dueDate must be a string in YYYY-MM-DD format');
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(body.dueDate)) {
          errors.push('dueDate must be in YYYY-MM-DD format');
        } else {
          dueDate = new Date(body.dueDate + 'T00:00:00.000Z');
          if (isNaN(dueDate.getTime())) {
            errors.push('dueDate is not a valid date');
          }
        }
      }
    }

    // memo: optional
    const memo = body.memo && typeof body.memo === 'string' ? body.memo.trim() : null;

    // lines: required, must have at least 1 line
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      errors.push('lines is required and must contain at least one line item');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    // Verify partner exists and belongs to company
    if (body.partnerId && body.partnerId.trim() !== '') {
      const partner = await prisma.partner.findFirst({
        where: {
          id: body.partnerId.trim(),
          companyId: finalCompanyId,
        },
      });

      if (!partner) {
        return res.status(404).json({
          error: `Partner with id ${body.partnerId} not found for this company`,
        });
      }
      body.partnerId = body.partnerId.trim();
    }

    // Validate and resolve lines
    const validatedLines: Array<{
      description: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      incomeAccountId: string;
    }> = [];

    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];
      const lineErrors: string[] = [];

      // description: required
      if (!line.description || typeof line.description !== 'string' || line.description.trim() === '') {
        lineErrors.push(`lines[${i}].description is required`);
      }

      // quantity: required, must be a positive number
      if (typeof line.quantity !== 'number' || isNaN(line.quantity)) {
        lineErrors.push(`lines[${i}].quantity must be a number`);
      } else if (line.quantity <= 0) {
        lineErrors.push(`lines[${i}].quantity must be greater than 0`);
      }

      // unitPrice: required, must be a number
      if (typeof line.unitPrice !== 'number' || isNaN(line.unitPrice)) {
        lineErrors.push(`lines[${i}].unitPrice must be a number`);
      } else if (line.unitPrice < 0) {
        lineErrors.push(`lines[${i}].unitPrice must be non-negative`);
      }

      // incomeAccountCode: required
      if (!line.incomeAccountCode || typeof line.incomeAccountCode !== 'string' || line.incomeAccountCode.trim() === '') {
        lineErrors.push(`lines[${i}].incomeAccountCode is required`);
      }

      if (lineErrors.length > 0) {
        return res.status(400).json({
          error: `Validation error for line ${i + 1}: ${lineErrors.join('; ')}`,
        });
      }

      // Resolve incomeAccountCode to Account (company-scoped)
      const account = await prisma.account.findUnique({
        where: {
          companyId_code: {
            companyId: finalCompanyId!,
            code: line.incomeAccountCode.trim(),
          },
        },
      });

      if (!account) {
        return res.status(404).json({
          error: `Account with code "${line.incomeAccountCode}" not found for this company (line ${i + 1})`,
        });
      }

      // Compute lineTotal
      const quantity = new Prisma.Decimal(line.quantity);
      const unitPrice = new Prisma.Decimal(line.unitPrice);
      const lineTotal = quantity.mul(unitPrice);

      validatedLines.push({
        description: line.description.trim(),
        quantity,
        unitPrice,
        lineTotal,
        incomeAccountId: account.id,
      });
    }

    // Compute totalAmount (sum of all lineTotals)
    const totalAmount = validatedLines.reduce(
      (sum, line) => sum.add(line.lineTotal),
      new Prisma.Decimal(0)
    );

    // Create invoice with lines in a transaction
    try {
      const invoice = await prisma.customerInvoice.create({
        data: {
          companyId: finalCompanyId!,
          partnerId: body.partnerId,
          invoiceDate: invoiceDate!,
          dueDate,
          memo,
          status: InvoiceStatus.DRAFT,
          number: null,
          currency: company.baseCurrency,
          totalAmount,
          lines: {
            create: validatedLines,
          },
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              baseCurrency: true,
            },
          },
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          lines: {
            include: {
              incomeAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
      });

      res.status(201).json({ data: invoice });
    } catch (prismaError: any) {
      console.error('Prisma error creating invoice:', prismaError);
      const errorMessage = prismaError.message || 'Failed to create customer invoice';
      const statusCode = prismaError.code === 'P2002' ? 409 : 500;
      res.status(statusCode).json({
        error: errorMessage,
      });
      return;
    }
  } catch (error: any) {
    console.error('Error creating customer invoice:', error);
    const errorMessage = error?.message || 'Failed to create customer invoice';
    res.status(500).json({
      error: errorMessage,
    });
  }
};

/**
 * Format invoice number: INV/YYYY/NNNN
 */
function formatInvoiceNumber(year: number, sequence: number): string {
  return `INV/${year}/${String(sequence).padStart(4, '0')}`;
}

/**
 * Find Accounts Receivable account for a company
 * Tries common codes first, then searches by account type and name
 */
async function findAccountsReceivableAccount(companyId: string) {
  // Try common AR account codes (in order of preference)
  const commonCodes = ['1200', '110000', '12000', '1100'];
  
  for (const code of commonCodes) {
    const account = await prisma.account.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });
    
    if (account && account.type === 'ASSET') {
      return account;
    }
  }
  
  // Fallback: search by account type and name
  const account = await prisma.account.findFirst({
    where: {
      companyId,
      type: 'ASSET',
      name: {
        contains: 'Receivable',
        mode: 'insensitive',
      },
    },
  });
  
  return account;
}

export const postCustomerInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch invoice with lines and related data
    const invoice = await prisma.customerInvoice.findUnique({
      where: { id },
      include: {
        company: true,
        partner: true,
        lines: {
          include: {
            incomeAccount: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        error: `Customer invoice with id ${id} not found`,
      });
    }

    // Validation: Invoice must be DRAFT
    if (invoice.status !== InvoiceStatus.DRAFT) {
      return res.status(400).json({
        error: `Invoice cannot be posted. Current status: ${invoice.status}. Only DRAFT invoices can be posted.`,
      });
    }

    // Validation: Must have lines
    if (!invoice.lines || invoice.lines.length === 0) {
      return res.status(400).json({
        error: 'Invoice must have at least one line item to be posted',
      });
    }

    // Validation: totalAmount > 0
    if (invoice.totalAmount.lte(0)) {
      return res.status(400).json({
        error: 'Invoice total amount must be greater than 0',
      });
    }

    // Find SAL journal
    const salesJournal = await prisma.journal.findUnique({
      where: {
        companyId_code: {
          companyId: invoice.companyId,
          code: 'SAL',
        },
      },
    });

    if (!salesJournal) {
      return res.status(404).json({
        error: 'Sales Journal (code: SAL) not found. Please ensure the Sales Journal is set up for this company.',
      });
    }

    // Find Accounts Receivable account
    const arAccount = await findAccountsReceivableAccount(invoice.companyId);
    
    if (!arAccount) {
      return res.status(404).json({
        error: 'Accounts Receivable account not found. Please ensure an Accounts Receivable (ASSET) account is set up for this company.',
      });
    }

    // Use transaction to post invoice and create journal entry
    const result = await prisma.$transaction(async (tx) => {
      // Lock company row to safely increment invoiceNextNumber
      const company = await tx.company.findUniqueOrThrow({
        where: { id: invoice.companyId },
      });

      // Get current year from invoice date
      const year = invoice.invoiceDate.getFullYear();

      // Format invoice number
      const invoiceNumber = formatInvoiceNumber(year, company.invoiceNextNumber);

      // Validate journal entry will be balanced before creating
      const totalDebit = invoice.totalAmount;
      const totalCredit = invoice.lines.reduce(
        (sum, line) => sum.add(line.lineTotal),
        new Prisma.Decimal(0)
      );

      if (!totalDebit.equals(totalCredit)) {
        throw new Error(
          `Journal entry is unbalanced. Debit: ${totalDebit.toString()}, Credit: ${totalCredit.toString()}`
        );
      }

      // Create journal entry
      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId: invoice.companyId,
          journalId: salesJournal.id,
          date: invoice.invoiceDate,
          number: null, // Will be assigned when journal entry is posted
          status: EntryStatus.POSTED,
          memo: invoice.memo || `Invoice ${invoiceNumber}`,
          postedAt: new Date(),
          journalLines: {
            create: [
              // DR Accounts Receivable
              {
                accountId: arAccount.id,
                partnerId: invoice.partnerId,
                label: `Invoice ${invoiceNumber}`,
                debit: invoice.totalAmount,
                credit: new Prisma.Decimal(0),
              },
              // CR each revenue line
              ...invoice.lines.map((line) => ({
                accountId: line.incomeAccountId,
                partnerId: invoice.partnerId,
                label: line.description,
                debit: new Prisma.Decimal(0),
                credit: line.lineTotal,
              })),
            ],
          },
        },
      });

      // Update invoice: set status, number, postedAt, journalEntryId
      // And increment company invoiceNextNumber
      const [updatedInvoice] = await Promise.all([
        tx.customerInvoice.update({
          where: { id },
          data: {
            status: InvoiceStatus.POSTED,
            number: invoiceNumber,
            postedAt: new Date(),
            journalEntryId: journalEntry.id,
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                baseCurrency: true,
              },
            },
            partner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            lines: {
              include: {
                incomeAccount: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                id: 'asc',
              },
            },
            journalEntry: {
              select: {
                id: true,
                number: true,
                date: true,
                status: true,
              },
            },
          },
        }),
        tx.company.update({
          where: { id: invoice.companyId },
          data: {
            invoiceNextNumber: {
              increment: 1,
            },
          },
        }),
      ]);

      return {
        invoice: updatedInvoice,
        journalEntry: {
          id: journalEntry.id,
          number: journalEntry.number,
        },
      };
    });

    res.json({
      data: result.invoice,
      journalEntry: result.journalEntry,
    });
  } catch (error: any) {
    console.error('Error posting customer invoice:', error);
    
    // Handle specific error cases
    if (error.message && error.message.includes('unbalanced')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to post customer invoice',
    });
  }
};
