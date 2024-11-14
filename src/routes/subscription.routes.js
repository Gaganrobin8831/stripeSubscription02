const express = require('express');
const subsciptionrouter = express.Router(); 

const { checkAuth } = require('../middleware/auth.middleware');
const { HandleCreateSubscription, HandleAddDataOfSubscription } = require('../controller/subscription.controller');



subsciptionrouter.route('/subscribe').post(checkAuth,HandleCreateSubscription)
subsciptionrouter.route('/updateSubscriptionTime').post(checkAuth,HandleAddDataOfSubscription)

module.exports = {
    subsciptionrouter
}
