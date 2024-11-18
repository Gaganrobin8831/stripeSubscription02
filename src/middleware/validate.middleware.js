const JWT = require('jsonwebtoken');

const secret = process.env.secret;  

function createTokenUser(user) {
 

    const payload = {
        _id: user._id,
        email: user.email,
        name: user.fullName,
        customerId:user.custmorStripeId
    };
    console.log(payload);
    

    const token = JWT.sign(payload, secret, { expiresIn: "1d" });
    console.log(token);

    return token;
}

function validateToken(token) {
    return JWT.verify(token, secret);
}

module.exports = {
    createTokenUser,
    validateToken
};
