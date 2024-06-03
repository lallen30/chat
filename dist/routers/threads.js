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
const database_1 = __importDefault(require("../database"));
const router = (0, express_1.Router)();
router.post('/create', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user1_id, user2_id } = req.body;
    try {
        const db = yield (0, database_1.default)();
        const thread = yield db.get('SELECT * FROM threads WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)', [user1_id, user2_id, user2_id, user1_id]);
        if (thread) {
            res.status(200).json(thread);
        }
        else {
            const result = yield db.run('INSERT INTO threads (user1_id, user2_id) VALUES (?, ?)', [user1_id, user2_id]);
            const newThread = yield db.get('SELECT * FROM threads WHERE id = ?', [result.lastID]);
            res.status(201).json(newThread);
        }
    }
    catch (err) {
        res.status(500).json({ error: 'Error creating thread' });
    }
}));
router.post('/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { thread_id, sender_id, receiver_id, content } = req.body;
    try {
        const db = yield (0, database_1.default)();
        yield db.run('INSERT INTO messages (thread_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)', [thread_id, sender_id, receiver_id, content]);
        res.status(201).json({ message: 'Message sent' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error sending message' });
    }
}));
router.get('/:thread_id/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { thread_id } = req.params;
    try {
        const db = yield (0, database_1.default)();
        const messages = yield db.all('SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC', [thread_id]);
        res.status(200).json(messages);
    }
    catch (err) {
        res.status(500).json({ error: 'Error fetching messages' });
    }
}));
exports.default = router;
