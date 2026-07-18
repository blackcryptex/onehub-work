import Stripe from "stripe";

// Keep version aligned with installed stripe package's supported range
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2024-06-20" as Stripe.LatestApiVersion;

function createE2eMockStripe() {
  type MockPaymentIntent = {
    id: string;
    object: "payment_intent";
    amount: number;
    currency: string;
    status: string;
    client_secret: string;
    latest_charge?: string;
    payment_method_types: string[];
    automatic_payment_methods?: Stripe.PaymentIntentCreateParams.AutomaticPaymentMethods;
    metadata: Stripe.Metadata;
  };

  const intents = new Map<string, MockPaymentIntent>();
  let intentCounter = 0;
  let transferCounter = 0;

  return {
    paymentIntents: {
      async create(params: Stripe.PaymentIntentCreateParams) {
        intentCounter += 1;
        const metadata = Object.fromEntries(
          Object.entries(params.metadata ?? {}).map(([key, value]) => [key, String(value)])
        );
        const localPaymentIntentId = String(metadata.paymentIntentId ?? `missing_${intentCounter}`);
        const contractId = String(metadata.contractId ?? "none");
        const milestoneId = String(metadata.milestoneId ?? "none");
        const id = `pi_e2e_mock_${localPaymentIntentId}_${contractId}_${milestoneId}_${params.amount}_${String(params.currency).toLowerCase()}`;
        const intent: MockPaymentIntent = {
          id,
          object: "payment_intent",
          amount: params.amount,
          currency: params.currency,
          status: "succeeded",
          client_secret: `${id}_secret_e2e_mock`,
          latest_charge: `ch_e2e_mock_${localPaymentIntentId}`,
          payment_method_types: ["card"],
          automatic_payment_methods: params.automatic_payment_methods,
          metadata,
        };
        intents.set(id, intent);
        return intent;
      },
      async retrieve(id: string) {
        const intent = intents.get(id);
        if (intent) return intent;
        const match = id.match(/^pi_e2e_mock_(.+)_(.+)_(.+)_(\d+)_([a-z]+)$/);
        if (match) {
          const [, paymentIntentId, contractId, milestoneId, amount, currency] = match;
          return {
            id,
            object: "payment_intent",
            amount: Number(amount),
            currency,
            status: "succeeded",
            client_secret: `${id}_secret_e2e_mock`,
            latest_charge: `ch_e2e_mock_${paymentIntentId}`,
            payment_method_types: ["card"],
            metadata: {
              paymentIntentId,
              contractId: contractId === "none" ? "" : contractId,
              milestoneId: milestoneId === "none" ? "" : milestoneId,
            },
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          };
        }
        return {
          id,
          object: "payment_intent",
          amount: 0,
          currency: "usd",
          status: "canceled",
          client_secret: `${id}_secret_missing_e2e_mock`,
          payment_method_types: ["card"],
          metadata: {},
        };
      },
      async cancel(id: string) {
        const existing = intents.get(id) ?? {
          id,
          object: "payment_intent",
          amount: 0,
          currency: "usd",
          status: "requires_payment_method",
          client_secret: `${id}_secret_missing_e2e_mock`,
          payment_method_types: ["card"],
          metadata: {},
        };
        const canceled = { ...existing, status: "canceled" };
        intents.set(id, canceled);
        return canceled;
      },
    },
    transfers: {
      async create(params: Stripe.TransferCreateParams) {
        transferCounter += 1;
        return {
          id: `tr_e2e_mock_${transferCounter}`,
          object: "transfer",
          amount: params.amount,
          currency: params.currency,
          destination: params.destination,
          source_transaction: params.source_transaction,
          metadata: params.metadata ?? {},
        };
      },
    },
  } as unknown as Stripe;
}

const useE2eMockStripe =
  process.env.NODE_ENV !== "production" &&
  process.env.ONEHUB_E2E_TEST_MODE === "1" &&
  process.env.ONEHUB_E2E_MOCK_STRIPE === "1";

// Stripe is optional - only initialize if API key is provided
export const stripe = useE2eMockStripe
  ? createE2eMockStripe()
  : process.env.STRIPE_SECRET_KEY
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
