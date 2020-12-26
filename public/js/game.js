/* global fetch io Chessboard Chess */

const socket = io()

const searching = document.querySelector('#searching')
const playing = document.querySelector('#playing')
const pgn = document.querySelector('#pgn')

let opponentHTML = ''

const game = new Chess()

const config = {
  onDragStart,
  onDrop,
  onSnapEnd,
  draggable: true,
  position: 'start',
  showNotation: false,
  pieceTheme: '/img/chesspieces/{piece}.png'
}

let board = null

socket.on('opponent found', opponent => {
  config.orientation = !opponent.isWhite ? 'white' : 'black'
  board = new Chessboard('board', config)

  opponentHTML =
    `Your opponent is <a href="/user/${opponent.nickname}">
    ${opponent.nickname}</a> (${opponent.rating})<br><br>`

  pgn.innerHTML = opponentHTML

  playing.style.display = 'flex'

  searching.remove()

  document.querySelectorAll('a').forEach(a => (a.target = '_blank'))
})

socket.on('opponent move', move => {
  game.move(move)
  board.position(game.fen())
  showPGN()
})

socket.on('win', () => {
  finishGame('You win!')
})

socket.on('lose', () => {
  finishGame('You lose!')
})

socket.on('draw', () => {
  finishGame('Draw!')
})

function onDragStart (source, piece, position, orientation) {
  if (game.game_over()) return false

  if ((orientation === 'white' && piece.search(/^w/) === -1) ||
      (orientation === 'black' && piece.search(/^b/) === -1)) {
    return false
  }

  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop (source, target) {
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  })

  if (move === null) return 'snapback'

  socket.emit('move', move)
  showPGN()
}

function onSnapEnd () {
  board.position(game.fen())
}

function showPGN () {
  const notatioon = game.pgn()
  pgn.innerHTML = `${opponentHTML}<strong>Notatioon:</strong><br>${notatioon}`
}

function finishGame (message) {
  showPGN()
  socket.close()
  fetch('/updateSession', { method: 'POST' })
  document.querySelector('#notification').style.display = 'block'
  document.querySelector('#notification').textContent = message
  document.querySelectorAll('a').forEach(a => (a.target = ''))
}
