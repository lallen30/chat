import express from 'express';
import cookieParser from 'cookie-parser';
import configureRoutes from './routers';
import configureSockets from './sockets';
import http from 'http';
import { COOKIE_SECRET } from './utils';
import path from 'path';

const app = express();

import dotenv from 'dotenv';
dotenv.config();

console.log(`check SECRET_KEY: ${process.env.SECRET_KEY}`);
console.log(`check PORT: ${process.env.PORT}`);

const port = process.env.PORT || 3107;
console.log(`Server running on port ${port}`);

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));

// Serve static files from the 'dist' directory
const staticPath = path.join(__dirname);
console.log(`__dirname: ${__dirname}`);
console.log(`Resolved static path: ${staticPath}`);
app.use(express.static(staticPath));

configureRoutes(app, staticPath);

console.log(`Attempting to run server on port ${port}`);

const server = http.createServer(app);
configureSockets(server);

server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
