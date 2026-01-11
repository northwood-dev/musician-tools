var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var indexRouter = require('./routes/index');
var app = express();
var session = require('express-session');
var pgSession = require('connect-pg-simple')(session);
var pg = require('pg');
const logger = require('./logger');
const env = process.env.NODE_ENV || 'production';
const config = require('./config/config')[env];
const PORT = process.env.PORT || 3001;

// Configure log output style for HTTP requests
const selectAllButSuccess = function (req, res) {
  return res.statusCode > 399;
};
const selectAllButWarning = function (req, res) {
  return res.statusCode < 400 || res.statusCode > 499;
};
const selectAllButErrors = function (req, res) {
  return res.statusCode < 500;
};

// Morgan logging setup
app.use(morgan('tiny', {
  stream: {
    write: message => logger.info(message.trim(), { service: 'http' })
  },
  skip: selectAllButWarning
}));

app.use(morgan('tiny', {
  stream: {
    write: message => logger.warn(message.trim(), { service: 'http' })
  },
  skip: selectAllButErrors
}));

app.use(morgan('tiny', {
  stream: {
    write: message => logger.error(message.trim(), { service: 'http' })
  },
  skip: selectAllButSuccess
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session configuration

// Indique à Express qu'il est derrière un proxy (Fly.io)
app.set('trust proxy', 1);

// Session configuration
const sessionConfig = {
  secret: config.jwtsecret || 'musician-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' // 'lax' works for same-site requests
  }
};

// Use PostgreSQL session store only in production
if (process.env.NODE_ENV === 'production') {
  const pgPool = new pg.Pool({
    connectionString: config.url || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  sessionConfig.store = new pgSession({
    pool: pgPool,
    tableName: 'session',
    createTableIfMissing: true
  });
  
  logger.info('Using PostgreSQL session store');
} else {
  logger.info('Using memory session store (development)');
}

app.use(session(sessionConfig));

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? 'https://musician-tools.app'
    : 'http://localhost:5173';
  
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Serve static frontend (Vite build)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', indexRouter);

// Fallback to index.html for React Router (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// catch 404 and forward to error handler
// (404 handler is now unreachable for frontend routes)

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // log the error
  logger.error(err.message);

  // send the error response
  res.status(err.status || 500);
  res.json({
    status: err.status,
    message: err.message
  });
});

app.listen(PORT, () => {
  logger.log('info', `Listening on ${PORT}, NODE_ENV : ${process.env.NODE_ENV}`);
});

module.exports = app;
