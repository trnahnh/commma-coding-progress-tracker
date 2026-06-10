ALTER TABLE "users" ADD COLUMN "company" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pronouns" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin" varchar(160);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "open_to_work" boolean DEFAULT false NOT NULL;