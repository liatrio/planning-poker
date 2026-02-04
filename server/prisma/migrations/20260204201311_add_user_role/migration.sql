-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'participant';

-- CreateIndex
CREATE INDEX "User_sessionId_role_idx" ON "User"("sessionId", "role");
