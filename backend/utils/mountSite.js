const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('../logger');

// The end of the server wiring (#104), in order: the built frontend's static files, the API, the
// page fallback that lets React Router handle the site's URLs, then the JSON error handler.
// Kept apart from server.js so it can be tested: server.js connects to the database on import.
function mountSite(app, { apiRouter, publicDir }) {
  app.use(express.static(publicDir));

  app.use('/api', apiRouter);

  // An /api URL no route matched is an API error, not a site page: 404 in JSON, whatever the
  // method (#104). Without this, the GET fallback below answered 200 with index.html.
  app.use('/api', (req, res, next) => next(createError(404, 'Not found')));

  // Fallback to index.html for React Router (SPA).
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(function (err, req, res, next) {
    // A 4xx is the client's mistake (such as an unknown /api URL), a 5xx is ours: only the
    // latter belongs in the error log.
    const status = err.status || 500;
    if (status >= 500) logger.error(err.message);
    else logger.warn(err.message);

    res.status(status);
    res.json({
      status: err.status,
      message: err.message,
    });
  });
}

module.exports = { mountSite };
