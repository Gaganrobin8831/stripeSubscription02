const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const subscriptionModel = require('../models/subscription.model');
const { errorResponse } = require('../utility/response.utility');
const Payment = require('../models/payment.model');

async function handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body;

    try {
        const event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET_KEY
        );

        switch (event.type) {
            case 'invoice.payment_failed':
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                const customerId = updatedSubscription.customer;
                const productId = updatedSubscription.items.data[0].plan.product;
                const planId = updatedSubscription.items.data[0].plan.id;
                const amount = updatedSubscription.items.data[0].plan.amount / 100;
                const status = updatedSubscription.status;
                const endDate = new Date(updatedSubscription.current_period_end * 1000);
                const startDate = new Date(updatedSubscription.start_date * 1000);
                const interval = updatedSubscription.items.data[0].plan.interval;
                const intervalCount = updatedSubscription.items.data[0].plan.interval_count;
                const currency = updatedSubscription.currency;
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
                        isSamePlan = true;
                        break;
                    }
                }

                if (!isSamePlan) {
                    await subscriptionModel.updateMany(
                        { customerId, status: 'active' },
                        {
                            $set: {
                                status: 'inactive',
                                endDate: new Date()
                            }
                        }
                    );

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
                }
                break;

            case 'checkout.session.completed':
                const session = event.data.object;
                
              
                if (session.subscription) {
                  
                    break;
                }

                try {
                    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                        expand: ['data.price.product'],
                    });

                    const productName = lineItems.data[0]?.description || 'Unknown Product';

                    const payment = new Payment({
                        customerId: session.customer,
                        sessionId: session.id,
                        paymentIntentId: session.payment_intent,
                        amount: session.amount_total,
                        currency: session.currency,
                        paymentStatus: session.payment_status,
                        productName: productName,
                    });

                    await payment.save();
                } catch (error) {
                    console.error('Error saving payment:', error.message);
                    return res.status(500).send('Internal Server Error');
                }
                break;

            default:
                break;
        }

        res.status(200).send('Webhook received');
    } catch (err) {
        return errorResponse(res, [err.message], 'Webhook Error', 500);
    }
}

module.exports = {
    handleWebhook
}
