const validator = require('validator');
const { validationErrorResponse } = require('../utility/response.utility');

function isValidEmail(email) {
    return validator.isEmail(email);
}

const validateLogin = async (req, res, next) => {
    const { emailId, password } = req.body;

    const requiredFields = { emailId, password };

    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            return validationErrorResponse(res, [], `${key} is required.`, 409);
        }
    }


    if (!isValidEmail(emailId)) {
        return validationErrorResponse(res, [], "Enter a valid email.", 409);
    }
    if (password.length < 8) {
        return validationErrorResponse(res, [], "Password must be at least 8 character.", 409);
    }
  
    next();
};

module.exports = {
    validateLogin
};
