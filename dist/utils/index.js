"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AT_KEY = exports.COOKIE_SECRET = exports.setupDatabase = exports.validToken = exports.verifyToken = exports.generateToken = void 0;
const database_1 = __importDefault(require("../database"));
exports.setupDatabase = database_1.default;
const auth_1 = require("./auth");
Object.defineProperty(exports, "generateToken", { enumerable: true, get: function () { return auth_1.generateToken; } });
Object.defineProperty(exports, "verifyToken", { enumerable: true, get: function () { return auth_1.verifyToken; } });
Object.defineProperty(exports, "validToken", { enumerable: true, get: function () { return auth_1.validToken; } });
const COOKIE_SECRET = process.env.COOKIE_SECRET;
exports.COOKIE_SECRET = COOKIE_SECRET;
const AT_KEY = process.env.AT_KEY;
exports.AT_KEY = AT_KEY;
