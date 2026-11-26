import { sql } from "drizzle-orm";
import { 
  boolean,
  check,
  date,
  ForeignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
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

// Roles within a group. The owner is not a role: it is the user whose primary group this is.
export const groupRoleEnum = pgEnum("group_role", ["manager", "consumer", "provider", "general"]);

// A group owns food items. Users share a group's items through membership in user_groups.
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: text("name").notNull(),
});

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
  // Each user has exactly one primary group, which they own and cannot leave.
  primaryGroupId: uuid("primary_group_id")
    .notNull()
    .unique()
    .references(() => groups.id, { onDelete: "restrict" }),
}, (table) => [
  unique("users_full_name_key").on(table.firstName, table.lastName),
  check("users_first_name_format", sql`${table.firstName} ~ '^[a-z]+$'`),
  check("users_last_name_format", sql`${table.lastName} ~ '^[a-z]+$'`),
  check("users_email_lowercase", sql`${table.email} IS NULL OR ${table.email} = lower(${table.email})`),
]);

export type User = typeof users.$inferSelect;

// Membership: links users to groups, with a role in each group. A user belongs to their primary
// group and may join others.
export const userGroups = pgTable(
  "user_groups",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.groupId] }),
    index("user_groups_group_id_idx").on(table.groupId),
  ],
);

// expires_at is the time after which a session is invalid; src/lib/auth/session.ts sets it on
// create and refresh. The expired flag is set when a request finds the session past that time.
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
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    allergens: text("allergens").array().notNull().default(sql`'{}'::text[]`),
    dietaryInfo: text("dietary_info").array().notNull().default(sql`'{}'::text[]`),
    notes: text("notes"),
  },
  (table) => [
    check("food_items_amount_positive", sql`${table.amount} > 0`),
    index("food_items_expires_at_idx").on(table.expiresAt),
    index("food_items_group_id_idx").on(table.groupId),
    index("food_items_allergens_idx").using("gin", table.allergens),
  ],
);
