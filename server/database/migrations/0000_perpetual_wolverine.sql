CREATE TYPE "public"."license_key_policy" AS ENUM('key', 'time', 'open');--> statement-breakpoint
CREATE TYPE "public"."license_key_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "license_key" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "license_key_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" varchar(255) NOT NULL,
	"mod" varchar(32) DEFAULT 'nhnse' NOT NULL,
	"description" text,
	"status" "license_key_status" DEFAULT 'active' NOT NULL,
	"policy" "license_key_policy" DEFAULT 'key' NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "license_key_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "server" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "server_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"licenseKeyId" integer NOT NULL,
	"ip" varchar(64),
	"hostname" varchar(191),
	"map" varchar(64),
	"players" integer DEFAULT 0 NOT NULL,
	"maxplayers" integer DEFAULT 0 NOT NULL,
	"version" varchar(64),
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "server_licenseKeyId_unique" UNIQUE("licenseKeyId")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" varchar(255) NOT NULL,
	"age" integer NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email" varchar(255),
	"passwordHash" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "server" ADD CONSTRAINT "server_licenseKeyId_license_key_id_fk" FOREIGN KEY ("licenseKeyId") REFERENCES "public"."license_key"("id") ON DELETE cascade ON UPDATE no action;