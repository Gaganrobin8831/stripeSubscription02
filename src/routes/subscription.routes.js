
const express = require('express');
const subsciptionrouter = express.Router(); 

const { checkAuth } = require('../middleware/auth');
const { HandleCreateSubscription } = require('../controller/subscription.controller');


subsciptionrouter.post('/subscribe', checkAuth,HandleCreateSubscription);


module.exports = {
    subsciptionrouter
}