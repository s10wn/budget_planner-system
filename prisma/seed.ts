import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/budget_planner?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@budget-planner.com' },
    update: {},
    create: {
      email: 'admin@budget-planner.com',
      passwordHash: adminPassword,
      name: 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log('Admin created:', admin.email);

  // Create demo user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@budget-planner.com' },
    update: {},
    create: {
      email: 'demo@budget-planner.com',
      passwordHash: userPassword,
      name: 'Demo User',
    },
  });
  console.log('Demo user created:', user.email);

  // Create default currencies
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '\u20AC' },
    { code: 'GBP', name: 'British Pound', symbol: '\u00A3' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'z\u0142' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '\u20BD' },
    { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '\u20B4' },
  ];

  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log('Currencies seeded');

  // Create default categories
  const defaultCategories = [
    { name: 'Salary', type: 'INCOME' as const, icon: '\uD83D\uDCB0', color: '#10B981' },
    { name: 'Freelance', type: 'INCOME' as const, icon: '\uD83D\uDCBB', color: '#6366F1' },
    { name: 'Investments', type: 'INCOME' as const, icon: '\uD83D\uDCC8', color: '#8B5CF6' },
    { name: 'Other Income', type: 'INCOME' as const, icon: '\uD83D\uDCB5', color: '#14B8A6' },
    { name: 'Food & Groceries', type: 'EXPENSE' as const, icon: '\uD83D\uDED2', color: '#EF4444' },
    { name: 'Transport', type: 'EXPENSE' as const, icon: '\uD83D\uDE97', color: '#F59E0B' },
    { name: 'Housing', type: 'EXPENSE' as const, icon: '\uD83C\uDFE0', color: '#3B82F6' },
    { name: 'Utilities', type: 'EXPENSE' as const, icon: '\uD83D\uDCA1', color: '#06B6D4' },
    { name: 'Entertainment', type: 'EXPENSE' as const, icon: '\uD83C\uDFAC', color: '#EC4899' },
    { name: 'Healthcare', type: 'EXPENSE' as const, icon: '\uD83C\uDFE5', color: '#F43F5E' },
    { name: 'Education', type: 'EXPENSE' as const, icon: '\uD83D\uDCDA', color: '#8B5CF6' },
    { name: 'Shopping', type: 'EXPENSE' as const, icon: '\uD83D\uDECD\uFE0F', color: '#D946EF' },
    { name: 'Restaurants', type: 'EXPENSE' as const, icon: '\uD83C\uDF7D\uFE0F', color: '#FB923C' },
    { name: 'Subscriptions', type: 'EXPENSE' as const, icon: '\uD83D\uDCF1', color: '#64748B' },
  ];

  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isDefault: true },
    });
    if (!existing) {
      await prisma.category.create({
        data: { ...cat, isDefault: true },
      });
    }
  }
  console.log('Default categories seeded');

  // Create default settings
  const settings = [
    { key: 'default_language', value: 'en' },
    { key: 'default_currency', value: 'USD' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('Settings seeded');

  // Create demo transactions for demo user
  const categories = await prisma.category.findMany({ where: { isDefault: true } });
  const now = new Date();

  const demoTransactions = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 60));

    const isIncome = Math.random() > 0.7;
    const cats = categories.filter(c => c.type === (isIncome ? 'INCOME' : 'EXPENSE'));
    const cat = cats[Math.floor(Math.random() * cats.length)];

    demoTransactions.push({
      userId: user.id,
      categoryId: cat.id,
      type: cat.type,
      amount: isIncome
        ? Math.round((Math.random() * 3000 + 500) * 100) / 100
        : Math.round((Math.random() * 200 + 10) * 100) / 100,
      currency: 'USD',
      description: `Demo ${cat.name.toLowerCase()} transaction`,
      date,
    });
  }

  await prisma.transaction.createMany({ data: demoTransactions });
  console.log('Demo transactions seeded:', demoTransactions.length);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
