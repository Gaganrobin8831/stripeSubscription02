const subscriptionModel = require('../models/subscription.model');
const { validationErrorResponse, successResponse, errorResponse } = require('../utility/response.utility');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


async function handleCreateSubscription(req, res) {
    const { productId } = req.body;  // Now getting productId from the request body
    const customerId = req.user?.customerId;

    if (!productId || !customerId) {
        return res.status(400).json({
            status: "fail",
            message: "Missing required fields",
            error: "validationError"
        });
    }

    try {
        // Fetch the product by productId
        const product = await stripe.products.retrieve(productId);
        if (!product || !product.active) {
            return res.status(404).json({
                status: "fail",
                message: "Product not found or inactive",
                error: "productNotFound"
            });
        }

        // Fetch prices associated with the product
        const prices = await stripe.prices.list({ product: product.id, limit: 100 });
        const activePrice = prices.data.find(p => p.recurring?.interval === 'month' && p.active);

        if (!activePrice) {
            return res.status(404).json({
                status: "fail",
                message: "No active price found for the product",
                error: "priceNotFound"
            });
        }

        // Create a subscription session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: activePrice.id, quantity: 1 }],
            success_url: `https://subscription-5k7x.onrender.com/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://subscription-5k7x.onrender.com/payment-failed`,
        });

        res.json({
            status: "success",
            sessionUrl: session.url
        });

    } catch (error) {
        console.error('Error creating subscription:', error);
        return res.status(500).json({
            status: "fail",
            message: "Error creating subscription",
            error: error.message
        });
    }
}


async function handleAddDataOfSubscription(req, res) {
    try {
        let { customerId } = req.user;
        console.log(req.user)
    
       
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });
    
        console.log(subscriptions);
    
        
        if (subscriptions.data.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "No active subscription found",
                error: "error"
            });
        }
    
     
        const activeSubscription = subscriptions.data[0];
    
       
        const subscriptionItem = activeSubscription.items.data[0];
        const price = subscriptionItem.price;  
    

          
        const amount = price.unit_amount / 100; 
        const currency = price.currency; 
        const interval = price.recurring.interval;  
        const intervalCount = price.recurring.interval_count || 1; 
    
      
        const startDate = activeSubscription.start_date * 1000;
        const endDate = activeSubscription.current_period_end * 1000;
    
        
        const product = await stripe.products.retrieve(price.product); 
    
       const userdetailOfSubscription = await subscriptionModel.findOne({customerId})

       if(!userdetailOfSubscription){
       
        const subscriptionData = {
            customerId: req.user.customerId,
            productId: product.id,  
            priceId: price.id,     
            planName: product.name,    
            amount: amount,         
            currency: currency,     
            interval: interval,     
            intervalCount: intervalCount, 
            status: activeSubscription.status, 
            startDate: startDate,   
            endDate: endDate,       
            productName: product.name, 
            productDescription: product.description, 
            createdAt: new Date(),  
            updatedAt: new Date()   
        };
    
       
        
        const newSubscription = await subscriptionModel.create(subscriptionData);
        console.log(newSubscription)
       }
        
    
        
    
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

async function handleProductsData(req, res) {
    try {
        const products = await stripe.products.list({ limit: 100 });
     
        const plans = await Promise.all(products.data.filter((product) => product.active === true && product.default_price).map(async (product) => {
            try {
              
                const price = await stripe.prices.retrieve(product.default_price);
              
                return {
                    productId:product.id,
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
        
 
        console.log("Valid Plans:", validPlans);

        res.json({ plans: validPlans });

    } catch (error) {
        console.error("Error fetching products:", error);
        
        return errorResponse(res,"Error","Failed to fetch products",500)
    }
}


module.exports= {
    handleCreateSubscription,
    handleAddDataOfSubscription,
    handleProductsData
}