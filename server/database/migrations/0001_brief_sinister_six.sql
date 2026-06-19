ALTER TABLE "server" DROP CONSTRAINT "server_licenseKeyId_unique";--> statement-breakpoint
ALTER TABLE "server" ADD COLUMN "blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "server" ADD COLUMN "policyOverride" "license_key_policy";--> statement-breakpoint
ALTER TABLE "server" ADD COLUMN "overrideExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "server" ADD CONSTRAINT "server_licenseKeyId_ip_unique" UNIQUE("licenseKeyId","ip");