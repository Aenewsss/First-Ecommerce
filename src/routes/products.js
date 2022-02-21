const express = require('express')
const router = express.Router()
const fs = require('fs-extra')
const Product = require('../models/product')
const { calcularPrecoPrazo } = require('correios-brasil')

router.get('/all-products', (req, res) => {
    Product.find(function(err, products) {
        if(err){
            console.log(err)
        } 
        res.render('all_products', {
            title: 'All products',
            products: products
        })
    })
})

router.get('/:slug', (req, res) => {
    try {
        let slug = req.params.slug
        Product.find({category: slug}, (err, products) => {
            if(err) console.log(err)
            if(products){
                if(products[0] == undefined){
                    res.redirect('/')
                }else{
                    let title = products[0].category
                    title = title.charAt(0).toUpperCase() + title.slice(1)
                    res.render('product', {
                        title: title,
                        products: products
                    })
                }
            }else{
                res.redirect('/')
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).redirect('/')
    }
})

router.get('/:slug/:product', (req, res) => {
    let product = req.params.product

    let galleryImages = null;

    Product.findOne({slug: product}, (err, product) => {
        if(err){
            console.log(err)
        }else{
            let galleryDir = `public/product_images/${product._id}/gallery`;

            fs.readdir(galleryDir, (err, files) => {
                if(err){
                    console.log(err)
                }else{
                    galleryImages = files
                    res.render('details_product', {
                        title: product.title,
                        product: product,
                        galleryImages: galleryImages,
                        cep: '',
                        frete: [''],
                        hidden: 'hidden',
                    })
                }
            })
        }
    })
})

router.post('/:slug/:product',async (req, res) => {
    try {
        let product = req.params.product
        let galleryImages = null;
        let cep = req.body.cep

        let frete = await freteFunction(cep)

        Product.findOne({slug: product}, (err, product) => {
            if(err){
                console.log(err)
            }else{
                let galleryDir = `public/product_images/${product._id}/gallery`;

                fs.readdir(galleryDir, (err, files) => {
                    if(err){
                        console.log(err)
                    }else{
                        galleryImages = files
                        res.render('details_product', {
                            title: product.title,
                            product: product,
                            galleryImages: galleryImages,
                            cep: '',
                            frete: frete,
                            hidden: ''
                        })
                    }
                })
            }
        })
    } catch (error) {
        res.status(500).render('404', {error: `Occurs the error: ${error}`})
    }
})

async function freteFunction(cep){

    let frete = null
    let pac = []
    let sedex = []

    await Promise.resolve(calculaFrete(cep))
    .then(response => {
        frete = response
    })
    .catch(err => {
        console.log(err)
    })

    if(frete.length == 1){
        return frete
    }else{
        frete.forEach((servico, index) => {
            if(index<3){
                sedex.push(servico)
        }else{
            pac.push(servico)
        }
        });
        frete = []
        frete.push(sedex, pac)
        return frete
    }   
}

async function calculaFrete(cep){
    let args = {
        sCepOrigem: '05180150',
        sCepDestino: cep,
        nVlPeso: '1',
        nCdFormato: '1',
        nVlComprimento: '20',
        nVlAltura: '20',
        nVlLargura: '20',
        nCdServico: ['04014', '04510'],
        nVlDiametro: '0',
    };
    
    //04510 - PAC
    //04014 - SEDEX

    let resposta = []
    
    await calcularPrecoPrazo(args).then((response) => {
        for(let i=0;i<2;i++){
            if(i == 0){
                resposta.push('SEDEX')
                resposta.push(response[0].Valor)
                resposta.push(response[0].PrazoEntrega)
            }else{
                resposta.push('PAC')
                resposta.push(response[1].Valor)
                resposta.push(response[1].PrazoEntrega)            
            }
        }
    }).catch(() => {
        resposta.push('Cep Inválido') 
    })

    return resposta
}


module.exports = router