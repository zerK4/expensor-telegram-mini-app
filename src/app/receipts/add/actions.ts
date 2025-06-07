"use server";

import { db } from "@/database";
import {
  receipts,
  companies,
  categories,
  items,
  users,
} from "@/database/schema";
import { eq } from "drizzle-orm";

interface AddReceiptData {
  telegramUserId: number;
  companyName: string;
  categoryId?: number;
  date: string;
  total: number;
  paidCash?: number | null;
  paidCard?: number | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    currency: string;
  }>;
}

export async function addReceipt(data: AddReceiptData) {
  try {
    // First find the user by telegram ID
    const user = await db
      .select({ id: users.id, currency: users.preferredCurrency })
      .from(users)
      .where(eq(users.telegramId, data.telegramUserId))
      .limit(1);

    if (user.length === 0) {
      throw new Error("User not found");
    }

    const userId = user[0].id;

    // Find or create company
    let companyId: number | null = null;
    if (data.companyName.trim()) {
      // Check if company exists
      const existingCompany = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.name, data.companyName.trim()))
        .limit(1);

      if (existingCompany.length > 0) {
        companyId = existingCompany[0].id;
      } else {
        // Create new company
        const newCompany = await db
          .insert(companies)
          .values({ name: data.companyName.trim() })
          .returning({ id: companies.id });

        companyId = newCompany[0].id;
      }
    }

    // Validate category exists if provided
    if (data.categoryId) {
      const categoryExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, data.categoryId))
        .limit(1);

      if (categoryExists.length === 0) {
        throw new Error("Invalid category");
      }
    }

    // Create receipt
    const newReceipt = await db
      .insert(receipts)
      .values({
        companyId,
        categoryId: data.categoryId || null,
        date: data.date,
        total: data.total,
        currency: user[0].currency ?? "EUR",
        paidCash: data.paidCash || null,
        paidCard: data.paidCard || null,
        telegramUserId: userId,
        createdAt: new Date().toISOString(),
      })
      .returning({ id: receipts.id });

    const receiptId = newReceipt[0].id;

    // Add items if provided
    if (data.items && data.items.length > 0) {
      const validItems = data.items.filter(
        (item) => item.name.trim() && item.quantity > 0 && item.unitPrice > 0,
      );

      if (validItems.length > 0) {
        await db.insert(items).values(
          validItems.map((item) => ({
            receiptId,
            name: item.name.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            currency: item.currency,
          })),
        );
      }
    }

    return {
      success: true,
      receiptId,
      message: "Receipt added successfully",
    };
  } catch (error) {
    console.error("Error adding receipt:", error);
    throw new Error("Failed to add receipt");
  }
}
