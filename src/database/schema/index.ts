// src/db/schema.ts
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
});

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const receipts = sqliteTable("receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "cascade",
  }),
  date: text("date").notNull(),
  total: real("total").notNull(),
  currency: text("currency").notNull().default("EUR"),
  paidCash: real("paid_cash"),
  paidCard: real("paid_card"),
  telegramUserId: integer("telegram_user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: text("created_at").default(new Date().toISOString()),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  receiptId: integer("receipt_id").references(() => receipts.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
  currency: text("currency").notNull().default("EUR"),
});

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    telegramId: integer("telegram_id").notNull().unique(),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    language: text("language").default("en"),
    preferredCurrency: text("preferred_currency").default("EUR"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: text("created_at").default(new Date().toISOString()),
    tokens: integer("tokens").default(0),
    lastLoginAt: text("last_login_at"),
  },
  (table) => [uniqueIndex("users_telegram_id_unique").on(table.telegramId)],
);

export type CategorySelectType = typeof categories.$inferSelect;
export type CategoryInsertType = typeof categories.$inferInsert;
export type UserSelectType = typeof users.$inferSelect;
export type UserInsertType = typeof users.$inferInsert;
