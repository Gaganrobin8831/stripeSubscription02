const subscriptionModel = require('../models/subscription.model');
const { validationErrorResponse, successResponse, errorResponse } = require('../utility/response.utility');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


async function handleCreateSubscription(req, res) {
    const { productId } = req.body;
    const customerId = req.user?.customerId;
    productId.split(':')[0]
    if (!productId || !customerId) {
        return validationErrorResponse(res, [], "Missing required fields", 400)
    }
    try {
        const product = await stripe.products.retrieve(productId);
        if (!product || !product.active) {
            return validationErrorResponse(res, [], "Product not found or inactive", 400)
        }


        const prices = await stripe.prices.list({ product: product.id, limit: 100 });
        const activePrice = prices.data.find(p => p.recurring?.interval === 'month' && p.active);

        if (!activePrice) {
            return validationErrorResponse(res, [], "No active price found for the product", 404)
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: activePrice.id, quantity: 1 }],
            success_url: `https://subscription-5k7x.onrender.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://subscription-5k7x.onrender.com/payment-failed`,
        });

        
    return successResponse(res,session.url,"Success",200)
    } catch (error) {
        console.error('Error creating subscription:', error);
        return errorResponse(res,[error.message],"Error creating subscription",500)
      
    }
}

async function handleProductsData(req, res) {
    try {
        const products = await stripe.products.list({ limit: 100 });

        const plans = await Promise.all(products.data.filter((product) => product.active === true && product.default_price).map(async (product) => {
            try {
                const price = await stripe.prices.retrieve(product.default_price);
                return {
                    productId: product.id,
                    title: product.name,
                    price: price.unit_amount / 100,
                    description: product.description,
                    isPopular: product.metadata.isPopular === 'true',
                    features: product.marketing_features ? product.marketing_features.map(feature => feature.name) : []
                };
            } catch (priceError) {
                console.error(`Error retrieving price for product ${product.id}:`, priceError);
                return null;
            }
        }));
        const validPlans = plans.filter(plan => plan !== null);
        // console.log("Valid Plans:", validPlans);

        // res.json({ plans: validPlans });
        successResponse(res, validPlans, "Success", 200)

    } catch (error) {
        // console.error("Error fetching products:", error);
        return errorResponse(res,[error.message],"Failed to fetch products",500)
    }
}


module.exports = {
    handleCreateSubscription,

    handleProductsData
}