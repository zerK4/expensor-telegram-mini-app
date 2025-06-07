"use server";

import { db } from "@/database";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export async function getUserProfile(telegramId: number) {
  try {
    const user = await db
      .select({
        id: users.id,
        telegramId: users.telegramId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        language: users.language,
        preferredCurrency: users.preferredCurrency,
        isActive: users.isActive,
        createdAt: users.createdAt,
        tokens: users.tokens,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    if (user.length === 0) {
      throw new Error("User not found");
    }

    return user[0];
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error("Failed to fetch user profile");
  }
}

export async function updateUserLastLogin(telegramId: number) {
  try {
    await db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.telegramId, telegramId));

    return { success: true };
  } catch (error) {
    console.error("Error updating user last login:", error);
    throw new Error("Failed to update user last login");
  }
}

export async function addTokensToUser(telegramId: number, amount: number) {
  try {
    const user = await db
      .select({ id: users.id, tokens: users.tokens })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    if (user.length === 0) {
      throw new Error("User not found");
    }

    const currentTokens = user[0].tokens || 0;
    const newTokens = currentTokens + amount;

    await db
      .update(users)
      .set({ tokens: newTokens })
      .where(eq(users.telegramId, telegramId));

    return { success: true, newBalance: newTokens };
  } catch (error) {
    console.error("Error adding tokens to user:", error);
    throw new Error("Failed to add tokens");
  }
}
