const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const subscriptionModel = require('../models/subscription.model');

async function handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body;
    try {
        const event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET_KEY
        );

        console.log('Received event:', event.type);

        switch (event.type) {
            case 'invoice.payment_failed':
                // console.log('Invoice payment failed!');
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                customerId = updatedSubscription.customer;
                const productId = updatedSubscription.items.data[0].plan.product;
                const planId = updatedSubscription.items.data[0].plan.id;
                const amount = updatedSubscription.items.data[0].plan.amount / 100;
                const status = updatedSubscription.status;
                const endDate = new Date(updatedSubscription.current_period_end * 1000);
                const startDate = new Date(updatedSubscription.start_date * 1000);
                const interval = updatedSubscription.items.data[0].plan.interval;
                const intervalCount = updatedSubscription.items.data[0].plan.interval_count;
                const currency = updatedSubscription.currency;
                // const planName = updatedSubscription.items.data[0].plan.nickname;
                const product = await stripe.products.retrieve(productId);
                const planName = product.name;

                const activeSubscriptions = await subscriptionModel.find({ customerId, status: 'active' });

                let isSamePlan = false;

                for (const activeSubscription of activeSubscriptions) {
                    if (
                        activeSubscription.productId === productId &&
                        activeSubscription.priceId === planId &&
                        activeSubscription.amount === amount &&
                        activeSubscription.currency === currency &&
                        activeSubscription.interval === interval &&
                        activeSubscription.intervalCount === intervalCount
                    ) {
                        console.log('Matching active subscription found in DB. No action needed.');
                        isSamePlan = true;
                        break;
                    }
                }

                if (!isSamePlan) {

                    console.log('Marking old active subscriptions as inactive...');
                    await subscriptionModel.updateMany(
                        { customerId, status: 'active' },
                        {
                            $set: {
                                status: 'inactive',
                                endDate: new Date()
                            }
                        }
                    );

                    console.log('Saving new active subscription...');
                    const newSubscription = new subscriptionModel({
                        customerId,
                        productId,
                        priceId: planId,
                        planName,
                        amount,
                        currency,
                        interval,
                        intervalCount,
                        status: 'active',
                        startDate,
                        endDate,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    await newSubscription.save();
                    console.log('New subscription saved successfully.');
                }
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
