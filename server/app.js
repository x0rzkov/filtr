'use strict'

require('../bootstrap')

const debug = require('debug')
const http = require('http')
const createError = require('http-errors')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require('path')
const auth = require('./middleware/auth')
const config = require('../config/app.json')[process.env.NODE_ENV || 'development']

const app = express()

app.use(express.json())
app.use(express.urlencoded({
  extended: false
}))

const corsOpts = {
  credentials: true
}

if (config.client.base_url) {
  corsOpts.origin = config.client.base_url
}

app.use(cors(corsOpts))
app.use(cookieParser())

/**
 * Set up and register passport for authentication
 */
const passport = require('passport')
app.use(passport.initialize())
require('./passport')(passport)

/**
 * Import and use routes
 */
const routes = {
  '': require('./routes/index'),
  'media': require('./routes/media'),
  'albums': require('./routes/albums'),
  'tags': require('./routes/tags'),
  'folders': require('./routes/folders'),
  'users': require('./routes/users')
}

app.use(express.static(path.join(__dirname, '../dist/spa/')))

app.use(auth.authorize)

for (let route in routes) {
  app.use(`/${route}`, routes[route])
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || '3000'
app.set('port', port)

/**
 * Create HTTP server.
 */
const server = http.createServer(app)

const io = require('socket.io')(server)
const Socket = require('./socket')
io.on('connection', socket => {
  let connection = new Socket(socket)
})

/**
 * Listen on provided port, on all network interfaces.
 */
let s = server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Event listener for HTTP server "error" event.
 */
function onError (error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening () {
  var addr = server.address()
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port
  debug('Listening on ' + bind)
}
