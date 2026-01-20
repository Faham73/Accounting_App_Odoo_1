import { PrismaClient, AccountType, JournalType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default Company
  const company = await prisma.company.upsert({
    where: { id: 'default-company-id' },
    update: {},
    create: {
      id: 'default-company-id',
      name: 'Default Company',
      baseCurrency: 'USD',
    },
  });

  console.log('✅ Created company:', company.name);

  // Create default Journals
  const journals = [
    { code: 'GEN', name: 'General Journal', type: JournalType.GENERAL },
    { code: 'SAL', name: 'Sales Journal', type: JournalType.SALES },
    { code: 'PUR', name: 'Purchase Journal', type: JournalType.PURCHASE },
    { code: 'BNK', name: 'Bank Journal', type: JournalType.BANK },
  ];

  for (const journal of journals) {
    const created = await prisma.journal.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: journal.code,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        ...journal,
      },
    });
    console.log(`✅ Created journal: ${created.name} (${created.code})`);
  }

  // Create default Accounts
  const accounts = [
    { code: '1000', name: 'Cash', type: AccountType.ASSET },
    { code: '1100', name: 'Bank', type: AccountType.ASSET },
    { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
    { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
    { code: '4000', name: 'Sales Revenue', type: AccountType.INCOME },
    { code: '5000', name: 'Office Expense', type: AccountType.EXPENSE },
  ];

  for (const account of accounts) {
    const created = await prisma.account.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: account.code,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        ...account,
        isActive: true,
      },
    });
    console.log(`✅ Created account: ${created.name} (${created.code}) - ${created.type}`);
  }

  // Create default Partners
  const partners = [
    { name: 'Walk-in Customer', isCustomer: true, isVendor: false },
    { name: 'Default Vendor', isCustomer: false, isVendor: true },
  ];

  for (const partner of partners) {
    const existing = await prisma.partner.findFirst({
      where: {
        companyId: company.id,
        name: partner.name,
      },
    });

    if (!existing) {
      const created = await prisma.partner.create({
        data: {
          companyId: company.id,
          ...partner,
        },
      });
      const typeLabel = `${created.isCustomer ? 'Customer' : ''}${created.isCustomer && created.isVendor ? '/' : ''}${created.isVendor ? 'Vendor' : ''}`;
      console.log(`✅ Created partner: ${created.name} (${typeLabel})`);
    } else {
      console.log(`⏭️  Partner already exists: ${partner.name}`);
    }
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
