"use server";

import { db } from "@/database";
import {
  receipts,
  companies,
  categories,
  items,
  users,
} from "@/database/schema";
import { eq, and } from "drizzle-orm";

export async function getReceiptById(
  receiptId: number,
  telegramUserId: number,
) {
  try {
    // First find the user by telegram ID
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, telegramUserId))
      .limit(1);

    if (user.length === 0) {
      throw new Error("User not found");
    }

    const userId = user[0].id;

    // Get the receipt with company and category info
    const receipt = await db
      .select({
        id: receipts.id,
        companyId: receipts.companyId,
        categoryId: receipts.categoryId,
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
      .where(
        and(eq(receipts.id, receiptId), eq(receipts.telegramUserId, userId)),
      )
      .limit(1);

    if (receipt.length === 0) {
      throw new Error("Receipt not found");
    }

    // Get receipt items
    const receiptItems = await db
      .select()
      .from(items)
      .where(eq(items.receiptId, receiptId));

    return {
      receipt: receipt[0],
      items: receiptItems,
    };
  } catch (error) {
    console.error("Error fetching receipt:", error);
    throw new Error("Failed to fetch receipt");
  }
}

interface UpdateReceiptData {
  receiptId: number;
  telegramUserId: number;
  companyName: string;
  categoryId?: number;
  date: string;
  total: number;
  currency: string;
  paidCash?: number | null;
  paidCard?: number | null;
  items: Array<{
    id?: number;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    currency: string;
  }>;
}

export async function updateReceipt(data: UpdateReceiptData) {
  try {
    // First find the user by telegram ID
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, data.telegramUserId))
      .limit(1);

    if (user.length === 0) {
      throw new Error("User not found");
    }

    const userId = user[0].id;

    // Verify the receipt belongs to the user
    const existingReceipt = await db
      .select({ id: receipts.id })
      .from(receipts)
      .where(
        and(
          eq(receipts.id, data.receiptId),
          eq(receipts.telegramUserId, userId),
        ),
      )
      .limit(1);

    if (existingReceipt.length === 0) {
      throw new Error("Receipt not found or access denied");
    }

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

    // Update receipt
    await db
      .update(receipts)
      .set({
        companyId,
        categoryId: data.categoryId || null,
        date: data.date,
        total: data.total,
        currency: data.currency,
        paidCash: data.paidCash || null,
        paidCard: data.paidCard || null,
      })
      .where(eq(receipts.id, data.receiptId));

    // Delete existing items
    await db.delete(items).where(eq(items.receiptId, data.receiptId));

    // Add new items if provided
    if (data.items && data.items.length > 0) {
      const validItems = data.items.filter(
        (item) => item.name.trim() && item.quantity > 0 && item.unitPrice > 0,
      );

      if (validItems.length > 0) {
        await db.insert(items).values(
          validItems.map((item) => ({
            receiptId: data.receiptId,
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
      message: "Receipt updated successfully",
    };
  } catch (error) {
    console.error("Error updating receipt:", error);
    throw new Error("Failed to update receipt");
  }
}
