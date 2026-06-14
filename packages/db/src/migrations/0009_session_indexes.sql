DROP INDEX IF EXISTS "events_user_unprocessed";--> statement-breakpoint
CREATE INDEX "events_user_ts" ON "events" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "sessions_started" ON "sessions" USING btree ("started_at" DESC NULLS LAST);
