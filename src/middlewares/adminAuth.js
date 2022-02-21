require('dotenv').config()
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const secret = process.env.ACCESS_TOKEN_SECRET

function adminAuth(req, res, next){
    const token = req.cookies.jwt
    if(!token){
        return res.status(401).json({error: 'No token provided'});
    }else{
        jwt.verify(token, secret, (err, decoded) => {
            if(err) return res.status(401).json({error: 'Unauthorized: token invalid'});
            User.findOne({_id: decoded.id}, (err, user) => {
                if(err) return console.log(err)
                if(user.email == 'admin@admin'){
                    req.user = user
                    next()
                }else{
                    return res.status(401).json({error: 'Unauthorized: token invalid'});
                }
            })
        })
    }
}

module.exports = adminAuth