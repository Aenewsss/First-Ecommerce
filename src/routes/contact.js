const express = require('express')
const router = express.Router()
const withAuth = require('../middlewares/auth')
const nodemailer = require('nodemailer')
const {google} = require('googleapis')
const Email = require("email-templates")

const CLIENT_ID = '105378600971-1q842u40lr640jlrnt33133s3796vfjm.apps.googleusercontent.com'
const CLIENT_SECRET = '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'
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04BRSZIknAZGqCgYIARAAGAQSNwF-L9Ir0l6iqvEWES2FIfpFJlOjhtlhqkYZY8cc00lKOqWYExGxE77JPVe9syaq3PTcq0MHLnY'

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID,  CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: REFRESH_TOKEN})


async function sendMail(message, username, contactEmail){
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
              from: contactEmail,
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
            template: 'templates/contact_suggestion',
            message: {
                to: 'roupasflash@gmail.com'
            },
            locals: {
                user: username,
                email: contactEmail,
                message: message
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

router.get('/', (req, res) => {
    res.render('contact', {
        title: 'Contact Page',
        slug: 'Contact Page',
        content: 'Contact Page'
    })
})

router.post('/', withAuth, (req, res) => {
    let message = req.body.comments
    if(req.user){
        let username = req.user.username
        let email = req.user.email
        sendMail(message, username, email).then(result => console.log(result)).catch(error => console.log(error.message))
        req.flash('success', 'Suggestion sent successfully')
        res.render('contact', {
            title: 'Contact Page',
            slug: 'Contact Page',
            content: 'Contact Page'
        })
        return
    }
    req.flash('danger', 'You must be logged in to sent a suggestion')
    res.redirect('/user/login')
    return
})

module.exports = router