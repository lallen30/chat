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
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
function findUserByUsername(username) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, database_1.default)();
        const user = yield db.get('SELECT * FROM users WHERE username = ?', [username]);
        return user;
    });
}
function updateUserToken(userId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, database_1.default)();
        yield db.run('UPDATE users SET token = ? WHERE id = ?', [token, userId]);
    });
}
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    try {
        const db = yield (0, database_1.default)();
        yield db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User registered' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error registering user' });
    }
}));
router.get('/user_list', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, database_1.default)();
        const users = yield db.all('SELECT id, username FROM users');
        res.status(200).json(users);
    }
    catch (err) {
        res.status(500).json({ error: 'Error fetching users' });
    }
}));
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password, token } = req.body;
    const user = yield findUserByUsername(username);
    if (!user || !(yield bcrypt_1.default.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userToken = token || (0, auth_1.generateToken)({ userId: user.id });
    yield updateUserToken(user.id, userToken);
    res.cookie('userId', user.id, { sameSite: 'none', secure: true });
    res.json({ token: userToken });
}));
router.post('/logout', (req, res) => {
    res.clearCookie('userId');
    res.status(200).json({ message: 'Logged out' });
});
router.get('/token', (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const token = (0, auth_1.generateToken)({ userId });
    res.json({ token });
});
exports.default = router;
