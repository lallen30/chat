"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validToken = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../database"));
const SECRET_KEY = process.env.SECRET_KEY;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const AT_KEY = process.env.AT_KEY;
function generateToken(payload) {
    if (!SECRET_KEY) {
        throw new Error('SECRET_KEY is not defined in environment variables');
    }
    return jsonwebtoken_1.default.sign(payload, SECRET_KEY, { expiresIn: '1h' });
}
exports.generateToken = generateToken;
function verifyToken(token) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!SECRET_KEY) {
            throw new Error('SECRET_KEY is not defined in environment variables');
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, SECRET_KEY);
            const db = yield (0, database_1.default)();
            const user = yield db.get('SELECT * FROM users WHERE id = ? AND token = ?', [decoded.userId, token]);
            if (user) {
                return decoded;
            }
            else {
                console.error('Token verification failed: token does not match');
                return null;
            }
        }
        catch (err) {
            console.error('Token verification failed:', err);
            return null;
        }
    });
}
exports.verifyToken = verifyToken;
function validToken(token) {
    if (!SECRET_KEY || !token) {
        return false;
    }
    try {
        jsonwebtoken_1.default.verify(token, SECRET_KEY);
        return true;
    }
    catch (err) {
        console.error('Token verification failed:', err);
        return false;
    }
}
exports.validToken = validToken;
