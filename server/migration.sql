CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'CLICK', 'SHARE', 'EXPAND', 'VOTE');
CREATE TABLE "event_interactions" (
"id" TEXT NOT NULL,
"eventId" TEXT NOT NULL,
"userId" TEXT,
"type" "InteractionType" NOT NULL,
"metadata" JSONB,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "event_interactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "event_interactions_eventId_type_idx" ON "event_interactions"("eventId", "type");
CREATE INDEX "event_interactions_userId_eventId_type_idx" ON "event_interactions"("userId", "eventId", "type");
ALTER TABLE "event_interactions" ADD CONSTRAINT "event_interactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_interactions" ADD CONSTRAINT "event_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add shares and clicks aggregate columns to EventAnalytics
ALTER TABLE "eventAnalytics" ADD COLUMN IF NOT EXISTS "totalShares" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "eventAnalytics" ADD COLUMN IF NOT EXISTS "totalClicks" INTEGER NOT NULL DEFAULT 0;

-- Add Trust Score to users (EMA-updated on event completion, range 0.0–1.0)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5;

-- Add AI Summary to EventAnalytics
ALTER TABLE "eventAnalytics" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
