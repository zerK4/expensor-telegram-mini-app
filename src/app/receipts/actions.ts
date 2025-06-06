"use server";

import { db } from "@/database";
import { receipts, companies, categories, items, users } from "@/database/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserReceipts(telegramId: number) {
  try {
    // First find the user by telegram ID
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    if (user.length === 0) {
      return [];
    }

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
      .where(eq(receipts.telegramUserId, user[0].id))
      .orderBy(desc(receipts.date), desc(receipts.createdAt));

    return userReceipts;
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