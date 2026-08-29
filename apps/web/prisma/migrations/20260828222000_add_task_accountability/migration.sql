-- Workflow 6 task accountability spine: owner, blocker, dependency, escalation, and completion proof metadata.
ALTER TABLE "Task"
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "blockedAt" TIMESTAMP(3),
  ADD COLUMN "blockedById" TEXT,
  ADD COLUMN "blockerReason" TEXT,
  ADD COLUMN "blockerType" TEXT,
  ADD COLUMN "blockerResolvedAt" TIMESTAMP(3),
  ADD COLUMN "blockerResolvedById" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "completedById" TEXT,
  ADD COLUMN "completionNote" TEXT,
  ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "escalatedAt" TIMESTAMP(3);

CREATE TABLE "TaskDependency" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "dependsOnTaskId" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskProof" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "label" TEXT NOT NULL,
  "urlOrMediaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskProof_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_eventId_status_idx" ON "Task"("eventId", "status");
CREATE INDEX "Task_assigneeId_status_dueAt_idx" ON "Task"("assigneeId", "status", "dueAt");
CREATE INDEX "Task_status_priority_dueAt_idx" ON "Task"("status", "priority", "dueAt");
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnTaskId_key" ON "TaskDependency"("taskId", "dependsOnTaskId");
CREATE INDEX "TaskDependency_taskId_idx" ON "TaskDependency"("taskId");
CREATE INDEX "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");
CREATE INDEX "TaskProof_taskId_createdAt_idx" ON "TaskProof"("taskId", "createdAt");
CREATE INDEX "TaskProof_uploadedById_createdAt_idx" ON "TaskProof"("uploadedById", "createdAt");

ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_blockerResolvedById_fkey" FOREIGN KEY ("blockerResolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskProof" ADD CONSTRAINT "TaskProof_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskProof" ADD CONSTRAINT "TaskProof_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
