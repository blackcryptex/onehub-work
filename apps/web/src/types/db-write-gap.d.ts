type UnsafeAny = any;

type DbLooseRecord = UnsafeAny;

type DbWriteGapDelegate = {
  findUnique(args: unknown): Promise<DbLooseRecord | null>;
  findFirst(args: unknown): Promise<DbLooseRecord | null>;
  create(args: unknown): Promise<DbLooseRecord>;
  update(args: unknown): Promise<DbLooseRecord>;
  delete(args: unknown): Promise<DbLooseRecord>;
  deleteMany(args: unknown): Promise<{ count: number }>;
  upsert(args: unknown): Promise<DbLooseRecord>;
  findMany(args: unknown): Promise<DbLooseRecord[]>;
  count(args: unknown): Promise<number>;
};

type DbWriteGap = {
  adminOverride: DbWriteGapDelegate;
  contract: DbWriteGapDelegate;
  dispute: DbWriteGapDelegate;
  paymentIntent: DbWriteGapDelegate;
  paymentMilestone: DbWriteGapDelegate;
  payout: DbWriteGapDelegate;
  proposal: DbWriteGapDelegate;
  refundRequest: DbWriteGapDelegate;
  shortlistItem: DbWriteGapDelegate;
  transaction: DbWriteGapDelegate;
  [model: string]: DbWriteGapDelegate;
};
