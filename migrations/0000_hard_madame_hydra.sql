CREATE TABLE "library_corpora" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"origin" text DEFAULT 'user' NOT NULL,
	"source_track" text,
	"language_pair" text,
	"domain" text,
	"size_label" text,
	"license" text,
	"external_url" text,
	"sample_pairs" jsonb,
	"created_at" timestamp DEFAULT now()
);
