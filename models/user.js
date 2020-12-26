const { Schema, model } = require('mongoose')

const schema = new Schema({
  nickname: { type: String, required: true },
  password: { type: String, required: true },
  rating: { type: Number, required: true }
})

module.exports = model('User', schema)
