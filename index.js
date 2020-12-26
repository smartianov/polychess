'use strict'

const express = require('express')
const { app, session } = require('./lib/server')
const mongoose = require('mongoose')
const userRouter = require('./routes/user')
const gameRouter = require('./routes/game')

mongoose.connect('mongodb://localhost:27017/polychess', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, () => console.log('Mongoose has connected.'))

app.set('view engine', 'ejs')
app.set('views', 'views')

app.use(session)

app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

app.get('/js/chess.js', (req, res) => {
  res.sendFile(require.resolve('chess.js'))
})

app.get('/', (req, res) => {
  if (!req.session.user) res.render('index', { isAuth: false })
  else res.redirect(`/user/${req.session.user.nickname}`)
})

app.use(userRouter)
app.use(gameRouter)

app.use((req, res) => {
  res.status(404).render('404', { isAuth: req.session.user != null })
})
