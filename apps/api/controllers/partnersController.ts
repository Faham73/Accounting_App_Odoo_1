import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

interface CreatePartnerBody {
  companyId?: string;
  name: string;
  email?: string;
  phone?: string;
  isCustomer?: boolean;
  isVendor?: boolean;
}

export const listPartners = async (req: Request, res: Response) => {
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

    const partners = await prisma.partner.findMany({
      where: { companyId: finalCompanyId },
      orderBy: { name: 'asc' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ data: partners });
  } catch (error) {
    console.error('Error listing partners:', error);
    res.status(500).json({
      error: 'Failed to list partners',
    });
  }
};

export const createPartner = async (req: Request, res: Response) => {
  try {
    const body: CreatePartnerBody = req.body;

    // Validation
    const errors: string[] = [];

    // name: required
    if (!body.name || typeof body.name !== 'string') {
      errors.push('name is required');
    } else {
      const trimmedName = body.name.trim();
      if (trimmedName.length === 0) {
        errors.push('name cannot be empty');
      } else if (trimmedName.length > 255) {
        errors.push('name must be at most 255 characters');
      }
      body.name = trimmedName;
    }

    // email: optional, but if provided must be valid format
    if (body.email !== undefined && body.email !== null) {
      if (typeof body.email !== 'string') {
        errors.push('email must be a string');
      } else {
        const trimmedEmail = body.email.trim();
        if (trimmedEmail.length > 0) {
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmedEmail)) {
            errors.push('email must be a valid email address');
          } else {
            body.email = trimmedEmail;
          }
        } else {
          body.email = null;
        }
      }
    }

    // phone: optional
    if (body.phone !== undefined && body.phone !== null) {
      if (typeof body.phone !== 'string') {
        errors.push('phone must be a string');
      } else {
        const trimmedPhone = body.phone.trim();
        body.phone = trimmedPhone.length > 0 ? trimmedPhone : null;
      }
    }

    // isCustomer and isVendor: optional booleans
    // At least one must be true (or default isCustomer=true if neither provided)
    let isCustomer = body.isCustomer ?? false;
    let isVendor = body.isVendor ?? false;

    // If neither provided, default isCustomer to true
    if (body.isCustomer === undefined && body.isVendor === undefined) {
      isCustomer = true;
    }

    // Validate that at least one is true
    if (!isCustomer && !isVendor) {
      errors.push('at least one of isCustomer or isVendor must be true');
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

    // Create partner (will throw if unique constraint violated)
    try {
      const partner = await prisma.partner.create({
        data: {
          companyId: finalCompanyId,
          name: body.name,
          email: body.email || null,
          phone: body.phone || null,
          isCustomer,
          isVendor,
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

      res.status(201).json({ data: partner });
    } catch (prismaError: any) {
      // Handle unique constraint violation
      if (
        prismaError.code === 'P2002' &&
        prismaError.meta?.target?.includes('companyId_email')
      ) {
        return res.status(409).json({
          error: `Partner with email "${body.email}" already exists for this company`,
        });
      }
      throw prismaError;
    }
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({
      error: 'Failed to create partner',
    });
  }
};
