const { validateToken } = require('./validate.middleware');
const { validationErrorResponse, errorResponse } = require('../utility/response.utility');
const User = require('../models/user.models');

async function checkAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  // console.log(token);
  
  if (!token) {
    return validationErrorResponse(res,"error","Please Register First",400)
  }

  try {
      const userPayload = validateToken(token); 
      req.user = userPayload; 
      const {_id} = req.user
      const user = await User.findById(_id);
      
      // console.log(user)
      
      if (user.token === null) {
        
        return errorResponse(res, "error", "User not found", 404);
      }
      next(); 
  } catch (error) {
      // console.log('Invalid token:', error.message);
      return errorResponse(res,[error.message],"Something Wrong",500)
  }
}


module.exports = {
  checkAuth
};
