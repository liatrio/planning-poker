-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" TEXT NOT NULL,
    "shouldBreakdown" BOOLEAN NOT NULL,
    "recommendation" TEXT,
    "suggestedStories" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storyId" TEXT NOT NULL,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIRecommendation_storyId_key" ON "AIRecommendation"("storyId");

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
