const User = require('../models/user.models')
const bcrypt = require('bcrypt')
const subscriptionModel = require('../models/subscription.model');
const { createTokenUser } = require('../middleware/validate.middleware');
const { validationErrorResponse, successResponse } = require('../utility/response.utility');
const jwt = require('jsonwebtoken')

const validator = require('validator');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


function isValidEmail(email) {
    return validator.isEmail(email);
}

async function HandleRegister(req, res) {
    const { fullName, emailId, password, countryCode, contactNumber } = req.body;

    // console.log({ fullName, emailId, password, countryCode, contactNumber });

    try {
        // Validate email format
        if (!isValidEmail(emailId)) {
            return validationErrorResponse(res, "error", "Enter a valid email", 409);
        }

        // Validate required fields
        if (!fullName || !emailId || !password || !countryCode || !contactNumber) {
            return validationErrorResponse(res, "error", "Enter fullName, email Id, password, and role", 409);
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email: emailId });
        if (existingUser) {
            // Check if the user already has a Stripe customer ID
            if (existingUser.custmorStripeId) {
                return validationErrorResponse(res, "error", "User already registered with a Stripe account", 409);
            } else {
                let error = "Already Registered";
                let message = 'You already have an account. Please login';
                return validationErrorResponse(res, error, message, 409);
            }
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            FullName: fullName,
            email: emailId,
            password: hashedPassword,
            contactNumber,
            countryCode
        });

        // Create Stripe customer
        const stripeCustomer = await stripe.customers.create({
            email: emailId,
            name: fullName,
        });

        // Attach Stripe customer ID to user record and save user
        newUser.custmorStripeId = stripeCustomer.id;
        await newUser.save();

        // Respond with success message
      
        return res.status(200).json({ message: "Registration successful" });

        // return { status: "success", message: "Registration updated successfully" };
    } catch (error) {
        console.error("Error during registration:", error);
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}

async function HandleLogin(req, res) {
    const { emailId, password } = req.body;
    try {
        if (isValidEmail(emailId) == false) {
            return validationErrorResponse(res, "error", "Enter Valid Email", 409)
        }

        if (!emailId || !password) {
            return validationErrorResponse(res, "error", "Enter email passeord ", 409)
        }
        let token

        const user = await User.findOne({ email:emailId });
        if (!user) {
            return validationErrorResponse(res, "error", 'Invalid email or password', 400)
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return validationErrorResponse(res, error, 'Invalid email or password', 400)
        }


        token = createTokenUser(user);


        // Save token to user document if needed
        user.token = token;
        await user.save();

        res.cookie('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        let data = {
            emailId,
          
            token
        }

        return successResponse(res, data, "Login Success", 200)
    } catch (error) {
        console.log(error);
        return validationErrorResponse(res,error,'Internal Server Error'  , 500);
    }
}


