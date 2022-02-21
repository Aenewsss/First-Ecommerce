const express = require('express')
const router = express.Router()
const mkdirp = require('mkdirp')
const fs = require('fs-extra')
const resizeImg = require('resize-img')
const Product = require('../models/product')
const Category = require('../models/category')
const adminAuth  = require('../middlewares/adminAuth')

//criando a página inicial de categorias
router.get('/',adminAuth,async (req, res) => {
    let count;
    Product.count((err, c) => {
        count = c;
    })

    Product.find((err, products) => {
        if(err){
            return console.log(err)
        }else{
            setTimeout(() => {
                res.render('admin/products', {
                    products: products,
                    count: count
                })
            }, 200);
        }
    })
})

//adicionando categorias 
router.get('/add-product',adminAuth, async (req,res) => {
    let title = ""
    let description = ""
    let price = ""

    Category.find((err, category) => {
        if(err){
            return console.log(err)
        }else{
            res.render('admin/add_product', {
                title: title,
                description: description,
                categories: category,
                price: price
            })
        }
    })
})

router.post('/add-product',adminAuth, async (req,res) => {
    let imageFile = "";
    if(req.files === null){
        imageFile == ""
    }else{
        if(typeof(req.files.image !== "undefined")){
            imageFile = req.files.image.name
        }else{
            imageFile = ""
        }
    }

    //veryfing if 'title' and 'content' is notEmpty
    req.checkBody('title', 'Title must have a value.').notEmpty()
    req.checkBody('description', 'Description must have a value.').notEmpty()
    req.checkBody('price', 'Price must have a value.').isDecimal()
    req.checkBody('image', 'You must upload an image').isImage(imageFile)

    let title = req.body.title
    let slug = title.replace(/\s+/g, '-').toLowerCase()
    let description = req.body.description
    let price = req.body.price
    let category = req.body.category

    let errors = req.validationErrors()

    if(errors){
        Category.find((err, category) => {
            if(err) return console.log(err);
            res.render('admin/add_product', {
                errors: errors,
                title: title,
                description: description,
                categories: category,
                price: price
            })
        })
    }else{
        //verificando se a categoria com o slug enviado já existe
        Product.findOne({slug: slug}, (err, product) => {
            if(product){
                //se sim, a seguinte mensagem aparece e a página é renderizada novamente
                req.flash('danger', 'Product title exists, choose another')
                Category.find((err, category) => {
                    if(err) return console.log(err);
                    res.render('admin/add_product', {
                        title: title,
                        description: description,
                        categories: category,
                        price: price
                    })
                })
            }else{
                price = parseFloat(price).toFixed(2)
                //se não, uma nova é criada
                let product = new Product({   
                    title: title,
                    slug: slug,
                    description: description,
                    price: price,
                    category: category,
                    image: imageFile
                })
                product.save((err) => {
                    if(err){
                        return console.log(err)
                    }else{
                        mkdirp(`public/product_images/${product._id}`);
                        
                        mkdirp(`public/product_images/${product._id}/gallery`);

                        mkdirp(`public/product_images/${product._id}/gallery/thumbs`);
                        
                        if(imageFile != ""){
                            let productImage = req.files.image;
                            let path = `./public/product_images/${product._id}/${imageFile}/`
                            
                            setTimeout(() => {
                                productImage.mv(path, (err) => {
                                    if(err){
                                        return console.log(err)
                                    }
                                })
                            }, 200);
                        }
                    }       
                    setTimeout(() => {
                        req.flash('success', `Product "${product.title}" added`)
                        res.redirect('/admin/products')
                    }, 200);
                })
            }
        })
    }
})

//deletando produto
router.get('/delete-product/:id',adminAuth, async (req, res) => {
    try {
        Product.findByIdAndRemove({_id: req.params.id}, (err, product) => {
            req.flash('danger', `Product "${product.title}" removed`)
            res.redirect('/admin/products/')
        })
        let dir = `./public/product_images/${req.params.id}`
        fs.rmdir(dir, {recursive: true} ,(err) => {
            if(err) return console.log(err)
        })
    } catch (error) {
        console.log(error)
    }
})

