"use server";

import { db } from "@/database";
import {
  receipts,
  companies,
  categories,
  items,
  users,
} from "@/database/schema";
import {
  eq,
  desc,
  asc,
  like,
  and,
  or,
  gte,
  lte,
  isNull,
  type SQL,
} from "drizzle-orm";

export interface ReceiptsFilters {
  categoryId?: number;
  companyId?: number;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: "cash" | "card" | "both";
  search?: string;
}

export interface ReceiptsSortOptions {
  field: "date" | "total" | "company" | "category";
  direction: "asc" | "desc";
}

export interface GetReceiptsParams {
  telegramId: number;
  page?: number;
  limit?: number;
  filters?: ReceiptsFilters;
  sort?: ReceiptsSortOptions;
}

export interface PaginatedReceipts {
  receipts: Array<{
    id: number;
    date: string;
    total: number;
    currency: string;
    paidCash: number | null;
    paidCard: number | null;
    createdAt: string | null;
    company: {
      id: number | null;
      name: string | null;
    } | null;
    category: {
      id: number | null;
      name: string | null;
      icon: string | null;
    } | null;
  }>;
  hasMore: boolean;
  totalCount: number;
  nextPage: number | null;
}

export async function getUserReceiptsPaginated({
  telegramId,
  page = 1,
  limit = 30,
  filters = {},
  sort = { field: "date", direction: "desc" },
}: GetReceiptsParams): Promise<PaginatedReceipts> {
  try {
    // First find the user by telegram ID
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    if (user.length === 0) {
      return {
        receipts: [],
        hasMore: false,
        totalCount: 0,
        nextPage: null,
      };
    }

    const userId = user[0].id;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: SQL[] = [eq(receipts.telegramUserId, userId)];

    if (filters.categoryId) {
      whereConditions.push(eq(receipts.categoryId, filters.categoryId));
    }

    if (filters.companyId) {
      whereConditions.push(eq(receipts.companyId, filters.companyId));
    }

    if (filters.dateFrom) {
      whereConditions.push(gte(receipts.date, filters.dateFrom));
    }

    if (filters.dateTo) {
      whereConditions.push(lte(receipts.date, filters.dateTo));
    }

    if (filters.minAmount) {
      whereConditions.push(gte(receipts.total, filters.minAmount));
    }

    if (filters.maxAmount) {
      whereConditions.push(lte(receipts.total, filters.maxAmount));
    }

    if (filters.paymentMethod === "cash") {
      const cashCondition = and(
        eq(receipts.paidCash, receipts.total),
        or(eq(receipts.paidCard, 0), isNull(receipts.paidCard))!,
      )!;
      whereConditions.push(cashCondition);
    } else if (filters.paymentMethod === "card") {
      const cardCondition = and(
        eq(receipts.paidCard, receipts.total),
        or(eq(receipts.paidCash, 0), isNull(receipts.paidCash))!,
      )!;
      whereConditions.push(cardCondition);
    }

    if (filters.search) {
      const searchCondition = or(
        like(companies.name, `%${filters.search}%`),
        like(categories.name, `%${filters.search}%`),
      )!;
      whereConditions.push(searchCondition);
    }

    // Build order by
    let orderByClause;
    switch (sort.field) {
      case "total":
        orderByClause =
          sort.direction === "asc" ? asc(receipts.total) : desc(receipts.total);
        break;
      case "company":
        orderByClause =
          sort.direction === "asc" ? asc(companies.name) : desc(companies.name);
        break;
      case "category":
        orderByClause =
          sort.direction === "asc"
            ? asc(categories.name)
            : desc(categories.name);
        break;
      default:
        orderByClause =
          sort.direction === "asc" ? asc(receipts.date) : desc(receipts.date);
    }

    // Get total count
    const totalCountResult = await db
      .select({ count: receipts.id })
      .from(receipts)
      .leftJoin(companies, eq(receipts.companyId, companies.id))
      .leftJoin(categories, eq(receipts.categoryId, categories.id))
      .where(and(...whereConditions));

    const totalCount = totalCountResult.length;

    // Get paginated receipts
    const userReceipts = await db
      .select({
        id: receipts.id,
        date: receipts.date,
        total: receipts.total,
        currency: receipts.currency,
        paidCash: receipts.paidCash,
        paidCard: receipts.paidCard,
        createdAt: receipts.createdAt,
        company: {
          id: companies.id,
          name: companies.name,
        },
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
        },
      })
      .from(receipts)
      .leftJoin(companies, eq(receipts.companyId, companies.id))
      .leftJoin(categories, eq(receipts.categoryId, categories.id))
      .where(and(...whereConditions))
      .orderBy(orderByClause, desc(receipts.createdAt))
      .limit(limit)
      .offset(offset);

    const hasMore = offset + userReceipts.length < totalCount;
    const nextPage = hasMore ? page + 1 : null;

    return {
      receipts: userReceipts,
      hasMore,
      totalCount,
      nextPage,
    };
  } catch (error) {
    console.error("Error fetching user receipts:", error);
    throw new Error("Failed to fetch receipts");
  }
}

export async function getReceiptItems(receiptId: number) {
  try {
    const receiptItems = await db
      .select()
      .from(items)
      .where(eq(items.receiptId, receiptId));

    return receiptItems;
  } catch (error) {
    console.error("Error fetching receipt items:", error);
    throw new Error("Failed to fetch receipt items");
  }
}

export async function getFilterOptions(telegramId: number) {
  try {
    // First find the user by telegram ID
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    if (user.length === 0) {
      return { categories: [], companies: [] };
    }

    const userId = user[0].id;

    // Get unique categories used by user
    const userCategories = await db
      .selectDistinct({
        id: categories.id,
        name: categories.name,
        icon: categories.icon,
      })
      .from(categories)
      .innerJoin(receipts, eq(receipts.categoryId, categories.id))
      .where(eq(receipts.telegramUserId, userId))
      .orderBy(asc(categories.name));

    // Get unique companies used by user
    const userCompanies = await db
      .selectDistinct({
        id: companies.id,
        name: companies.name,
      })
      .from(companies)
      .innerJoin(receipts, eq(receipts.companyId, companies.id))
      .where(eq(receipts.telegramUserId, userId))
      .orderBy(asc(companies.name));

    return {
      categories: userCategories,
      companies: userCompanies,
    };
  } catch (error) {
    console.error("Error fetching filter options:", error);
    throw new Error("Failed to fetch filter options");
  }
}
