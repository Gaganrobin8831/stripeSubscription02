const express = require('express');
const subsciptionRouter = express.Router(); 

const { checkAuth } = require('../middleware/auth.middleware');
const { handleCreateSubscription,handleProductsData } = require('../controller/subscription.controller');


subsciptionRouter.route('/productsDetail').get(handleProductsData)
subsciptionRouter.route('/subscribe').post(checkAuth,handleCreateSubscription)


module.exports = {
    subsciptionRouter
}
