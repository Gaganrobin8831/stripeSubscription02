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
    
        // Fetch active subscription from Stripe
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });
    
        console.log(subscriptions);
    
        // Check if no active subscriptions were found
        if (subscriptions.data.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "No active subscription found",
                error: "error"
            });
        }
    
        // Get the first active subscription
        const activeSubscription = subscriptions.data[0];
    
        // Access the subscription item and price details
        const subscriptionItem = activeSubscription.items.data[0]; // First subscription item
        const price = subscriptionItem.price;  // Price associated with the subscription item
    
        // The plan details are inside the price object, not separately under plan
        const planName = price.nickname || price.product;  // Use nickname if available, otherwise use the product ID
        const amount = price.unit_amount / 100; // Convert from cents to dollars
        const currency = price.currency; 
        const interval = price.recurring.interval;  // Interval (e.g., 'month', 'year')
        const intervalCount = price.recurring.interval_count || 1;  // Default to 1 if not available
    
        // Convert start and end dates from Unix timestamps (seconds) to milliseconds
        const startDate = activeSubscription.start_date * 1000;
        const endDate = activeSubscription.current_period_end * 1000;
    
        // Fetch the product details using the productId from price
        const product = await stripe.products.retrieve(price.product); // Retrieve the product object
    
        // Prepare the subscription data to be saved in the database
        const subscriptionData = {
            customerId: req.user.customerId,
            productId: product.id,  // The product ID from the product object
            priceId: price.id,      // The price ID
            planName: planName,     // Plan name (could be nickname or product ID if nickname is not set)
            amount: amount,         // Subscription amount
            currency: currency,     // Currency
            interval: interval,     // Interval (e.g., 'month')
            intervalCount: intervalCount, // Interval count (e.g., 1 month, 12 months)
            status: activeSubscription.status, // Subscription status (e.g., 'active')
            startDate: startDate,   // Start date of subscription
            endDate: endDate,       // End date of subscription
            productName: product.name, // Product name
            productDescription: product.description, // Product description
            createdAt: new Date(),  // Timestamp when this data is saved
            updatedAt: new Date()   // Timestamp of the last update
        };
    
        // Save the subscription data to the database
        const newSubscription = await subscriptionModel.create(subscriptionData);
    
        console.log(newSubscription);
    
        // Return success response
        return res.status(201).json({
            status: "success",
            message: "Subscription saved successfully",
            data: "Subscription saved successfully"
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