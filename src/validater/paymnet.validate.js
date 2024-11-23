
const { validationErrorResponse } = require('../utility/response.utility');


const validPaymentProductDetail = async (req, res, next) => {
    const { productName,amount} = req.body

    const requiredFields = { productName,amount};

    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
            return validationErrorResponse(res, [], `${key} is required.`, 409);
        }
    }

  
    next();
};

module.exports = {
    validPaymentProductDetail
};
