CREATE INDEX "teams_owner" ON "teams" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "team_invites_invited_by" ON "team_invites" USING btree ("invited_by");
