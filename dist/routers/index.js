"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = require("path");
const utils_1 = require("../utils");
const api_1 = __importDefault(require("./api"));
const cors_1 = __importDefault(require("cors"));
function configureRoutes(app, baseDir) {
    app
        .use((0, cors_1.default)())
        .get('/', (req, res, next) => {
        const indexPath = (0, path_1.resolve)(baseDir, 'index.html');
        console.log(`Resolved path for index.html: ${indexPath}`);
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error(`Error serving index.html from ${indexPath}:`, err.message);
                next(err);
            }
        });
    })
        .use(express_1.default.static((0, path_1.resolve)(baseDir, 'public')))
        .use(body_parser_1.default.json())
        .use((0, cookie_parser_1.default)(utils_1.COOKIE_SECRET))
        .use('/api', (0, api_1.default)())
        .use('/error', (req, res, next) => {
        console.log('Error route hit');
        next(new Error('Other Error'));
    })
        .use((req, res, next) => {
        console.log(`Route not found: ${req.url}`);
        next(new Error('Not Found'));
    });
    // Error handling middleware
    app.use((error, req, res, next) => {
        console.error('Error encountered:', error.message);
        let errorPath;
        switch (error.message) {
            case 'Not Found':
                errorPath = (0, path_1.resolve)(baseDir, 'notfound.html');
                console.log(`Resolved path for notfound.html: ${errorPath}`);
                res.sendFile(errorPath, (err) => {
                    if (err) {
                        console.error(`Error serving notfound.html from ${errorPath}:`, err.message);
                        res.status(500).send('Internal Server Error');
                    }
                });
                return;
        }
        errorPath = (0, path_1.resolve)(baseDir, 'error.html');
        console.log(`Resolved path for error.html: ${errorPath}`);
        res.sendFile(errorPath, (err) => {
            if (err) {
                console.error(`Error serving error.html from ${errorPath}:`, err.message);
                res.status(500).send('Internal Server Error');
            }
        });
    });
}
exports.default = configureRoutes;
