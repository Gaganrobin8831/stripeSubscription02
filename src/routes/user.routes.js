const express = require('express');

const { handleRegister, handleLogin, handleGetDetail, handleLogout ,handleCustomerUpgrade, handleCustomerManageSubscription} = require('../controller/user.controller');
const { checkAuth } = require('../middleware/auth.middleware');
const { validateRegistration } = require('../validater/userRegister.validate');
const { validateLogin } = require('../validater/userLogin.validate');

const userRouter = express.Router();



userRouter.route('/register').post(validateRegistration,handleRegister)


userRouter.route('/login').post(validateLogin,handleLogin);
userRouter.route('/logout').post(checkAuth,handleLogout);

userRouter.route('/userDetailAndSubscriptionHistory').get(checkAuth, handleGetDetail)

userRouter.route('/updateSubcription').post(checkAuth,handleCustomerUpgrade)
userRouter.route('/manageSubscription').post(checkAuth,handleCustomerManageSubscription)


module.exports = userRouter;
