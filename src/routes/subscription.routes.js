const express = require('express');
const subsciptionRouter = express.Router(); 

const { checkAuth } = require('../middleware/auth.middleware');
const { handleCreateSubscription, handleAddDataOfSubscription,handleProductsData } = require('../controller/subscription.controller');


subsciptionRouter.route('/productsDetail').get(handleProductsData)
subsciptionRouter.route('/subscribe').post(checkAuth,handleCreateSubscription)
subsciptionRouter.route('/updateSubscriptionTime').post(checkAuth,handleAddDataOfSubscription)

module.exports = {
    subsciptionRouter
}
