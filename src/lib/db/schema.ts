import { sql } from "drizzle-orm";
import { 
  boolean,
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: numeric("phone_number").unique(),
  password: text("password"),
}, (table) => [
  unique("users_full_name_key").on(table.firstName, table.lastName),
  check("users_first_name_format", sql`${table.firstName} ~ '^[a-z]+$'`),
  check("users_last_name_format", sql`${table.lastName} ~ '^[a-z]+$'`),
  check("users_email_lowercase", sql`${table.email} IS NULL OR ${table.email} = lower(${table.email})`),
]);

export type User = typeof users.$inferSelect;

// Expiry is decided by isSessionExpired (src/lib/auth/session.ts), which reads created_at and
// updated_at. The expired flag records that decision once a session has timed out.
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    csrfToken: text("csrf_token").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    expiresAt: timestamp("expires_at").notNull(),
    expired: boolean("expired").notNull().default(false),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

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