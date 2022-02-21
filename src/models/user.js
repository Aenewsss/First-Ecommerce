const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please enter an email'],
        unique: true
    },
    username: {
        type: String,
        required: [true, 'Please enter an username'],
        minlength: 4
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [8, 'Minimum password length is 8 characters']
    },
})

userSchema.pre('save', async function(next){
    if (this.isNew || this.isModified('password')) {
        const salt = await bcrypt.genSalt()
        this.password = await bcrypt.hash(this.password, salt)
        next()
    }
})

module.exports = mongoose.model('User', userSchema)