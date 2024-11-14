const subscriptionModel = require('../models/subscription.model');
const { validationErrorResponse, successResponse } = require('../utility/response.utility');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function HandleCreateSubscription(req, res) {
    const { planName, amount } = req.body;
    const customerId = req.user?.customerId;

    if (!planName || !amount || !customerId) {
        return {
            status: "fail",
            message: "Missing required fields",
            error: "validationError"
        };
    }
console.log({ planName, amount })
    const intervalCount = 1;
    try {
        const products = await stripe.products.list({ limit: 100 });
        let product = products.data.find((p) => p.name === planName && p.active);
        if (!product) {
            product = await stripe.products.create({ name: planName });
        }

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
        // console.log(price);
        
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: price.id, quantity: 1 }],
            success_url: `http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:3000/payment-failed`,
        });
// console.log(session);

    

        res.send(session.url)
    } catch (error) {
        console.error('Error creating subscription:', error);
        return {
            status: "fail",
            message: "Error creating subscription",
            error: error.message
        };
    }
}

async function HandleAddDataOfSubscription(req, res) {
    try {
        let { customerId } = req.user;

        
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "No active subscription found",
                error: "error"
            });
        }

        const activeSubscription = subscriptions.data[0];
        console.log(activeSubscription);

       
        const plan = activeSubscription.items.data[0].plan;
        const startDate = activeSubscription.start_date * 1000; 
        const endDate = activeSubscription.current_period_end * 1000; 

        const subscriptionData = {
            customerId: req.user.customerId,
            productId: activeSubscription.items.data[0].price.product, 
            priceId: activeSubscription.items.data[0].price.id, 
            planName: plan.name,
            amount: plan.amount / 100, 
            currency: plan.currency,
            interval: plan.interval,
            intervalCount: plan.interval_count,
            status: activeSubscription.status,
            startDate: startDate, 
            endDate: endDate, 
            createdAt: new Date(), 
            updatedAt: new Date() 
        };

        
        const newSubscription = await subscriptionModel.create(subscriptionData);

        console.log(newSubscription);

        
        return res.status(201).json({
            status: "success",
            message: "Subscription saved successfully",
            data: newSubscription
        });

    } catch (error) {
        console.error('Error saving subscription:', error);
        return res.status(500).json({
            status: "fail",
            message: "Error saving subscription",
            error: error.message
        });
    }
}


module.exports= {
    HandleCreateSubscription,
    HandleAddDataOfSubscription
}