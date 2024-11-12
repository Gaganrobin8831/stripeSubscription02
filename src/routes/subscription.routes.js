
const express = require('express');
const subsciptionrouter = express.Router(); 
const jwt = require('jsonwebtoken'); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

subsciptionrouter.post('/subscribe', async (req, res) => {
    const { planName, amount } = req.body;

    // Validate request body
    if (!planName || !amount) {
        return res.status(400).json({ error: 'Missing required fields: planName or amount' });
    }

    // Extract customer ID from JWT token
    const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1]; // Check if token is in cookie or Authorization header
    if (!token) {
        return res.status(401).json({ error: 'Authorization token is required' });
    }

    let customerId;
    try {
        const decoded = jwt.verify(token, 'YOUR_JWT_SECRET'); // Replace with your actual JWT secret
        customerId = decoded.customerId; // Assuming customerId is stored in the token payload
        if (!customerId) {
            return res.status(400).json({ error: 'Invalid or missing customer ID in token' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const intervalCount = 1;
    if (isNaN(amount) || intervalCount <= 0) {
        return res.status(400).json({ error: 'Invalid amount or duration format' });
    }

    try {
        // Find or create product
        const products = await stripe.products.list({ limit: 100 });
        let product = products.data.find((p) => p.name === planName && p.active);

        if (!product) {
            product = await stripe.products.create({ name: planName });
        }

        // Create a price for the subscription
        const price = await stripe.prices.create({
            unit_amount: parseInt(amount) * 100, // Amount in cents
            currency: 'usd',
            recurring: { interval: 'month', interval_count: intervalCount },
            product: product.id,
        });

        // Create a checkout session for the subscription
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId, // Set customer ID from JWT
            line_items: [
                { price: price.id, quantity: 1 },
            ],
            success_url: `https://subscription-6d1n.onrender.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://subscription-6d1n.onrender.com/payment-failed`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = {
    subsciptionrouter
}