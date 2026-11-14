const express = require('express');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mountSite } = require('../utils/mountSite');

// #104: the end of the server wiring (static files, API, page fallback, error handler), mounted
// here on a minimal app because the server itself connects to the database when imported.
let publicDir;
let app;

beforeAll(() => {
  publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mount-site-'));
  fs.writeFileSync(path.join(publicDir, 'index.html'), '<!doctype html><title>SPA</title>');
  fs.writeFileSync(path.join(publicDir, 'version.json'), '{"version":"test"}');
  const apiRouter = express.Router();
  apiRouter.get('/ping', (req, res) => res.json({ pong: true }));
  app = express();
  mountSite(app, { apiRouter, publicDir });
});

afterAll(() => fs.rmSync(publicDir, { recursive: true, force: true }));

test('a known API route answers normally', async () => {
  const res = await request(app).get('/api/ping');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ pong: true });
});

test.each(['/', '/songs', '/catalog/some-uid'])('the site page %s gets index.html', async (url) => {
  const res = await request(app).get(url);
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/text\/html/);
  expect(res.text).toContain('<title>SPA</title>');
});

test('a real static file is served as itself', async () => {
  const res = await request(app).get('/version.json');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ version: 'test' });
});
