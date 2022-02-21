const express = require('express')
const Page = require('../models/page')
const router = express.Router()
const withAuth = require('../middlewares/auth')
const contactRouter = require('./contact')

router.get('/', (req, res) => {

    Page.findOne({slug: 'home'}, (err, pages) => {
        if(err) console.log(err)
        res.render('index', {
            title: pages.title,
            slug: pages.slug,
            content: pages.content,
        })
    })
})




router.get('/set-cookies', (req, res) => {

})

router.get('/read-cookies', (req, res) => {

})

router.get('/:slug', (req, res) => {
    let slug = req.params.slug
    
    if(slug == 'set-cookies'){
        res.redirect('../set-cookies')
    }else if(slug == 'read-cookies'){
        res.redirect('../read-cookies')
    }else{
        Page.findOne({slug: slug}, (err, pages) => {
            if(err) console.log(err)
            if(!pages){
                res.redirect('/')
            }else{
                res.render('index', {
                    title: pages.title,
                    slug: pages.slug,
                    content: pages.content,
                })
            }
        })
    }
})

router.use('/contact/suggestion', contactRouter)

module.exports = router