const express = require('express');
const paymentRouter = express.Router(); 

const { checkAuth } = require('../middleware/auth.middleware');
const { createcheckOutsession } = require('../controller/payment.controller');
const { validPaymentProductDetail } = require('../validater/paymnet.validate');



paymentRouter.route('/payment').post(checkAuth,validPaymentProductDetail,createcheckOutsession)



module.exports = {
    paymentRouter
}
