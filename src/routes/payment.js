const express = require('express')
const path = require('path')
const router = express.Router()
require('dotenv').config()
const { calcularPrecoPrazo } = require('correios-brasil')
const nodemailer = require('nodemailer')
const {google} = require('googleapis')
const Email = require("email-templates")
const withAuth = require('../middlewares/auth');

const CLIENT_ID = '105378600971-1q842u40lr640jlrnt33133s3796vfjm.apps.googleusercontent.com'
const CLIENT_SECRET = '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'
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04BRSZIknAZGqCgYIARAAGAQSNwF-L9Ir0l6iqvEWES2FIfpFJlOjhtlhqkYZY8cc00lKOqWYExGxE77JPVe9syaq3PTcq0MHLnY'

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID,  CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: REFRESH_TOKEN})

async function sendMail(cart, paymentDescription){
    try {
        const accessToken = await oAuth2Client.getAccessToken()

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'roupasflash@gmail.com',
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken
            }
        })  

        const email = new Email({
            preview: {
                open: false
            },
            message: {
              from: 'roupasflash@gmail.com',
            },
            // uncomment below to send emails in development/test env:
            // send: true
            transport: transport,
            views: {
                root: 'src/views',
                options: {
                  extension: 'ejs'
                }
              }
          });

        let sendedEmail
        await Promise.resolve(email.send({
            template: 'templates/payment_successfull',
            message: {
                to: paymentDescription.Buyer.email
            },
            locals: {
                cart: cart,
                paymentDescription: paymentDescription
            }
        }).then(result => {
            sendedEmail = result
        }))

        let emailFrom = sendedEmail.originalMessage.from
        let to = sendedEmail.originalMessage.to
        let subject = sendedEmail.originalMessage.subject
        let text = sendedEmail.originalMessage.text
        let html = sendedEmail.originalMessage.html

        const mailOptions = {
            from: emailFrom,
            to: to,
            subject: subject,
            text: text,
            html: html,
        }

        const result = await transport.sendMail(mailOptions)

        return result

    } catch (error) {
        return error
    }
}

let paypalClientID = process.env.PAYPAL_CLIENT_ID

let paymentDescription = {
    "Buyer": {
        "username": '',
        "email": ''
    },
    "frete": 0,
    "subtotal": 0,
    "total": 0,
    "item": [{
        "image": '',
        "slug": '',
        "quantity": 0,
        "price": 0
    }],
}

router.post('/', withAuth, async (req,res) => {
    let username = req.user.username
    let cep = ''
    let frete = await freteFunction(cep)

    let cart = req.session.cart
    let subtotal = req.body.total

    let fretePrice = 0
    let total = Number(subtotal) + fretePrice

    res.render('payment', {
        title: 'Payment',
        paypalClientID: paypalClientID,
        cart: cart,
        subtotal: subtotal,
        cep: cep,
        frete: frete,
        hidden: 'hidden',
        service: '',
        fretePrice: fretePrice,
        total: total,
        opacity: 0.6,
        pointer: 'none',
        username: username
    })
})

router.post('/:subtotal', withAuth, async (req,res) => {
    if(!req.user){
        req.flash('danger', 'You must be logged in to finish your purchase')
        return res.redirect('/user/login')
    }else{
    
        let username = req.user.username
        let email = req.user.email

        let cep = req.body.cep
        let frete = await freteFunction(cep)

        let fretePrice 
        let service = ''
        let opacity
        let pointer 
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

            paymentDescription.frete = fretePrice

            opacity = 1
            pointer = 'all'

        }else{
            service = 'undefined'
            fretePrice = 0
            opacity = 0.6
            pointer = 'none'

            paymentDescription.frete = fretePrice
        }

        let cart = req.session.cart
        let subtotal = Number(parseFloat(req.params.subtotal).toFixed(2))
        let total = Number(subtotal) + fretePrice

        paymentDescription.subtotal = subtotal
        paymentDescription.total = total

        cart.forEach((item,index) => {
            if(index == 0){
                paymentDescription = {
                    "Buyer": {
                        "username": username,
                        "email": email
                    },
                    "frete": paymentDescription.frete,
                    "subtotal": paymentDescription.subtotal,
                    "total": paymentDescription.total,
                    "item": [{
                        "image": '',
                        "slug": item.title.slug,
                        "quantity": item.quantity,
                        "price": item.price
                    }],
                }
            }else{
                paymentDescription.item.push({image: '', slug: item.title.slug, quantity: item.quantity, price: item.price})
            }
        })
        res.render('payment', {
            title: 'Payment',
            paypalClientID: paypalClientID,
            cart: cart,
            subtotal: subtotal,
            cep: cep,
            frete: frete,
            hidden: '',
            service: service,
            fretePrice: fretePrice,
            total: total,
            opacity: opacity,
            pointer: pointer,
            checkedPac: checkedPac,
            checkedSedex: checkedSedex
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

router.get('/success', (req,res) => {
    let cart = req.session.cart
    sendMail(cart, paymentDescription).then(result => console.log(result)).catch(error => console.log(error.message))

    delete req.session.cart

    req.flash("success", 'Your purchase has been approved')
    res.redirect('/cart/checkout')
})

module.exports = router