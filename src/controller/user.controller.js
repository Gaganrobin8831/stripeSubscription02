const User = require('../models/user.models')
const bcrypt = require('bcrypt')

const { createTokenUser } = require('../middleware/validate');
const { validationErrorResponse, successResponse } = require('../utility/response');
const jwt = require('jsonwebtoken')

const validator = require('validator');
const subscriptionModel = require('../models/subscription.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


function isValidEmail(email) {
    return validator.isEmail(email);
}

async function HandleRegister(req, res) {
    const { fullName, emailId, password, countryCode, contactNumber } = req.body;

    console.log({ fullName, emailId, password, countryCode, contactNumber });

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
        return successResponse(res, newUser, "Registration successful", 200);

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

// async function HandleGetDetail(req,res) {
//     try {
//         const user = await User.findById(req.user._id);
//         if (!user) {
//             return validationErrorResponse(res, "error", "User not registered", 400);
//         }

        
         
//          const subscriptions = await stripe.subscriptions.list({
//             customer: req.user.customerId,
//             status: 'active',
//             limit: 1
//         });

//         const activeSubscription = subscriptions.data[0];
//         if (!activeSubscription) {
//             return validationErrorResponse(res, "error", "No active subscription found", 404);
//         }


//        console.log(activeSubscription);
       
//         const responseData = {
//             fullName: user.FullName,
//             emailId: user.email,
//             contactNumber: `${user.countryCode} ${user.contactNumber}`,
//             activePlan: {
//                 planName: activeSubscription.planName,
//                 amount: activeSubscription.amount / 100, 
//                 currency: activeSubscription.currency,
//                 interval: activeSubscription.interval,
//                 intervalCount: activeSubscription.intervalCount,
//                 startDate: activeSubscription.startDate,
//                 endDate: activeSubscription.endDate
//             }
//         };

//         return successResponse(res, responseData, "User and Subscription Details", 200);

//     } catch (error) {
//         console.error('Error retrieving user details:', error);
//         return validationErrorResponse(res, error, 'Internal Server Error', 500);
//     }

// }

async function HandleGetDetail(req, res) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return validationErrorResponse(res, "error", "Unauthorized", 401);
        }
        const decoded = jwt.verify(token, process.env.secret);
        const user = await User.findById(decoded._id);
        if (!user) {
            return validationErrorResponse(res, "error", "User not registered", 400);
        }
        const subscriptions = await stripe.subscriptions.list({
            customer: user.customerId,
            status: 'active',
            limit: 1
        });
        const activeSubscription = subscriptions.data[0];
        if (!activeSubscription) {
            return validationErrorResponse(res, "error", "No active subscription found", 200);
        }
        const responseData = {
            fullName: user.FullName,
            emailId: user.email,
            contactNumber: `${user.countryCode} ${user.contactNumber}`,
            activePlan: {
                planName: activeSubscription.planName,
                amount: activeSubscription.amount / 100,
                currency: activeSubscription.currency,
                interval: activeSubscription.interval,
                intervalCount: activeSubscription.intervalCount,
                startDate: activeSubscription.startDate,
                endDate: activeSubscription.endDate
            }
        };
        return successResponse(res, responseData, "User and Subscription Details", 200);
    } catch (error) {
        console.error('Error retrieving user details:', error);
        return validationErrorResponse(res, error, 'Internal Server Error', 500);
    }
}

async function HandleLogout(req,res) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return validationErrorResponse(res, "error", "Unauthorized", 401);
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = {
    HandleRegister,
    HandleLogin,
    HandleGetDetail,
    HandleLogout

}