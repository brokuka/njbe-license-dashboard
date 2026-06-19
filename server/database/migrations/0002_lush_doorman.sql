CREATE TABLE "banned_ip" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banned_ip_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ip" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "banned_ip_ip_unique" UNIQUE("ip")
);
--> statement-breakpoint
ALTER TABLE "server" ADD COLUMN "host" varchar(64);