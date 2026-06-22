import {Request,Response} from 'express'
import { Stripe } from 'stripe';
import prisma from '../lib/prisma.js';

export const stripeWebhook = async (request: Request, response: Response) => {

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  // FIX (CS-02, LB-02): Always return a response, even if endpointSecret is not configured.
  if (!endpointSecret) {
    console.error('⚠️  STRIPE_WEBHOOK_SECRET is not configured. Rejecting webhook.');
    return response.sendStatus(500);
  }

  // Verify the Stripe signature so we know the request is genuine.
  const signature = request.headers['stripe-signature'] as string;
  let event: ReturnType<typeof stripe.webhooks.constructEvent>;

  try {
    event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
    return response.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {

    // FIX (CS-03): Use checkout.session.completed instead of payment_intent.succeeded.
    // This event fires once per completed Checkout Session and carries metadata directly
    // on event.data.object — no secondary API call to stripe.checkout.sessions.list needed.
    case 'checkout.session.completed': {
      const session = event.data.object;
      const metadata = session.metadata as { transactionId?: string; appId?: string } | null;

      const transactionId = metadata?.transactionId;
      const appId = metadata?.appId;

      if (appId !== 'ai-site-builder' || !transactionId) {
        // Not our app — ignore silently but acknowledge receipt.
        break;
      }

      // FIX (CS-02, LB-01): Idempotency guard via updateMany.
      // The WHERE clause filters on { isPaid: false }, so if Stripe retries this
      // webhook (e.g. after a timeout), the second call finds count === 0 and
      // exits without crediting the user a second time.
      const result = await prisma.transaction.updateMany({
        where: {
          id: transactionId,
          isPaid: false, // idempotency: only act on transactions not yet paid
        },
        data: { isPaid: true },
      });

      if (result.count === 0) {
        // Already processed — acknowledge and stop here to prevent double-credit.
        console.log(`[Stripe] Transaction ${transactionId} already processed. Skipping.`);
        break;
      }

      // Fetch the transaction to obtain userId and credits amount.
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        console.error(`[Stripe] Transaction ${transactionId} not found after update.`);
        break;
      }

      // Credit the user now that we've exclusively claimed this transaction.
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { credits: { increment: transaction.credits } },
      });

      console.log(
        `[Stripe] ✅ Credited ${transaction.credits} credits to user ${transaction.userId} for transaction ${transactionId}.`
      );
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  // Acknowledge receipt to Stripe — must always return 2xx to stop retries.
  return response.json({ received: true });
};