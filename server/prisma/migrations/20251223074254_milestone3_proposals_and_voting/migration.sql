-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('IMAGE', 'MCQ');

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "finalRank" INTEGER,
ADD COLUMN     "voteCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "ProposalType" NOT NULL,
    "title" TEXT,
    "options" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Make submissionId nullable and add proposalId
ALTER TABLE "votes"
    DROP CONSTRAINT "votes_submissionId_fkey",
    DROP CONSTRAINT "votes_eventId_submissionId_userId_key",
    ALTER COLUMN "submissionId" DROP NOT NULL,
    ADD COLUMN "proposalId" TEXT;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (re-add with nullable constraint)
ALTER TABLE "votes" ADD CONSTRAINT "votes_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (unique constraints for dual-use voting)
CREATE UNIQUE INDEX "unique_submission_vote" ON "votes"("eventId", "submissionId", "userId");

CREATE UNIQUE INDEX "unique_proposal_vote" ON "votes"("eventId", "proposalId", "userId");
