'use strict'

const express = require('express')
const cookieSession = require('cookie-session')
const sio = require('socket.io')

const app = express()
const httpServer = app.listen(3000)
const io = new sio.Server(httpServer)

const session = cookieSession({
  name: 'session',
  secret: 'marti'
})

module.exports = { app, io, session }
