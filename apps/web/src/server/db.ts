import { prisma } from "@/lib/prisma";

export const db = prisma;
export type DbClient = typeof db;
