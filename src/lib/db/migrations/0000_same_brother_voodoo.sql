CREATE TYPE "public"."amount_unit" AS ENUM('count', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'cup', 'tbsp', 'tsp');--> statement-breakpoint
CREATE TYPE "public"."food_type" AS ENUM('fruit', 'vegetable', 'grain', 'legume', 'nut_seed', 'dairy', 'protein', 'other');--> statement-breakpoint
CREATE TABLE "food_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"food_type" "food_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"unit" "amount_unit" NOT NULL,
	"expires_at" date NOT NULL,
	"allergens" text[] DEFAULT '{}'::text[] NOT NULL,
	"dietary_info" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	CONSTRAINT "food_items_amount_positive" CHECK ("food_items"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "food_items_expires_at_idx" ON "food_items" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "food_items_allergens_idx" ON "food_items" USING gin ("allergens");