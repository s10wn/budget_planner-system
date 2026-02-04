import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getMonthlyReport(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expensesByCategory = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce(
        (acc, t) => {
          const key = t.category.name;
          if (!acc[key]) {
            acc[key] = { category: t.category, total: 0 };
          }
          acc[key].total += Number(t.amount);
          return acc;
        },
        {} as Record<string, { category: any; total: number }>,
      );

    const incomeByCategory = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce(
        (acc, t) => {
          const key = t.category.name;
          if (!acc[key]) {
            acc[key] = { category: t.category, total: 0 };
          }
          acc[key].total += Number(t.amount);
          return acc;
        },
        {} as Record<string, { category: any; total: number }>,
      );

    return {
      month,
      year,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expensesByCategory: Object.values(expensesByCategory),
      incomeByCategory: Object.values(incomeByCategory),
      transactionsCount: transactions.length,
    };
  }

  async getYearlyTrend(userId: string, year: number) {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0, 23, 59, 59);

      const [income, expense] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'INCOME',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        }),
      ]);

      months.push({
        month: m,
        income: Number(income._sum.amount || 0),
        expense: Number(expense._sum.amount || 0),
      });
    }
    return { year, months };
  }
}
