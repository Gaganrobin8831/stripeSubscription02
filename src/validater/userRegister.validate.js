const validator = require('validator');
const { validationErrorResponse } = require('../utility/response.utility');

function isValidEmail(email) {
    return validator.isEmail(email);
}

const validateRegistration = async (req, res, next) => {
    const { fullName, emailId, password, countryCode, contactNumber } = req.body;

    const requiredFields = { fullName, emailId, password, countryCode, contactNumber };

    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            return validationErrorResponse(res, [], `${key} is required.`, 409);
        }
    }


    if (!isValidEmail(emailId)) {
        return validationErrorResponse(res, [], "Enter a valid email.", 409);
    }
  
    const fullNumber = `${countryCode}${contactNumber}`;
    
    if (!validator.isMobilePhone(fullNumber, 'any')) {
        return validationErrorResponse(res, [], "Enter a valid contact number.", 409);
    }
    
    next();
};

module.exports = {
    validateRegistration
};
