-- CreateEnum
CREATE TYPE "EventShareScope" AS ENUM ('SUMMARY');

-- CreateTable
CREATE TABLE "EventShare" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "scope" "EventShareScope" NOT NULL DEFAULT 'SUMMARY',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventShare_eventId_idx" ON "EventShare"("eventId");

-- CreateIndex
CREATE INDEX "EventShare_viewerUserId_idx" ON "EventShare"("viewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "EventShare_eventId_viewerUserId_scope_key" ON "EventShare"("eventId", "viewerUserId", "scope");

-- AddForeignKey
ALTER TABLE "EventShare" ADD CONSTRAINT "EventShare_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventShare" ADD CONSTRAINT "EventShare_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventShare" ADD CONSTRAINT "EventShare_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
