const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const User = require('../models/user')
const secret = process.env.ACCESS_TOKEN_SECRET
const bcrypt = require('bcrypt')
const withAuth = require('../middlewares/auth');

router.get('/register', (req, res) => {
    res.render("user/register", {
        title: 'Register',
        username: '',
        email: ''
    })
})

router.post('/register', async (req, res) => {
    
    try {
        const password =  req.body.password
        const newpassword = req.body.newpassword
        const username = req.body.username
        const email=  req.body.email  

        User.findOne({email},async (err, user) => {
            if(err) console.log(err)
            if(user){
                req.flash('danger', 'User already registered')
                res.render("user/login", {
                    title: 'Login',
                    hidden: ''
                })
            }else{
                if(password == newpassword){
                    let user = await new User({
                        username: username,
                        email: email,
                        password: password,
                    })
                    const token = jwt.sign({id: user.id}, secret, {expiresIn: '30d'})
                    user.save((err) => {
                        if(err){
                            req.flash("danger", 'Minimum password length is 8 characters')
                            res.redirect('/user/register')
                        }else{
                            res.cookie('jwt', token, {httpOnly: true, maxAge: 3000*60*60*24})
                            req.flash('success', 'Your account is created') 
                            res.redirect('/')
                        } 
                    })
                }else{
                    req.flash('danger', 'Both passwords must be the same!')
                    res.redirect('/user/register')
                }
            }
        })
    }catch(error){
        console.log(error)
        res.render('404')
    }
    
})

router.get('/login', withAuth, (req, res) => {
    if(req.user){
        let id = req.user.id
        res.redirect(`/user/edit/${id}`)
    }else{
        res.render("user/login", {
            title: 'Login',
            hidden: 'hidden'
        })
    }
})

router.post('/login', async (req, res) => {
    let email = req.body.email

    User.findOne({email}, async (err, user) => {
        if(err) console.log(err)
        if(!user){
            req.flash('danger', 'User not registered')
            res.render("user/login", {
                title: 'Login',
                hidden: 'hidden'
            })
        }else{
            if(await bcrypt.compare(req.body.password, user.password)){
                const token = jwt.sign({id: user.id}, secret, {expiresIn: '30d'})
                res.cookie('jwt', token, {httpOnly: true, maxAge: 3000*60*60*24})
                req.flash('success', 'Logged')
                if(req.body.email == 'admin@admin') return res.redirect('/admin/pages')
                res.redirect('/')
            }else{
                req.flash('danger', 'Incorrect user or password')
                res.redirect('/user/login')
            }
        }
    })
})

router.get('/edit/:id', (req, res) => {
    let userId = req.params.id
    User.findById(userId, (err, user) => {
        if(err) return console.log(err)
        res.render("user/edit_user", {
            title: user.username,
            username: user.username,
            id: userId
        })
    })
})

router.post('/edit/:id', (req, res) => {
    let userId = req.params.id

    User.findById(userId, (err, user) => {
        if(err) return console.log(err)
        if(req.body.username){
            let username = req.body.username
                user.username = username
                user.save(err => {
                    if(err) return console.log(err)
                    req.flash('success', 'Username edited')
                    res.render('user/edit_user', {
                        title: username,
                        username: username,
                        id: userId
                })
            })
        }
        if(req.body.password){
            if(req.body.password == req.body.newpassword){

                let password = req.body.password
                user.password = password
                user.save(err => {
                    if(err){
                        req.flash("danger", 'Minimum password length is 8 characters')
                        res.redirect(`/user/login`)
                    }else{
                        req.flash('success', 'Password edited')
                        res.render('user/edit_user', {
                            title: user.username,
                            username: user.username,
                            id: userId
                        })
                    }
                })
            }else{
                req.flash("danger", 'Both passwords must be the same!')
                res.render('user/edit_user', {
                    title: user.username,
                    username: user.username,
                    id: userId
            })
            }
    }
    })
})


router.get('/logout', (req, res) => {
    res.cookie('jwt', '', {maxAge: 1})
    res.redirect('/')
})

module.exports = router