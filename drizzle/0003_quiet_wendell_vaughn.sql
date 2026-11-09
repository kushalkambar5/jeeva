CREATE TABLE "npc_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"npc_id" varchar(50) NOT NULL,
	"session_id" varchar(100),
	"memory_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"importance" integer DEFAULT 5 NOT NULL,
	"emotional_valence" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npc_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"npc_id" varchar(50) NOT NULL,
	"trust" integer DEFAULT 0 NOT NULL,
	"affection" integer DEFAULT 0 NOT NULL,
	"respect" integer DEFAULT 0 NOT NULL,
	"fear" integer DEFAULT 0 NOT NULL,
	"familiarity" integer DEFAULT 0 NOT NULL,
	"relationship_tier" varchar(50) DEFAULT 'stranger' NOT NULL,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npc_working_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"npc_id" varchar(50) NOT NULL,
	"session_id" varchar(100),
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "npc_memories" ADD CONSTRAINT "npc_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_memories" ADD CONSTRAINT "npc_memories_npc_id_npc_definitions_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npc_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_relationships" ADD CONSTRAINT "npc_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_relationships" ADD CONSTRAINT "npc_relationships_npc_id_npc_definitions_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npc_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_working_memories" ADD CONSTRAINT "npc_working_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_working_memories" ADD CONSTRAINT "npc_working_memories_npc_id_npc_definitions_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npc_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_npc_memories_user_npc" ON "npc_memories" USING btree ("user_id","npc_id","memory_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_npc_relationship" ON "npc_relationships" USING btree ("user_id","npc_id");--> statement-breakpoint
CREATE INDEX "idx_working_mem_user_npc_time" ON "npc_working_memories" USING btree ("user_id","npc_id","created_at");