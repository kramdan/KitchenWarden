import { sql } from "drizzle-orm";
import { 
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const foodTypeEnum = pgEnum("food_type", [
    "fruit",
    "vegetable",
    "grain",
    "legume",
    "nut_seed",
    "dairy",
    "protein",
    "other",
]);

export const amountUnitEnum = pgEnum("amount_unit", [
  "count",
  "g",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: text("name").notNull().unique(),
  email: text("email").unique(),
  phoneNumber: numeric("phone_number").unique(),
  password: text("password"),
});

export type User = typeof users.$inferSelect;

export const foodItems = pgTable(
  "food_items",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    name: text("name").notNull(), // not unique: same food can exist in multiple batches
    foodType: foodTypeEnum("food_type").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    unit: amountUnitEnum("unit").notNull(),
    expiresAt: date("expires_at").notNull(),

    allergens: text("allergens").array().notNull().default(sql`'{}'::text[]`),
    dietaryInfo: text("dietary_info").array().notNull().default(sql`'{}'::text[]`),
    notes: text("notes"),
  },
  (table) => [
    check("food_items_amount_positive", sql`${table.amount} > 0`),
    index("food_items_expires_at_idx").on(table.expiresAt),
    index("food_items_allergens_idx").using("gin", table.allergens),
  ],
);