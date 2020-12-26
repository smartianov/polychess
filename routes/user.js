const { Router } = require('express')
const User = require('../models/user')
const Game = require('../models/game')

const router = Router()

router.get('/user/:nickname', async (req, res) => {
  const user = await User.findOne({ nickname: req.params.nickname }).lean()
  if (user) {
    const games = await Game
      .find({
        $or: [
          { white: req.params.nickname }, { black: req.params.nickname }
        ]
      })
      .select('-__v')
      .lean()

    games.forEach(game => {
      const d = game.played
      game.played = `${d.getDate()}.`.padStart(2, '0') +
        `${d.getMonth()}.`.padStart(2, '0') +
        `${d.getFullYear()} at ` +
        `${d.getHours()}:`.padStart(2, '0') +
        `${d.getMinutes()}`.padStart(2, '0')
      game.pgn = `/game/${game._id}`
    })

    const white = games.filter(g => g.white === req.params.nickname)
    const black = games.filter(g => g.black === req.params.nickname)

    const stats = {
      white: {
        total: white.length,
        victories: white.filter(g => g.result === '1-0').length,
        defeats: white.filter(g => g.result === '0-1').length,
        draws: white.filter(g => g.result === '1/2-1/2').length
      },
      black: {
        total: black.length,
        victories: black.filter(g => g.result === '0-1').length,
        defeats: black.filter(g => g.result === '1-0').length,
        draws: black.filter(g => g.result === '1/2-1/2').length
      }
    }

    stats.any = {
      total: stats.white.total + stats.black.total,
      victories: stats.white.victories + stats.black.victories,
      defeats: stats.white.defeats + stats.black.defeats,
      draws: stats.white.draws + stats.black.draws
    }

    res.render('profile', {
      user,
      stats,
      games,
      isOwner: user.nickname === req.session.user?.nickname,
      isAuth: req.session.user != null
    })
  } else res.status(404).render('404', { isAuth: req.session.user != null })
})

router.post('/signin', async (req, res) => {
  const user = await User.findOne(req.body, '-_id nickname rating').lean()

  if (!user) {
    return res.status(401).send()
  }

  req.session.user = user
  res.status(200).send()
})

router.post('/signup', async (req, res) => {
  if (await User.findOne({ nickname: req.body.nickname })) {
    return res.status(401).send()
  }

  const user = new User({ ...req.body, rating: 1600 })
  await user.save()

  req.session.user = {
    nickname: user.get('nickname'),
    rating: user.get('rating')
  }

  res.status(200).send()
})

router.get('/signout', (req, res) => {
  req.session = null
  res.redirect('/')
})

router.get('/ratings', async (req, res) => {
  const users = await User.find({}, '-_id nickname rating').lean()
  res.render('ratings', { users, isAuth: req.session.user != null })
})

router.post('/updateSession', async (req, res) => {
  const user = await User.findOne({
    nickname: req.session.user.nickname
  }, '-_id nickname rating').lean()
  req.session.user = user
  res.send()
})

module.exports = router
