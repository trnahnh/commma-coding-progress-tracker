ALTER TABLE "sessions" ADD COLUMN "leaderboard_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "sessions_leaderboard_pending" ON "sessions" USING btree ("user_id") WHERE "sessions"."leaderboard_pending";
