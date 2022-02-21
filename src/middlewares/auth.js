require('dotenv').config()
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const secret = process.env.ACCESS_TOKEN_SECRET

function withAuth(req, res, next){
    const token = req.cookies.jwt
    if(!token){
        req.user = false
        next()
    }else{
        jwt.verify(token, secret, (err, decoded) => {
            if(err) res.status(401).json({error: 'Unauthorized: token invalid'});
            else{
                User.findOne({_id: decoded.id}, (err, user) => {
                    if(err) return console.log(err)
                    req.user = user
                    next()
                })
            }
        })
    }
}


module.exports = withAuth 