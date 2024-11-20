const User = require('../models/user.models')
const bcrypt = require('bcrypt')
const subscriptionModel = require('../models/subscription.model');
const { createTokenUser } = require('../middleware/validate.middleware');
const { validationErrorResponse, successResponse, errorResponse } = require('../utility/response.utility');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function handleRegister(req, res) {
    const { fullName, emailId, password, countryCode, contactNumber } = req.body;
    try {
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
        // console.log({ fullName, emailId, password, countryCode, contactNumber });

        const newUser = new User({
            fullName: fullName.trim(),
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

        successResponse(res, [], "Registration successful", 200)

    } catch (error) {
        // console.error("Error during registration:", error);
        return errorResponse(res,[error.message],'Internal Server Error',500)
    }
}

async function handleLogin(req, res) {
    const { emailId, password } = req.body;
    try {
        let token

        const user = await User.findOne({ email: emailId });
        if (!user) {
            return validationErrorResponse(res, "error", 'Invalid email or password', 400)
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return validationErrorResponse(res, "error", 'Invalid email or password', 400)
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
        // console.log(error);
        return errorResponse(res,[error.message],'Internal Server Error',500)
    }
}

async function handleGetDetail(req, res) {

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
            const responseData = {
                fullName: name,
                emailId: email,
                contactNumber: `${user.countryCode} ${user.contactNumber}`,
                messageForNull,
                activePlan: [],
                subscriptionHistory: []
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
        // console.error("Error retrieving subscription details:", error);
        return errorResponse(res, [error.message], "Failed to retrieve subscription details", 500);
    }
}

async function handleLogout(req, res) {
    try {

        const { _id } = req.user;
        const user = await User.findById(_id);

        if (!user) {
            return validationErrorResponse(res, "error", "User not found", 404);
        }

        user.token = null;
        await user.save();
        return successResponse(res, {}, "Logout successful", 200);
    } catch (error) {
        // console.error('Logout Error:', error);
        return errorResponse(res, [error.message], 'Internal Server Error', 500)

    }
}

async function handleCustomerUpgrade(req, res) {
    try {
        const { customerId } = req.user;
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.BASE_URL}/`
        })
        // res.send(portalSession.url)
        successResponse(res, portalSession.url, "Success", 200)
    } catch (error) {
        // console.error(error);
        return errorResponse(res, [error.message], 'Internal Server Error', 500)
    }
}

module.exports = {
    handleRegister,
    handleLogin,
    handleGetDetail,
    handleLogout,
    handleCustomerUpgrade

}