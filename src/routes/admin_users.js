const express = require('express')
const router = express.Router()
const User = require('../models/user')
const adminAuth  = require('../middlewares/adminAuth')

//criando a página inicial de categorias
router.get('/' ,adminAuth, (req, res) => {
    User.find((err, users) => {
        if(err) return console.log(err);
        res.render('admin/user', {
            users: users
        })
    })
})

router.get('/delete-user/:id', (req, res) => {
    User.findByIdAndRemove({_id: req.params.id}, (err, user) => {
        if(err) return console.log(err)
        req.flash("danger", 'User removed')
        res.redirect('/admin/users')
    })
})


module.exports = router
