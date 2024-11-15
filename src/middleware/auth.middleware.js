const { validateToken } = require('./validate.middleware');
const { validationErrorResponse } = require('../utility/response.utility');

function checkAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(token);
  
  if (!token) {
    return validationErrorResponse(res,"error","Please Register First",400)
  }

  try {
      const userPayload = validateToken(token); 
      req.user = userPayload; 
      next(); 
  } catch (error) {
      console.log('Invalid token:', error.message);
      return validationErrorResponse(res,error,"Something Wrong",400)
  }
}


module.exports = {
  checkAuth
};
