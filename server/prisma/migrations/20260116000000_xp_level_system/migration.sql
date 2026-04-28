-- CreateEnum
CREATE TYPE "MilestoneCategory" AS ENUM ('VOTES_CAST', 'TOP_VOTES', 'LOGIN_STREAK', 'POSTS_CREATED', 'VOTES_RECEIVED', 'TOP_3_CONTENT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "XpTransactionType" AS ENUM ('MILESTONE_REWARD', 'REFERRAL_BASE', 'ADMIN_ADJUSTMENT');

-- AlterTable: Add new columns to users table
ALTER TABLE "users" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "referralCode" TEXT;

-- CreateIndex: Unique index for referral code
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateTable: user_login_streaks
CREATE TABLE "user_login_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" DATE NOT NULL,

    CONSTRAINT "user_login_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique index for userId
CREATE UNIQUE INDEX "user_login_streaks_userId_key" ON "user_login_streaks"("userId");

-- CreateTable: xp_milestones_claimed
CREATE TABLE "xp_milestones_claimed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "MilestoneCategory" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_milestones_claimed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique composite index to prevent double-claiming milestones
CREATE UNIQUE INDEX "xp_milestones_claimed_userId_category_threshold_key" ON "xp_milestones_claimed"("userId", "category", "threshold");

-- CreateTable: xp_transactions
CREATE TABLE "xp_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "XpTransactionType" NOT NULL,
    "category" "MilestoneCategory",
    "threshold" INTEGER,
    "description" TEXT,
    "metadata" JSONB,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index for querying user transactions by date
CREATE INDEX "xp_transactions_userId_createdAt_idx" ON "xp_transactions"("userId", "createdAt");

-- CreateTable: referrals
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "xpAwarded" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique index to prevent user being referred twice
CREATE UNIQUE INDEX "referrals_referredId_key" ON "referrals"("referredId");

-- CreateIndex: Index for querying referrals by referrer
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- AddForeignKey: user_login_streaks -> users
ALTER TABLE "user_login_streaks" ADD CONSTRAINT "user_login_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: xp_milestones_claimed -> users
ALTER TABLE "xp_milestones_claimed" ADD CONSTRAINT "xp_milestones_claimed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: xp_transactions -> users
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: referrals referrer -> users
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: referrals referred -> users
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
