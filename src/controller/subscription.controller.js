const subscriptionModel = require('../models/subscription.model');
const { validationErrorResponse, successResponse } = require('../utility/response.utility');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function HandleCreateSubscription(req, res) {
    const { planName, amount } = req.body;
    const customerId = req.user?.customerId;


    if (!planName || !amount || !customerId) {

        return validationErrorResponse(res,"error",'Missing required fields',400)
    }

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

      
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: price.id, quantity: 1 }],
            success_url: `http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:3000/payment-failed`,
        });

        const subscriptionData = await subscriptionModel.create({
            customerId,
            productId: product.id,
            priceId: price.id,
            sessionId: session.id,  
            planName: planName,
            amount: price.unit_amount / 100, 
            currency: price.currency,
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
            status: 'pending', 
            startDate: null, 
            endDate: null  
        });

        await subscriptionData.save()
        successResponse(res,session.url,"Success",200)
    } catch (error) {
        console.error('Error creating subscription:', error);
       
        return validationErrorResponse(res,error,'Internal Server Error',500)
    }
}

// async function HandleUpdateDatesOfSUbscription(req,res) {
    
// }

module.exports= {
    HandleCreateSubscription,
   
}