async function HandleGetDetail(req, res) {
    const token = req.headers.authorization?.split(' ')[1]; // Get token from header
    if (!token) {
        return validationErrorResponse(res, "error", "Unauthorized", 401); // If no token is found, return Unauthorized
    }

    try {
        const { _id, customerId, name, email } = req.user;

        // Fetch user from the database
        const user = await User.findById(_id);
        if (!user) {
            return validationErrorResponse(res, "error", "User not found", 400); // If user does not exist, return error
        }

        // Fetch active subscription from Stripe
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });

        // Handle case if no active subscription is found in Stripe
        let messageForNull;
        if (subscriptions.data.length === 0) {
            messageForNull = "No active subscription found";

            // Fetch the user's subscription history from the database
            const subscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });

            // Format response data
            const responseData = {
                fullName: name,
                emailId: email,
                contactNumber: `${user.countryCode} ${user.contactNumber}`,
                messageForNull,
                activePlan: [],
                subscriptionHistory: subscriptionHistory.map(sub => ({
                    id: sub.id,
                    planName: sub.planName,
                    amount: sub.amount,
                    currency: sub.currency,
                    interval: sub.interval,
                    intervalCount: sub.intervalCount,
                    status: sub.status,
                    startDate: sub.startDate.toISOString(),
                    endDate: sub.endDate ? sub.endDate.toISOString() : null
                }))
            };

            return successResponse(res, responseData, "User and Subscription Details", 200);
        }

        // Get the active plan details from Stripe
        const activeSubscription = subscriptions.data[0];
        const plan = activeSubscription.items.data[0].plan;
        const productDetails = await stripe.products.retrieve(plan.product);

        const activePlanDetails = {
            planName: productDetails.name,
            amount: plan.amount / 100, // Convert from cents to dollars
            currency: plan.currency,
            interval: plan.interval,
            intervalCount: plan.interval_count,
            startDate: new Date(activeSubscription.start_date * 1000).toISOString(),
            endDate: new Date(activeSubscription.current_period_end * 1000).toISOString(),
            productId: plan.product
        };

        // Fetch user's subscription history
        const subscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });

        // Check if there is an active subscription in the DB
        const dbActiveSubscription = await subscriptionModel.findOne({ customerId, status: 'active' });

        // Compare the active subscription in the DB with Stripe's active subscription
        if (dbActiveSubscription) {
            const activePlanFromStripe = activeSubscription.items.data[0].plan;
            const amountFromStripe = activePlanFromStripe.amount / 100;
            const planMatches = (
                dbActiveSubscription.amount === amountFromStripe &&
                dbActiveSubscription.currency === activePlanFromStripe.currency &&
                dbActiveSubscription.interval === activePlanFromStripe.interval &&
                dbActiveSubscription.intervalCount === activePlanFromStripe.interval_count &&
                dbActiveSubscription.productId === activePlanFromStripe.product
            );

            // If the active plans are the same, no need to create a new subscription
            if (planMatches) {
                return successResponse(res, {
                    fullName: user.FullName,
                    emailId: user.email,
                    contactNumber: `${user.countryCode} ${user.contactNumber}`,
                    activePlan: activePlanDetails,
                    subscriptionHistory: subscriptionHistory.map(sub => ({
                        id: sub.id,
                        planName: sub.planName,
                        amount: sub.amount,
                        currency: sub.currency,
                        interval: sub.interval,
                        intervalCount: sub.intervalCount,
                        status: sub.status,
                        startDate: sub.startDate.toISOString(),
                        endDate: sub.endDate ? sub.endDate.toISOString() : null
                    }))
                }, "User and Subscription Details", 200);
            }

            // If the active plans are different, update the active plan
            // Mark previous active subscription as inactive
            await subscriptionModel.updateOne(
                { _id: dbActiveSubscription._id },
                { $set: { status: 'inactive' } }
            );
        }

        // Check if there is an existing active subscription with the same plan details
        const dbExistingSubscription = await subscriptionModel.findOne({
            customerId,
            productId: activePlanDetails.productId,
            priceId: activeSubscription.items.data[0].plan.id,
            status: 'active'
        });

        // If no existing active subscription, create a new one
        if (!dbExistingSubscription) {
            const newSubscription = new subscriptionModel({
                customerId,
                productId: activePlanDetails.productId,
                priceId: activeSubscription.items.data[0].plan.id,
                planName: productDetails.name,
                amount: activePlanDetails.amount,
                currency: activePlanDetails.currency,
                interval: activePlanDetails.interval,
                intervalCount: activePlanDetails.intervalCount,
                status: 'active',
                startDate: new Date(activeSubscription.start_date * 1000),
                endDate: new Date(activeSubscription.current_period_end * 1000),
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Save the new subscription
            await newSubscription.save();
        }

        // Fetch the updated subscription history after saving the new active subscription
        const updatedSubscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });

        // Format response data
        const responseData = {
            fullName: user.FullName,
            emailId: user.email,
            contactNumber: `${user.countryCode} ${user.contactNumber}`,
            activePlan: activePlanDetails,
            subscriptionHistory: updatedSubscriptionHistory.map(sub => ({
                id: sub.id,
                planName: sub.planName,
                amount: sub.amount,
                currency: sub.currency,
                interval: sub.interval,
                intervalCount: sub.intervalCount,
                status: sub.status,
                startDate: sub.startDate.toISOString(),
                endDate: sub.endDate ? sub.endDate.toISOString() : null
            }))
        };

        return successResponse(res, responseData, "User and Subscription Details", 200);

    } catch (error) {
        console.error("Error retrieving subscription details:", error);
        return validationErrorResponse(res, "error", "Failed to retrieve subscription details", 500);
    }
}

// async function HandleGetDetail(req, res) {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//         return validationErrorResponse(res, "error", "Unauthorized", 401);
//     }

//     try {
        
//        const {_id,customerId,name,email} = req.user
//     //    console.log({_id,customerId});
       
//         const user = await User.findById(_id);

//         if (!user) {
//             return validationErrorResponse(res, "error", "User not registered", 400);
//         }

        
//         const subscriptions = await stripe.subscriptions.list({
//             customer: customerId,
//             status: 'active', 
//             limit: 1 
//         });
//         // console.log(subscriptions.data);

