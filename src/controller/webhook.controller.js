const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const subscriptionModel = require('../models/subscription.model');  // Adjust the path to your model

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const rawBody = req.body;  // The raw body as Buffer

  // console.log('Received raw body:', rawBody.toString());  // Log for debugging
  // console.log('Received Stripe-Signature:', sig);

  try {
    
      const event = stripe.webhooks.constructEvent(
          rawBody,  
          sig,       
          process.env.STRIPE_WEBHOOK_SECRET_KEY  
      );

      // Handle the event type
      console.log('Received event:', event.type);

        switch (event.type) {
            case 'checkout.session.completed':
                console.log('New Subscription started!');
                console.log(event.data);
                break;

            case 'invoice.paid':
                console.log('Invoice paid');
                console.log(event.data);
                break;

            case 'invoice.payment_failed':
                console.log('Invoice payment failed!');
                console.log(event.data);
                break;

        case 'customer.subscription.updated':
            console.log('Subscription updated!');
            console.log(event.data);

            // Handle subscription update logic here
            const updatedSubscription = event.data.object;
            const customerId = updatedSubscription.customer;
            const productId = updatedSubscription.items.data[0].plan.product;
            const planId = updatedSubscription.items.data[0].plan.id;
            const amount = updatedSubscription.items.data[0].plan.amount / 100;  // Convert to dollars/currency
            const status = updatedSubscription.status;
            const endDate = new Date(updatedSubscription.current_period_end * 1000);
            const startDate = new Date(updatedSubscription.start_date * 1000);
            const interval = updatedSubscription.items.data[0].plan.interval;
            const intervalCount = updatedSubscription.items.data[0].plan.interval_count;
            const currency = updatedSubscription.currency;
            const planName = updatedSubscription.items.data[0].plan.nickname;

            // Find any active subscription in the database
            const activeSubscription = await subscriptionModel.findOne({ customerId, status: 'active' });

            if (activeSubscription) {
                // If the subscription in DB has the same plan as the updated Stripe plan, do nothing
                if (
                    activeSubscription.productId === productId &&
                    activeSubscription.priceId === planId &&
                    activeSubscription.amount === amount &&
                    activeSubscription.currency === currency &&
                    activeSubscription.interval === interval &&
                    activeSubscription.intervalCount === intervalCount
                ) {
                    console.log('Active subscription in DB is the same as the updated Stripe plan. No action needed.');
                    return res.send();  // Exit early without making any updates
                }

                // If the subscription in DB has a different plan from the updated Stripe plan, 
                // mark it as inactive and update the plan
                console.log('Active subscription is different from Stripe plan. Marking old plan as inactive.');

                // Update the old active plan to inactive
                await subscriptionModel.updateOne(
                    { _id: activeSubscription._id },
                    {
                        $set: {
                            status: 'inactive',
                            endDate: new Date()
                        }
                    }
                );
            }

            // Save the new active subscription from Stripe to the DB
            const newSubscription = new subscriptionModel({
                customerId,
                productId,
                priceId: planId,
                planName,
                amount,
                currency,
                interval,
                intervalCount,
                status,
                startDate,
                endDate,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Save the new active subscription (Stripe's active plan)
            await newSubscription.save();

            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }


 
    res.status(200).send('Webhook received');
  } catch (err) {
      console.log(`Error verifying webhook signature: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

module.exports = {
    handleWebhook
}
