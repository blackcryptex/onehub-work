-- CreateEnum
CREATE TYPE "EventStakeholderRole" AS ENUM ('CLIENT', 'STAKEHOLDER');

-- CreateTable
CREATE TABLE "EventStakeholder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EventStakeholderRole" NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventStakeholder_eventId_idx" ON "EventStakeholder"("eventId");

-- CreateIndex
CREATE INDEX "EventStakeholder_userId_idx" ON "EventStakeholder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventStakeholder_eventId_userId_key" ON "EventStakeholder"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventStakeholder" ADD CONSTRAINT "EventStakeholder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStakeholder" ADD CONSTRAINT "EventStakeholder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStakeholder" ADD CONSTRAINT "EventStakeholder_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
