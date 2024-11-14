const subscriptionModel = require('../models/subscription.model');
const { validationErrorResponse } = require('../utility/response');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function HandleCreateSubscription(req, res) {
    const { planName, amount } = req.body;
    const customerId = req.user?.customerId;

    // Validate required fields
    if (!planName || !amount || !customerId) {
        return validationErrorResponse(res, "error", "Missing required fields", 400);
    }

    const intervalCount = 1;

    try {
        // Check if product with given planName exists or create a new one
        const products = await stripe.products.list({ limit: 100 });
        let product = products.data.find((p) => p.name === planName && p.active);
        if (!product) {
            product = await stripe.products.create({ name: planName });
        }

        // Check if price exists with given amount and interval or create a new one
        const prices = await stripe.prices.list({ product: product.id, limit: 100 });
        let price = prices.data.find(
            (p) => p.unit_amount === parseInt(amount) * 100 && p.recurring?.interval === 'month'
        );
        if (!price) {
            price = await stripe.prices.create({
                unit_amount: parseInt(amount) * 100,
                currency: 'usd',
                recurring: { interval: 'month', interval_count: intervalCount },
                product: product.id,
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: price.id, quantity: 1 }],
            success_url: `https://yourdomain.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://yourdomain.com/payment-failed`,
        });

        // Save subscription details to database
        const subscription = new subscriptionModel({
            customerId,
            productId: product.id,
            priceId: price.id,
            subscriptionId: session.subscription || "pending",  
            planName,
            amount: parseInt(amount) * 100,
            currency: 'usd',
            interval: 'month',
            intervalCount,
            status: 'pending',  
            startDate: new Date(),
        });

        await subscription.save();

        // Send the session URL for checkout
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating subscription:', error);
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}

module.exports = { HandleCreateSubscription };

module.exports= {
    HandleCreateSubscription
}