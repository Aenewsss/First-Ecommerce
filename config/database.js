const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/ecommerce')
    .then(()=> {console.log('Connected to MongoDB')})
    .catch((err) => {console.error(err)})

//conectando com o banco de dados
