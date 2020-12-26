const { Router } = require('express')
const { io, session } = require('../lib/server')
const { Chess } = require('chess.js')
const Game = require('../models/game')
const User = require('../models/user')

const router = Router()

const queue = []

io.use((socket, next) => {
  session(socket.request, {}, next)
})

io.on('connection', socket => {
  if (socket.request.session.user == null) socket.close()

  socket.on('disconnect', () => {
    if (queue.includes(socket)) queue.splice(queue.indexOf(socket), 1)
    if (socket.opp) finishGame(socket.opp)
  })

  socket.user = socket.request.session.user

  socket.on('move', async move => {
    if (!socket.game.move(move)) {
      await finishGame(socket.opp)
    }

    socket.to(socket.opp.id).emit('opponent move', move)

    if (socket.game.in_draw()) {
      await finishGame(socket, true)
    } else if (socket.game.in_checkmate()) {
      await finishGame(socket)
    }
  })

  if (queue.length !== 0) {
    const opponent = queue.shift()

    if (opponent.user.nickname === socket.user.nickname) {
      queue.unshift(opponent)
      queue.push(socket)
      return
    }

    socket.opp = opponent
    opponent.opp = socket

    socket.game = new Chess()
    opponent.game = socket.game

    socket.user.isWhite = Math.random() < 0.5
    opponent.user.isWhite = !socket.user.isWhite

    socket.emit('opponent found', opponent.user)
    opponent.emit('opponent found', socket.user)
  } else {
    queue.push(socket)
  }
})

function saveGame (winner, looser, isDraw = false) {
  const game = new Game({
    white: (winner.user.isWhite ? winner.user : looser.user).nickname,
    black: (looser.isWhite ? winner.user : looser.user).nickname,
    result: isDraw ? '1/2-1/2' : winner.user.isWhite ? '1-0' : '0-1',
    pgn: winner.game.pgn()
  })
  game.save()
}

function calcRatings (winner, looser, isDraw = false) {
  const winE = 1 / (1 + 10 ** ((looser.rating - winner.rating) / 400))
  const winK = winner.rating < 2400 ? 20 : 10
  const winS = isDraw ? 0.5 : 1
  const winR = winner.rating + Math.floor(winK * (winS - winE))

  const loseE = 1 / (1 + 10 ** ((winner.rating - looser.rating) / 400))
  const loseK = looser.rating < 2400 ? 20 : 10
  const loseS = isDraw ? 0.5 : 0
  const loseR = looser.rating + Math.floor(loseK * (loseS - loseE))

  winner.rating = winR
  looser.rating = loseR
}

async function finishGame (winner, isDraw = false) {
  calcRatings(winner.user, winner.opp.user, isDraw)

  await User.findOneAndUpdate({ nickname: winner.user.nickname }, {
    rating: winner.user.rating
  })

  await User.findOneAndUpdate({ nickname: winner.opp.user.nickname }, {
    rating: winner.opp.user.rating
  })

  if (isDraw) {
    winner.emit('draw')
    winner.opp.emit('draw')
  } else {
    winner.emit('win')
    winner.to(winner.opp.id).emit('lose')
  }

  saveGame(winner, winner.opp, isDraw)
  winner.opp = winner.opp.opp = null
}

router.get('/game', (req, res) => {
  if (req.session.user == null) return res.redirect('/')
  res.render('game', { isAuth: true })
})

router.get('/game/:id', async (req, res) => {
  const game = await Game.findById(req.params.id).lean()
  const played = `${game.played.getDate()}.`.padStart(2, '0') +
    `${game.played.getMonth() + 1}.`.padStart(2, '0') +
    game.played.getFullYear()

  let result = `
    [Site "${game.cite}"]
    [Date "${played}"]
    [White "${game.white}"]
    [Black "${game.black}"]
    [Result "${game.result}"]
  `

  result = result.trim().replace(/\r?\n\s*/g, '\n') + '\n\n' + game.pgn
  res.type('txt')
  res.send(result)
})

module.exports = router
