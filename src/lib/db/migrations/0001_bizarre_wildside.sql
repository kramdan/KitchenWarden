ALTER TABLE "users" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_name_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_full_name_key" UNIQUE("first_name","last_name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_first_name_format" CHECK ("users"."first_name" ~ '^[a-z]+$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_last_name_format" CHECK ("users"."last_name" ~ '^[a-z]+$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK ("users"."email" IS NULL OR "users"."email" = lower("users"."email"));