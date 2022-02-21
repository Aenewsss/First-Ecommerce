const express = require('express');
const path = require('path')
const bodyParser = require('body-parser')
const PORT = 3000;
const cookieParser = require('cookie-parser')
const rootRouter = require('./src/routes/index')
const productsRouter = require('./src/routes/products')
const cartRouter = require('./src/routes/cart')
const adminRouter = require('./src/routes/admin')
const adminCategoryRouter = require('./src/routes/admin_categories')
const adminProductsRouter = require('./src/routes/admin_products')
const userRouter = require('./src/routes/user')
const adminUserRouter = require('./src/routes/admin_users')

const session = require('express-session')
const expressValidator = require('express-validator')
const fileUpload = require('express-fileupload')

require('./config/database')

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser())

app.locals.errors = null

const Page = require('./src/models/page')

Page.find({}).sort({sorting: 1}).exec((err, pages) =>{
    if(err){
        console.log(err)
    }else{
        app.locals.pages = pages
    }
})

const Category = require('./src/models/category');
const { cookie } = require('express-validator/check');
const withAuth = require('./src/middlewares/auth');

Category.find((err, categories) =>{
    if(err){
        console.log(err)
    }else{
        app.locals.categories = categories
    }
})

app.use(fileUpload())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    // cookie: { secure: true }
  }))

app.use(expressValidator({
    errorFormatter: function(param, msg, value){
        var namespace = param.split(".")
        , root = namespace.shift()
        , formParam = root;

        while(namespace.length){
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    },
    customValidators: {
        isImage: function(value, filename){
            let extension = (path.extname(filename)).toLowerCase()
            switch (extension) {
                case '.jpg' :
                    return '.jpg';
                case '.jpeg' :
                    return '.jpeg';
                case '.png' :
                    return '.png';
                case '':
                    return '.png';
                default:
                    return false;     
            }
        }
    } 
}));

app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.get('*', (req,res, next) => {
    res.locals.cart = req.session.cart
    next()
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.get('/set-cookies', (req, res) => {
    res.cookie('newUser', false)
    res.cookie('test', true, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true})
    res.send('You got the cookies')
})

app.get('/read-cookies', (req, res) => {
    const cookies = req.cookies    
    console.log(cookies)
    res.json(cookies)
})

app.use('/', rootRouter)
app.use('/user', userRouter)


app.use('/admin/pages', adminRouter)
app.use('/admin/categories', adminCategoryRouter)
app.use('/admin/users', adminUserRouter)
app.use('/admin/products', adminProductsRouter)
app.use('/products', productsRouter)
app.use('/cart', cartRouter)

app.use((req, res, next) => {
    res.status(404).render('404')
})

app.listen(PORT, async () => {
    console.log(`Server is at http://localhost:${PORT}`)
})