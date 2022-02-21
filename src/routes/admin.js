const flash = require('connect-flash/lib/flash')
const express = require('express')
const router = express.Router()
const Page = require('../models/page')
const adminAuth  = require('../middlewares/adminAuth')

router.get('/',adminAuth, (req, res) => {
    Page.find({}).sort({sorting: 1}).exec((err, pages) =>{
        res.render('admin/admin', {
            pages: pages
        })
    })
})

router.get('/add-page',adminAuth, (req,res) => {
    let title = ""
    let slug = ""
    let content = ""
    res.render('admin/add_page', {
        title: title,
        slug: slug,
        content: content
    })
})

router.post('/add-page',adminAuth, (req,res) => {
    console.log(req.body)
    //veryfing if 'title' and 'content' is notEmpty
    req.checkBody('title', 'Title must have a value.').notEmpty()
    req.checkBody('content', 'Content must have a value.').notEmpty()

    let title = req.body.title
    let slug = req.body.slug.replace(/\s+/g, '-').toLowerCase()
    if(slug == ""){
        slug = title.replace(/\s+/g, '-').toLowerCase()
    }
    let content = req.body.content

    let errors = req.validationErrors()

    if(errors){
        res.render('admin/add_page', {
            errors: errors,
            title: title,
            slug: slug,
            content: content
        })
    }else{
        Page.findOne({slug: slug}, (err, page) => {
            if(page){
                req.flash('danger', 'Page slug exists, choose another')
                res.render('admin/add_page', {
                    title: title,
                    slug: slug,
                    content: content
                })
            }else{
                let page = new Page({   
                    title: title,
                    slug: slug,
                    content: content,
                    sorting: 100
                })
                page.save((err) => {
                    if(err){
                        return console.log(err)
                    }else{
                        req.flash('success', `Page "${page.title}" added`)
                        res.redirect('/admin/pages')
                        Page.find({}).sort({sorting: 1}).exec((err, pages) =>{
                            if(err){
                                console.log(err)
                            }else{
                                req.app.locals.pages = pages
                            }
                        })
                    }
                })
            }
        })
    }
})

router.get('/delete-page/:id',adminAuth,async (req, res) => {
    try {
        Page.findByIdAndRemove({_id: req.params.id}, (err, page) => {
            req.flash('danger', `Page "${page.title}" removed`)
            res.redirect('/admin/pages')
            Page.find({}).sort({sorting: 1}).exec((err, pages) =>{
                if(err){
                    console.log(err)
                }else{
                    req.app.locals.pages = pages
                }
            })
        })
    } catch (error) {
        console.log(error)
    }
})

function sortPages(ids, callback){
    let count = 0
    for (let i = 0; i < ids.length; i++) {
        let id = ids[i]
        
        count++
        
        ((count) => {
            Page.findById(id, (err, page) => {
                page.sorting = count
                page.save((err) => {
                    if(err){
                        return console.log(err)
                    }
                count++
                if(count >= ids.length){
                    callback()
                }
                })
            })
        })(count)
    }
}

router.post('/reorder-pages' ,adminAuth, (req, res) => {
    let ids = req.body['id[]']

    sortPages(ids, function(){
        Page.find({}).sort({sorting: 1}).exec((err, pages) =>{
            if(err){
                console.log(err)
            }else{
                req.app.locals.pages = pages
            }
        })
    })

})

router.get('/edit-page/:id',adminAuth, (req,res) => {
    Page.findById(req.params.id, (err,page) => {
        if(page){
            res.render('admin/edit_page', {
                title: page.title,
                slug: page.slug,
                content: page.content,
                id: page._id
            })
        }else{
            console.log(err)
        }
    })
})

router.post('/edit-page/:id',adminAuth,async (req, res) => {
    req.checkBody('title', 'Title must have a value.').notEmpty()
    req.checkBody('content', 'Content must have a value.').notEmpty()

    req.body.slug.replace(/\s+/g, '-').toLowerCase()
    if(req.body.slug == ""){
        req.body.slug = req.body.title.replace(/\s+/g, '-').toLowerCase()
    }

    let errors = req.validationErrors()

    if(errors){
        res.render('admin/edit_page', {
            errors: errors,
            title: req.body.title,
            slug: req.body.slug,
            content: req.body.content,
            id: req.params.id
        })
    }else{
        Page.findOne({slug: req.body.slug, _id: {'$ne': req.params.id}}, (err, page) => {
           if(page){
               req,flash('danger', 'Page slugs exists, choose another')
               res.render('admin/edit_page', {
                   title: req.body.title,
                   slug: req.body.slug,
                   content: req.body.content,
                   id: req.params.id
               })
           }else{
               Page.findById(req.params.id, (err, page) => {
                   if(page){
                       page.title = req.body.title;
                       page.slug = req.body.slug;
                       page.content = req.body.content;

                       page.save(err => {
                           if(err){
                               return console.log(err)
                           }else{
                               req.flash('success', `Page ${page.title} edited`)
                               res.redirect('/admin/pages')
                               Page.find({}).sort({sorting: 1}).exec((err, pages) =>{
                                    if(err){
                                        console.log(err)
                                    }else{
                                        req.app.locals.pages = pages
                                    }
                                })
                           }
                       })
                   }
               })
           }
    })
    }
})

module.exports = router