import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AccountType } from '@prisma/client';

interface CreateAccountBody {
  companyId?: string;
  code: string;
  name: string;
  type: AccountType;
}

export const listAccounts = async (req: Request, res: Response) => {
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

    const accounts = await prisma.account.findMany({
      where: { companyId: finalCompanyId },
      orderBy: { code: 'asc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ data: accounts });
  } catch (error) {
    console.error('Error listing accounts:', error);
    res.status(500).json({
      error: 'Failed to list accounts',
    });
  }
};

export const createAccount = async (req: Request, res: Response) => {
  try {
    const body: CreateAccountBody = req.body;

    // Validation
    const errors: string[] = [];

    // code: required, trimmed, max 20
    if (!body.code || typeof body.code !== 'string') {
      errors.push('code is required');
    } else {
      const trimmedCode = body.code.trim();
      if (trimmedCode.length === 0) {
        errors.push('code cannot be empty');
      } else if (trimmedCode.length > 20) {
        errors.push('code must be at most 20 characters');
      }
      body.code = trimmedCode;
    }

    // name: required, max 120
    if (!body.name || typeof body.name !== 'string') {
      errors.push('name is required');
    } else if (body.name.length > 120) {
      errors.push('name must be at most 120 characters');
    }

    // type: must be enum
    const validTypes: AccountType[] = [
      AccountType.ASSET,
      AccountType.LIABILITY,
      AccountType.EQUITY,
      AccountType.INCOME,
      AccountType.EXPENSE,
    ];
    if (!body.type || !validTypes.includes(body.type)) {
      errors.push(
        `type must be one of: ${validTypes.join(', ')}`
      );
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

    // Create account (will throw if unique constraint violated)
    try {
      const account = await prisma.account.create({
        data: {
          companyId: finalCompanyId,
          code: body.code,
          name: body.name,
          type: body.type,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({ data: account });
    } catch (prismaError: any) {
      // Handle unique constraint violation
      if (
        prismaError.code === 'P2002' &&
        prismaError.meta?.target?.includes('companyId_code')
      ) {
        return res.status(409).json({
          error: `Account with code "${body.code}" already exists for this company`,
        });
      }
      throw prismaError;
    }
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      error: 'Failed to create account',
    });
  }
};
