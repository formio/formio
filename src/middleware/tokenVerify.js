'use strict';

const jwt = require("jsonwebtoken");
const util = require('../util/util');
const debug = {
    error: require('debug')('formio:error'),
    handler: require('debug')('formio:middleware:tokenHandler'),
  };

module.exports=(router)=>{
    const hook = require('../util/hook')(router.formio);
     const {
        jwt: jwtConfig,
      } = router.formio.config;
     return (req, res, next) => {
        if (req.user && req.token && res.token) {
            return next();
       }
         const token = util.getRequestValue(req, 'x-jwt-token');
        if (!token) {
        return res.status(401).send("unauthorized");
       }
       jwt.verify(token,process.env.FORMIO_JWT_SECRET||jwtConfig.secret, (err, decoded)=>{
        if (err || !decoded) {
            debug.handler(err || `Token could not decoded: ${token}`);
            router.formio.audit('EAUTH_TOKENBAD', req, err);
            router.formio.log('Token', req, 'Token could not be decoded');
            // If the token has expired, send a 440 error (Login Timeout)
            if (err && (err.name === 'JsonWebTokenError')) {
              router.formio.log('Token', req, 'Bad Token');
              return res.status(400).send('Bad Token');
            }
            else if (err && (err.name === 'TokenExpiredError')) {
              router.formio.audit('EAUTH_TOKENEXPIRED', req, err);
              router.formio.log('Token', req, 'Token Expired');
              return res.status(440).send('Token Expired');
            }
            else {
                res.status(401).send("unauthorized");
            }
          }
         hook.alter('tokenDecode', decoded, req, (err, decoded) => {
        // Check to see if this token is allowed to access this path.
        if (!router.formio.auth.isTokenAllowed(req, decoded)) {
            res.status(401).send("unauthorized");
        }
        if(decoded && !err){
          req.token = decoded
        }
        // If this is a temporary token, then decode it and set it in the request.
        if (decoded.temp) {
          router.formio.log('Token', req, 'Using temp token');
          debug.handler('Temp token');
          req.tempToken = decoded;
          req.user = null;
          req.token = null;
          res.token = null;
          return next();
        }
         if (decoded.isAdmin) {
          router.formio.log('Token', req, 'User is admin');
          if (req.user) {
            router.formio.log('User', req, req.user._id);
          }
          req.permissionsChecked = true;
          req.isAdmin = true;
          req.token = decoded;
          return next();
        }
        });
        return next();
    });
};
};