router.get('/edit-product/:id',adminAuth, (req,res) => {

    let errors;

    if(req.session.errors){
        errors = req.session.errors
    }else{
        req.session.errors = null
    }

    Category.find((err,category) => {
        if(category){
            Product.findById(req.params.id, (err, product) => {
                if(err){
                    console.log(err);
                    res.redirect('/admin/products')
                } else{
                    let galleryDir = `public/product_images/${product._id}/gallery`
                    let galleryImages = null

                    fs.readdir(galleryDir, (err, files) => {
                        if(err) {
                            console.log(err)
                        }else{
                            galleryImages = files
                            res.render('admin/edit_product', {
                                errors: errors,
                                title: product.title,
                                description: product.description,
                                categories: category,
                                category: product.category.replace(/\s+/g, '-').toLowerCase(),
                                price: parseFloat(product.price).toFixed(2),
                                image: product.image,
                                galleryImages: galleryImages,
                                id: product._id
                            })
                        }
                    }) 
                }
            })
        }else{
            return console.log(err)
        }
    })
})

router.post('/edit-product/:id',adminAuth,async (req, res) => {
    let imageFile = "";
    if(req.files === null){
        imageFile == ""
    }else{
        if(typeof(req.files.image !== "undefined")){
            imageFile = req.files.image.name
        }else{
            imageFile = ""
        }
    }

    req.checkBody('title', 'Title must have a value.').notEmpty()
    req.checkBody('description', 'Description must have a value.').notEmpty()
    req.checkBody('price', 'Price must have a value.').isDecimal()
    req.checkBody('image', 'You must upload an image').isImage(imageFile)

    let title = req.body.title
    let slug = title.replace(/\s+/g, '-').toLowerCase()
    let description = req.body.description
    let price = req.body.price
    let category = req.body.category
    let pimage = req.body.pimage
    let id = req.params.id
    
    let errors = req.validationErrors()

    if(errors){
        req.session.errors = errors
        res.redirect(`/admin/products/edit-product/${id}`)
    }else{
        Product.findOne({slug: slug, _id: {'$ne': id}}, (err, product) => {
            if(err) return console.log(err)
            if(product){
                req.flash('danger', 'Product title exists, choose another')
                res.redirect(`/admin/products/edit-product/${id}`)
            }else{
                Product.findById(id, (err, product) => {
                    if(product){
                        product.title = title;
                        product.slug = slug;
                        product.description = description;
                        product.price = parseFloat(price).toFixed(2);
                        product.category = category;
                        if(imageFile != ""){
                            product.image = imageFile
                        }

                        product.save(err => {
                            if(err){
                                return console.log(err)
                            }else{
                                if(imageFile != ""){
                                    if(pimage != ""){
                                        fs.remove(`public/product_images/${id}/${pimage}`, (err) => {
                                            if(err) return console.log(err)
                                        })
                                    }
                                    let productImage = req.files.image;
                                    let path = `./public/product_images/${id}/${imageFile}/`
                            
                                        productImage.mv(path, (err) => {
                                            if(err){
                                                return console.log(err)
                                            }
                                        })
                                }
                                req.flash('success', `Product ${product.title} edited`)
                                res.redirect('/admin/products')
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

router.post('/product-gallery/:id',adminAuth, (req, res) => {
    try {
        let productImage = req.files.file
        let id = req.params.id
        let path = `public/product_images/${id}/gallery/${req.files.file.name}`;
        let thumbsPath = `public/product_images/${id}/gallery/thumbs/${req.files.file.name}`;
        
            productImage.mv(path, (err) => {
                if(err){
                    return console.log(err)
                }
                resizeImg(fs.readFileSync(path), {width:120, height:100})
                .then(buf => {
                    fs.writeFileSync(thumbsPath, buf)
                })
            })
    
        res.sendStatus(200)
    } catch (error) {
        res.status(500).json({message: 'Its not possible load the image.', error: error})
    }
})

router.get('/delete-image/:image',adminAuth, (req, res) => {
    try {
        let id = req.query.id
        let image = req.params.image
        let path = `public/product_images/${id}/gallery/${image}`
        let thumbsPath = `public/product_images/${id}/gallery/thumbs/${image}`;
        try{
            fs.removeSync(path)
            fs.removeSync(thumbsPath)
            req.flash('success', 'Gallery image deleted')
            res.redirect(`/admin/products/edit-product/${id}`)
        }catch(error){
            console.log(error)
            req.flash('danger', 'Gallery image not deleted')
            res.redirect(`/admin/products/edit-product/${id}`)
        }
    } catch (error) {
        res.status(500).json({message: 'Its not possible delete the image.', error: error})
    }
})

module.exports = router