const User = require('../models/user.models')
const bcrypt = require('bcrypt')

const { createTokenUser } = require('../middleware/validate');
const { validationErrorResponse, successResponse } = require('../utility/response');


const validator = require('validator')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)


function isValidEmail(email) {
    return validator.isEmail(email);
}

async function HandleRegister(req, res) {
    const { fullName, emailId, password,countryCode , contactNumber } = req.body;

    console.log({ fullName, emailId, password,countryCode ,contactNumber});

    try {
        if (!isValidEmail(emailId)) {
            return validationErrorResponse(res, "error", "Enter a valid email", 409);
        }


        if (!fullName || !emailId || !password || !countryCode || !contactNumber) {
            return validationErrorResponse(res, "error", "Enter fullName, email Id, password, and role", 409);
        }


        const checkUser = await User.findOne({ email:emailId });
        if (checkUser) {
            let error = "Already Registered";
            let message = 'You already have an account. Please login';
            return validationErrorResponse(res, error, message, 409);
        }


        const hashedPassword = await bcrypt.hash(password, 10);


        const registeredUser = new User({
            FullName: fullName,
            email:emailId,
            password: hashedPassword,
            contactNumber,
            countryCode
        });
        await registeredUser.save();


        const stripeCustomer = await stripe.customers.create({
            email: emailId,
            name: fullName,

        });


        registeredUser.custmorStripeId = stripeCustomer.id;
        await registeredUser.save();


        return successResponse(res, registeredUser, "Registration successful", 200);

    } catch (error) {
        console.error("Error during registration:", error);
        return validationErrorResponse(res,error,'Internal Server Error'  , 500);
    }
}
async function HandleLogin(req, res) {
    const { email, password } = req.body;
    try {
        if (isValidEmail(email) == false) {
            return validationErrorResponse(res, "error", "Enter Valid Email", 409)
        }

        if (!email || !password) {
            return validationErrorResponse(res, "error", "Enter email passeord ", 409)
        }
        let token

        const user = await User.findOne({ email });
        if (!user) {
            return validationErrorResponse(res, error, 'Invalid email or password', 400)
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
            email,
            password,
            token
        }

        return successResponse(res, data, "Login Success", 200)
    } catch (error) {
        console.log(error);
        return validationErrorResponse(res,error,'Internal Server Error'  , 500);
    }
}

async function HandleGetDetail(req,res) {
    try {
        console.log(req.user);
        const user = await User.findById(req.user._id);
        if (!user) {
            validationErrorResponse(res,"error","User Do not Register",400)
        }
        const newData = {
            fullName:user.FullName,
            emailId:user.email,
            contactNumber:`${user.countryCode} ${user.contactNumber}`,
        }
        return successResponse(res,newData,"User Detail",200)
        
    } catch (error) {
        return validationErrorResponse(res,error,'Internal Server Error'  , 500);
    }
}


module.exports = {
    HandleRegister,
    HandleLogin,
    HandleGetDetail

}