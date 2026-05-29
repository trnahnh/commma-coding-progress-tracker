CREATE TABLE "events" (
	"id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"lang" text,
	"file" text,
	"project" text,
	"keystrokes" integer DEFAULT 0 NOT NULL,
	"lines" integer DEFAULT 0 NOT NULL,
	"key_freq" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "events_id_ts_pk" PRIMARY KEY("id","ts")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"followee_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id")
);
--> statement-breakpoint
CREATE TABLE "session_files" (
	"session_id" uuid NOT NULL,
	"path" text NOT NULL,
	"changes" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "session_files_session_id_path_pk" PRIMARY KEY("session_id","path")
);
--> statement-breakpoint
CREATE TABLE "session_langs" (
	"session_id" uuid NOT NULL,
	"lang" text NOT NULL,
	"duration_s" integer NOT NULL,
	"pct" numeric(5, 2) NOT NULL,
	CONSTRAINT "session_langs_session_id_lang_pk" PRIMARY KEY("session_id","lang")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"duration_s" integer NOT NULL,
	"lines_delta" integer DEFAULT 0 NOT NULL,
	"pace_cpm" integer,
	"peak_cpm" integer,
	"peak_at" timestamp with time zone,
	"keyboard_heatmap" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current_days" integer DEFAULT 0 NOT NULL,
	"longest_days" integer DEFAULT 0 NOT NULL,
	"last_active_date" date
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"email" text NOT NULL,
	"github_id" text NOT NULL,
	"avatar_url" text,
	"privacy" text DEFAULT 'full' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_users_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_files" ADD CONSTRAINT "session_files_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_langs" ADD CONSTRAINT "session_langs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_user_unprocessed" ON "events" USING btree ("user_id","ts") WHERE "events"."processed" = false;--> statement-breakpoint
CREATE INDEX "follows_followee" ON "follows" USING btree ("followee_id");--> statement-breakpoint
CREATE INDEX "sessions_user_started" ON "sessions" USING btree ("user_id","started_at" DESC NULLS LAST);