const { successResponse, errorResponse } = require('../utility/response.utility');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createcheckOutsession = async (req, res) => {
const {custmorId} = req.user
const { productName,amount} = req.body
    try {
     
        const session = await stripe.checkout.sessions.create({
            customer: custmorId,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: productName || 'Sample Product', 
                    },
                    unit_amount: amount * 100  || 5000,
                },
                quantity: 1,
            }],
            mode: 'payment',
            payment_method_types: ['card'],
            success_url: `https://subscription-5k7x.onrender.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://subscription-5k7x.onrender.com/payment-failed`,
        });
        
        return successResponse(res, session.url, "Success", 200);
    } catch (error) {
        
        return errorResponse(res, [error.message], "Internal Server Error", 500);
    }
};

module.exports = {
    createcheckOutsession
}