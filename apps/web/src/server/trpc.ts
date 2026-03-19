import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getCurrentUser } from "@/lib/auth-helpers";

const t = initTRPC.create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure that requires authentication.
 * Throws UNAUTHORIZED error if user is not authenticated.
 */
export const protectedProcedure = t.procedure.use(async ({ next, ctx }) => {
  const user = await getCurrentUser();
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});
