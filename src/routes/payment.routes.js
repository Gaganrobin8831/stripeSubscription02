const express = require('express');
const paymentRouter = express.Router(); 

const { checkAuth } = require('../middleware/auth.middleware');
const { createcheckOutsession } = require('../controller/payment.controller');



paymentRouter.route('/payment').post(createcheckOutsession)



module.exports = {
    paymentRouter
}