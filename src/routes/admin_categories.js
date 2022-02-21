const express = require('express')
const router = express.Router()
const Category = require('../models/category')
const adminAuth  = require('../middlewares/adminAuth')

//criando a página inicial de categorias
router.get('/' ,adminAuth, (req, res) => {
    Category.find((err, categories) => {
        if(err) return console.log(err);
        res.render('admin/categories', {
            categories: categories
        })
    })
})

//adicionando categorias 
router.get('/add-category',adminAuth, (req,res) => {
    let title = ""
    res.render('admin/add_category', {
        title: title
    })
})

router.post('/add-category',adminAuth, (req,res) => {
    //veryfing if 'title' and 'content' is notEmpty
    req.checkBody('title', 'Title must have a value.').notEmpty()

    let title = req.body.title
    let slug = title.replace(/\s+/g, '-').toLowerCase()

    let errors = req.validationErrors()

    if(errors){
        res.render('admin/add_category', {
            errors: errors,
            title: title
        })
    }else{
        //verificando se a categoria com o title enviado já existe
        Category.findOne({title: title}, (err, category) => {
            if(category){
                //se sim, a seguinte mensagem aparece e a página é renderizada novamente
                req.flash('danger', 'Category title exists, choose another')
                res.render('admin/add_category', {
                    title: title
                })
            }else{
                //se não, uma nova é criada
                let category = new Category({   
                    title: title,
                    slug: slug
                })
                category.save((err) => {
                    if(err){
                        return console.log(err)
                    }else{
                        req.flash('success', `Category "${category.title}" added`)
                        res.redirect('/admin/categories')
                        Category.find((err, categories) =>{
                            if(err){
                                console.log(err)
                            }else{
                                req.app.locals.categories = categories
                            }
                        })
                    }
                })
            }
        })
    }
})

//deletando categoria
router.get('/delete-category/:id',adminAuth, async (req, res) => {
    try {
        Category.findByIdAndRemove({_id: req.params.id}, (err, category) => {
            req.flash('danger', `Category "${category.title}" removed`)
            res.redirect('/admin/categories')
            Category.find((err, categories) =>{
                if(err){
                    console.log(err)
                }else{
                    req.app.locals.categories = categories
                }
            })
        })
    } catch (error) {
        console.log(error)
    }
})

router.get('/edit-category/:id',adminAuth, (req,res) => {
    //procurando o slug passado no req.params
    Category.findById(req.params.id, (err,category) => {
        if(category){
            //se existir, renderiza a página de edição como título da própria categoria e o slug
            res.render('admin/edit_category', {
                title: category.title,
                id: category._id
            })
        }else{
            console.log(err)
        }
    })
})

router.post('/edit-category/:id',adminAuth, async (req, res) => {
    req.checkBody('title', 'Title must have a value.').notEmpty()

    let slug = req.body.title.replace(/\s+/g, '-').toLowerCase()
    
    let errors = req.validationErrors()

    if(errors){
        res.render('admin/edit_category', {
            errors: errors,
            title: req.body.title,
            id: req.params.id
        })
    }else{
        Category.findOne({slug: slug, _id: {'$ne': req.params.id}}, (err, category) => {
            if(category){
                req.flash('danger', 'Category title exists, choose another')
                res.render('admin/edit_category', {
                    title: req.body.title,
                    id: req.params.id
                })
            }else{
                Category.findById(req.params.id, (err, category) => {
                    if(category){
                        category.title = req.body.title;
                        category.slug = slug;
 
                        category.save(err => {
                            if(err){
                                return console.log(err)
                            }else{
                                req.flash('success', `Category ${category.title} edited`)
                                res.redirect('/admin/categories')
                                Category.find((err, categories) =>{
                                    if(err){
                                        console.log(err)
                                    }else{
                                        req.app.locals.categories = categories
                                    }
                                })
                            }
                        })
                    }else{
                        return console.log(err)
                    }
                })
            }
        })
    }
})

module.exports = router