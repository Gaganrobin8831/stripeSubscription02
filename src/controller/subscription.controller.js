const { validationErrorResponse } = require('../utility/response');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


async function HandleCreateSubscription(req,res) {
    const { planName, amount } = req.body;

    // Validate request body
    if (!planName || !amount) {
        
        return validationErrorResponse(res, "error", 'Missing required fields: planName or amount' , 400);
    }

    let customerId;
    
        customerId = req.user.customerId; 

        if (!customerId) {
           
            return validationErrorResponse(res, "error", 'Invalid or missing customer ID in token'  , 400);

        }
   

    const intervalCount = 1;
    if (isNaN(amount) || intervalCount <= 0) {
       
        return validationErrorResponse(res, "error", 'Invalid amount or duration format' , 400);

    }

    try {
       
        const products = await stripe.products.list({ limit: 100 });
        let product = products.data.find((p) => p.name === planName && p.active);

        if (!product) {
            product = await stripe.products.create({ name: planName });
        }

        
        const price = await stripe.prices.create({
            unit_amount: parseInt(amount) * 100, 
            currency: 'usd',
            recurring: { interval: 'month', interval_count: intervalCount },
            product: product.id,
        });

        
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId, 
            line_items: [
                { price: price.id, quantity: 1 },
            ],
            success_url: `https://subscription-6d1n.onrender.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://subscription-6d1n.onrender.com/payment-failed`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating subscription:', error);
       
        return validationErrorResponse(res,error,'Internal Server Error'  , 500);

    }
}

module.exports= {
    HandleCreateSubscription
}