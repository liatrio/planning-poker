/*
  Warnings:

  - You are about to drop the column `isCurrent` on the `Story` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Story_sessionId_isCurrent_idx";

-- AlterTable
ALTER TABLE "Story" DROP COLUMN "isCurrent",
ADD COLUMN     "isFocused" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Story_sessionId_isFocused_idx" ON "Story"("sessionId", "isFocused");
