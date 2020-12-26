const { model, Schema } = require('mongoose')

const schema = new Schema({
  cite: { type: String, default: 'PolyChess' },
  white: { type: String, required: true },
  black: { type: String, required: true },
  played: { type: Date, default: Date.now },
  result: { type: String, required: true },
  pgn: { type: String, required: true }
})

module.exports = model('Game', schema)
