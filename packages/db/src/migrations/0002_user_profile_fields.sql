ALTER TABLE "users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" varchar(64);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" varchar(160);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website" varchar(256);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" varchar(64);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school" varchar(128);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "field_of_study" varchar(64);
