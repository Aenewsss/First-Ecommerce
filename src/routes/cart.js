const express = require('express')
const Product = require('../models/product')
const router = express.Router()
const paypalRouter = require('./payment')
const { calcularPrecoPrazo } = require('correios-brasil')
const withAuth = require('../middlewares/auth')



router.get('/add/:product', (req, res) => {

    let productParam = req.params.product

    Product.findOne({slug: productParam}, (err, product) => {
        if(err) console.log(err)

        if(typeof req.session.cart == "undefined"){
            req.session.cart = []
            req.session.cart.push({
                title: product,
                quantity: 1,
                price: parseFloat(product.price).toFixed(2),
                image: `/product_images/${product._id}/${product.image}`
            })
        }else{
            let cart = req.session.cart
            let newItem = true
            for (let i = 0; i < cart.length; i++) {
                if(cart[i].title.slug == productParam){
                    cart[i].quantity++
                    newItem = false
                    break
                }
            }
            if(newItem){
                cart.push({
                    title: product,
                    quantity: 1,
                    price: parseFloat(product.price).toFixed(2),
                    image: `/product_images/${product._id}/${product.image}`
                })
            }
        }
        req.flash("success", `Product ${product.title} added`)
        res.redirect('back')
    })
})

router.get('/checkout', async (req, res) => {
    let cep = ''
    let frete = await freteFunction(cep)
    if(req.session.cart && req.session.cart.length == 0){
        delete req.session.cart
        res.redirect('/cart/checkout')
    }else{
        let cart = req.session.cart
        res.render('cart', {
            title: 'Cart',
            cart: cart,
            cep: cep,
            frete: frete,
            hidden: 'hidden',
            fretePrice: '',
            paypalClientID: ''
        })
    }
})

router.post('/checkout', async (req, res) => {
    let cep = req.body.cep

    let fretePrice 
    let service = ''
    let checkedSedex 
    let checkedPac 

    if(req.body.opcaoFrete !== undefined){
        service = req.body.opcaoFrete.replace(/[0-9]/g, '').replace(/,/g,'').replace('+', '')
        if(service == 'sedex'){
            checkedSedex = 'checked'
            checkedPac = ''
        }else{
            checkedSedex = ''
            checkedPac = 'checked'
        }
        fretePrice = Number(parseFloat(req.body.opcaoFrete.replace(',', '.')).toFixed(2))
    }else{
        fretePrice = 0
    }

    let frete = await freteFunction(cep)
    
    if(req.session.cart && req.session.cart.length == 0){
        delete req.session.cart
        res.redirect('/cart/checkout')
    }else{
        let cart = req.session.cart
        res.render('cart', {
            title: 'Cart',
            cart: cart,
            cep: cep,
            frete: frete,
            hidden: '',
            service: service,
            fretePrice: fretePrice,
            checkedPac: checkedPac,
            checkedSedex: checkedSedex,
            paypalClientID: ''
        })
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

router.get('/update/:product',  (req,res) => {

    let product = req.params.product
    let action = req.query.action
    let cart = req.session.cart

    for (let i = 0; i < cart.length; i++) {
        if(cart[i].title.slug == product){
            switch(action){
                case 'add':
                    cart[i].quantity++
                    break;
                case 'remove':
                    cart[i].quantity--
                    if(cart[i].quantity < 1){
                        cart.splice(i,1)
                    }
                    break;
                case 'clear':
                    cart.splice(i,1)
                    if(cart.length == 0){
                        delete req.session.cart
                    }
                    break;
                default:
                    res.render('404')
            }
            break;
        }
    }
    req.flash("success", 'Cart updated')
    res.redirect('/cart/checkout')
})

router.get('/clear', (req, res) => {
    delete req.session.cart
    req.flash("success", 'Cart cleared')
    res.redirect('/cart/checkout')
})

router.use('/payment', paypalRouter)

module.exports = router