import Stripe from "stripe";

// Keep version aligned with installed stripe package's supported range
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2024-06-20" as Stripe.LatestApiVersion;

// Stripe is optional - only initialize if API key is provided
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    })
  : null;

export function isStripeAvailable(): boolean {
  return stripe !== null;
}

/**
 * Returns the Stripe client instance, throwing an error if it's not initialized.
 * Use this helper when Stripe is required for the operation.
 * 
 * @throws {Error} If Stripe client is not initialized (STRIPE_SECRET_KEY is missing)
 */
export function getStripeOrThrow(): Stripe {
  if (!stripe) {
    throw new Error("Stripe client is not initialized. STRIPE_SECRET_KEY environment variable is required.");
  }
  return stripe;
}

