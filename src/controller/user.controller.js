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

async function handleRegister(req, res) {
    const { fullName, emailId, password, countryCode, contactNumber } = req.body;

    

    try {
      
        if (!isValidEmail(emailId)) {
            return validationErrorResponse(res, "error", "Enter a valid email", 409);
        }

        
        if (!fullName || !emailId || !password || !countryCode || !contactNumber) {
            return validationErrorResponse(res, "error", "Enter fullName, email Id, password, and role", 409);
        }

       
        const existingUser = await User.findOne({ email: emailId });
        if (existingUser) {
           
            if (existingUser.custmorStripeId) {
                return validationErrorResponse(res, "error", "User already registered with a Stripe account", 409);
            } else {
                let error = "Already Registered";
                let message = 'You already have an account. Please login';
                return validationErrorResponse(res, error, message, 409);
            }
        }

        
        const hashedPassword = await bcrypt.hash(password, 10);

       
        const newUser = new User({
            fullName: fullName,
            email: emailId,
            password: hashedPassword,
            contactNumber,
            countryCode
        });

        
        const stripeCustomer = await stripe.customers.create({
            email: emailId,
            name: fullName,
        });

        newUser.custmorStripeId = stripeCustomer.id;
        await newUser.save();


        return res.status(200).json({ message: "Registration successful" });

    } catch (error) {
        console.error("Error during registration:", error);
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}

async function handleLogin(req, res) {
    const { emailId, password } = req.body;
    try {
        if (isValidEmail(emailId) == false) {
            return validationErrorResponse(res, "error", "Enter Valid Email", 409)
        }

        if (!emailId || !password) {
            return validationErrorResponse(res, "error", "Enter email passeord ", 409)
        }
        let token

        const user = await User.findOne({ email: emailId });
        if (!user) {
            return validationErrorResponse(res, "error", 'Invalid email or password', 400)
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return validationErrorResponse(res, error, 'Invalid email or password', 400)
        }


        token = createTokenUser(user);


        
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
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}


// async function handleGetDetail(req, res) {
//     const token = req.headers.authorization?.split(' ')[1];

//     if (!token) {
//         return validationErrorResponse(res, "error", "Unauthorized", 401);
//     }

//     try {
//         const { _id, customerId, name, email } = req.user;


//         const user = await User.findById(_id);
//         if (!user) {
//             return validationErrorResponse(res, "error", "User not found", 400);
//         }


//         const subscriptions = await stripe.subscriptions.list({
//             customer: customerId,
//             status: 'active',
//             limit: 1
//         });

//         let messageForNull;
//         if (subscriptions.data.length === 0) {
//             messageForNull = "No active subscription found";


//             const subscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });


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

//         const activePlanDetails = {
//             planName: productDetails.name,
//             amount: plan.amount / 100,
//             currency: plan.currency,
//             interval: plan.interval,
//             intervalCount: plan.interval_count,
//             startDate: new Date(activeSubscription.start_date * 1000).toISOString(),
//             endDate: new Date(activeSubscription.current_period_end * 1000).toISOString(),
//             productId: plan.product
//         };


//         const subscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });


//         const dbActiveSubscription = await subscriptionModel.findOne({ customerId, status: 'active' });


//         if (dbActiveSubscription) {
//             const activePlanFromStripe = activeSubscription.items.data[0].plan;
//             const amountFromStripe = activePlanFromStripe.amount / 100;
//             const planMatches = (
//                 dbActiveSubscription.amount === amountFromStripe &&
//                 dbActiveSubscription.currency === activePlanFromStripe.currency &&
//                 dbActiveSubscription.interval === activePlanFromStripe.interval &&
//                 dbActiveSubscription.intervalCount === activePlanFromStripe.interval_count &&
//                 dbActiveSubscription.productId === activePlanFromStripe.product
//             );


//             if (planMatches) {
//                 return successResponse(res, {
//                     fullName: user.fullName,
//                     emailId: user.email,
//                     contactNumber: `${user.countryCode} ${user.contactNumber}`,
//                     activePlan: activePlanDetails,
//                     subscriptionHistory: subscriptionHistory.map(sub => ({
//                         id: sub.id,
//                         planName: sub.planName,
//                         amount: sub.amount,
//                         currency: sub.currency,
//                         interval: sub.interval,
//                         intervalCount: sub.intervalCount,
//                         status: sub.status,
//                         startDate: sub.startDate.toISOString(),
//                         endDate: sub.endDate ? sub.endDate.toISOString() : null
//                     }))
//                 }, "User and Subscription Details", 200);
//             }


//             await subscriptionModel.updateOne(
//                 { _id: dbActiveSubscription._id },
//                 { $set: { status: 'inactive' } }
//             );
//         }


//         const dbExistingSubscription = await subscriptionModel.findOne({
//             customerId,
//             productId: activePlanDetails.productId,
//             priceId: activeSubscription.items.data[0].plan.id,
//             status: 'active'
//         });


//         if (!dbExistingSubscription) {
//             const newSubscription = new subscriptionModel({
//                 customerId,
//                 productId: activePlanDetails.productId,
//                 priceId: activeSubscription.items.data[0].plan.id,
//                 planName: productDetails.name,
//                 amount: activePlanDetails.amount,
//                 currency: activePlanDetails.currency,
//                 interval: activePlanDetails.interval,
//                 intervalCount: activePlanDetails.intervalCount,
//                 status: 'active',
//                 startDate: new Date(activeSubscription.start_date * 1000),
//                 endDate: new Date(activeSubscription.current_period_end * 1000),
//                 createdAt: new Date(),
//                 updatedAt: new Date()
//             });


//             await newSubscription.save();
//         }

//         const updatedSubscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });

//         const responseData = {
//             fullName: user.fullName,
//             emailId: user.email,
//             contactNumber: `${user.countryCode} ${user.contactNumber}`,
//             activePlan: activePlanDetails,
//             subscriptionHistory: updatedSubscriptionHistory.map(sub => ({
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


async function handleGetDetail(req, res) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return validationErrorResponse(res, "error", "Unauthorized", 401);
    }

    try {
        const { _id, customerId, name, email } = req.user;

        const user = await User.findById(_id);
        if (!user) {
            return validationErrorResponse(res, "error", "User not found", 400);
        }

        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });

        let messageForNull;
        if (subscriptions.data.length === 0) {
            messageForNull = "No active subscription found";

            const subscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });

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

        const activeSubscription = subscriptions.data[0];
        const plan = activeSubscription.items.data[0].plan;
        const productDetails = await stripe.products.retrieve(plan.product);

        const activePlanDetails = {
            planName: productDetails.name,
            amount: plan.amount / 100,
            currency: plan.currency,
            interval: plan.interval,
            intervalCount: plan.interval_count,
            startDate: new Date(activeSubscription.start_date * 1000).toISOString(),
            endDate: new Date(activeSubscription.current_period_end * 1000).toISOString(),
            productId: plan.product
        };

        const subscriptionHistory = await subscriptionModel.find({ customerId }).sort({ createdAt: -1 });

        const responseData = {
            fullName: user.fullName,
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
        };

        return successResponse(res, responseData, "User and Subscription Details", 200);

    } catch (error) {
        console.error("Error retrieving subscription details:", error);
        return validationErrorResponse(res, "error", "Failed to retrieve subscription details", 500);
    }
}


async function handleLogout(req, res) {
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

async function handleCustomerUpgrade(req, res) {
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

    } catch (error) {
        // console.error('Logout Error:', error);
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}

module.exports = {
    handleRegister,
    handleLogin,
    handleGetDetail,
    handleLogout,
    handleCustomerUpgrade

}