//         let messageForNull
//         if (subscriptions.data.length == 0) {
//             messageForNull = "No Data"
//             const subscriptionHistory = await subscriptionModel.find({ customerId: customerId}).sort({ createdAt: -1 });
//             const responseData = {
//                 fullName: name,
//                 emailId: email,
//                 contactNumber: `${user.countryCode} ${user.contactNumber}`,
//                 messageForNull,
//                 activePlan: [], 
//                 subscriptionHistory: subscriptionHistory.map(sub => ({
//                     id: sub.id,
//                     planName: sub.planName,
//                     amount: sub.amount,
//                     currency: sub.currency,
//                     interval: sub.interval,
//                     intervalCount: sub.intervalCount,
//                     status: sub.status,
//                     startDate: sub.startDate.toISOString(),
//                     endDate: sub.endDate ? sub.endDate.toISOString() : null
//                 }))
//             };
    
//             return successResponse(res, responseData, "User and Subscription Details", 200);
       
//         }

//         const activeSubscription = subscriptions.data[0];
//         const plan = activeSubscription.items.data[0].plan;
//         const productDetails = await stripe.products.retrieve(plan.product);

//     // console.log(productDetails.name);
   
    
//         const activePlanDetails = {
//             planName: productDetails.name, 
//             amount: plan.amount / 100, 
//             currency: plan.currency,
//             interval: plan.interval,
//             intervalCount: plan.interval_count,
//             startDate: new Date(activeSubscription.start_date * 1000).toISOString(),
//             endDate: new Date(activeSubscription.current_period_end * 1000).toISOString()
//         };

    
//         const subscriptionHistory = await subscriptionModel.find({ customerId: customerId}).sort({ createdAt: -1 });

//         const dbActiveSubscription = await subscriptionModel.findOne({ customerId: customerId,status:"active"});
//         // console.log({dbActiveSubscription});
        
//         if (dbActiveSubscription) {
//             const activePlanFromStripe = activeSubscription.items.data[0].plan;
            
//             const amountFromStripe = activePlanFromStripe.amount / 100; 

//             if (
//                 dbActiveSubscription.amount !== amountFromStripe
//             ) {
//                 await subscriptionModel.updateOne(
//                     { _id: dbActiveSubscription._id },
//                     { $set: { status: 'pending' } }
//                 );

//                 const newSubscription = new subscriptionModel({
//                     customerId: customerId,
//                     productId: activePlanFromStripe.product,
//                     priceId: activePlanFromStripe.id,
//                     planName: productDetails.name,
//                     amount: amountFromStripe,
//                     currency: activePlanFromStripe.currency,
//                     interval: activePlanFromStripe.interval,
//                     intervalCount: activePlanFromStripe.interval_count,
//                     status: 'active',
//                     startDate: new Date(activeSubscription.start_date * 1000),
//                     endDate: new Date(activeSubscription.current_period_end * 1000),
//                     createdAt: new Date(),
//                     updatedAt: new Date()
//                 });
//                 console.log(newSubscription);
                
//                 await newSubscription.save();  
//             }
//         } 

//         const responseData = {
//             fullName: user.FullName,
//             emailId: user.email,
//             contactNumber: `${user.countryCode} ${user.contactNumber}`,
//             messageForNull,
//             activePlan: activePlanDetails, 
//             messageForNull:null,
//             subscriptionHistory: subscriptionHistory.map(sub => ({
//                 id: sub.id,
//                 planName: sub.planName,
//                 amount: sub.amount,
//                 currency: sub.currency,
//                 interval: sub.interval,
//                 intervalCount: sub.intervalCount,
//                 status: sub.status,
//                 startDate: sub.startDate.toISOString(),
//                 endDate: sub.endDate ? sub.endDate.toISOString() : null
//             }))
//         };

//         return successResponse(res, responseData, "User and Subscription Details", 200);

//     } catch (error) {
//         console.error("Error retrieving subscription details:", error);
//         return validationErrorResponse(res, "error", "Failed to retrieve subscription details", 500);
//     }
// }

async function HandleLogout(req,res) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return validationErrorResponse(res, "error", "Unauthorized", 401);
        }
        const decoded = jwt.verify(token, process.env.secret);
        const user = await User.findById(decoded._id);
        if (!user) {
            return validationErrorResponse(res, "error", "User not found", 404);
        }

        user.token = null;
        await user.save();
        return successResponse(res, {}, "Logout successful", 200);
    } catch (error) {
        console.error('Logout Error:', error);
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}

async function HandleCustomerUpgrade(req,res) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
       
        
        if (!token) {
            return validationErrorResponse(res, "error", "Unauthorized", 401);
        }
        const decoded = jwt.verify(token, process.env.secret);
        // console.log(decoded.customerId);
        
    
        
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: decoded.customerId,
            return_url: `${process.env.BASE_URL}/`
        })
    res.send(portalSession.url)
        // res.redirect(portalSession.url)
    } catch (error) {
        // console.error('Logout Error:', error);
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}

module.exports = {
    HandleRegister,
    HandleLogin,
    HandleGetDetail,
    HandleLogout,
    HandleCustomerUpgrade

}