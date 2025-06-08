import { Stripe } from "stripe";
import { TOKEN_PACKAGES } from "../lib/packages";

export const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!);

// Check if Stripe is properly configured
const isStripeConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY !== "sk_test_placeholder"
  );
};

export const createCheckoutSession = async (
  telegramId: number,
  packageId: string,
): Promise<string | null> => {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    console.error("Cannot create checkout session: Stripe is not configured");
    return null;
  }

  const tokenPack = TOKEN_PACKAGES.find((p) => p.id === packageId);

  if (!tokenPack) return null;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${tokenPack.label} for Expensor Bot`,
              description: `Purchase of ${tokenPack.quantity} tokens`,
            },
            unit_amount: tokenPack.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://t.me/${process.env.BOT_USERNAME}?start=payment_done`,
      cancel_url: `https://t.me/${process.env.BOT_USERNAME}?start=payment_cancelled`,
      metadata: {
        telegramId: telegramId.toString(),
        tokens: tokenPack.quantity.toString(),
      },
    });

    return session.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return null;
  }
};
