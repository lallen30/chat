"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const ws_1 = require("ws");
const utils_1 = require("../utils");
const HEARTBEAT_INTERVAL = 1000 * 5;
const HEARTBEAT_VALUE = 1;
const clients = {
    threads: {},
};
function onSocketPreError(e) {
    console.log('Pre-error:', e);
}
function onSocketPostError(e) {
    console.log('Post-error:', e);
}
function ping(ws) {
    ws.send(Buffer.from([HEARTBEAT_VALUE]));
}
function sendAll(ws, wss) {
    ws.on('message', (msg, isBinary) => {
        if (isBinary && msg.length === 1 && msg[0] === HEARTBEAT_VALUE) {
            ws.isAlive = true;
        }
        else {
            wss.clients.forEach((client) => {
                const extClient = client;
                if (extClient.readyState === ws_1.WebSocket.OPEN) {
                    extClient.send(msg);
                }
            });
        }
    });
    ws.on('close', () => {
        console.log('Connection closed');
    });
}
function sendThread(ws, threadid) {
    if (!threadid) {
        ws.on('close', () => {
            console.log('Connection closed');
        });
        return;
    }
    const threads = clients.threads;
    if (!threads[threadid]) {
        threads[threadid] = [ws];
    }
    else {
        threads[threadid].push(ws);
    }
    ws.on('message', (msg, isBinary) => {
        if (isBinary && msg.length === 1 && msg[0] === HEARTBEAT_VALUE) {
            ws.isAlive = true;
        }
        else {
            threads[threadid].forEach((client) => {
                const extClient = client;
                if (extClient.readyState === ws_1.WebSocket.OPEN) {
                    extClient.send(msg);
                }
            });
        }
    });
    ws.on('close', () => {
        console.log('Connection closed');
        const idx = threads[threadid].indexOf(ws);
        if (idx >= 0) {
            threads[threadid].splice(idx, 1);
            if (threads[threadid].length === 0) {
                delete threads[threadid];
            }
        }
    });
}
function configureSockets(s) {
    const wss = new ws_1.WebSocketServer({ noServer: true });
    s.on('upgrade', (req, socket, head) => {
        console.log('Upgrade request:', req.url);
        socket.on('error', onSocketPreError);
        (0, cookie_parser_1.default)(utils_1.COOKIE_SECRET)(req, {}, () => {
            const signedCookies = req.signedCookies;
            let at = signedCookies[utils_1.AT_KEY];
            if (!at && !!req.url) {
                const url = new URL(req.url, `ws://${req.headers.host}`);
                at = url.searchParams.get('at');
            }
            if (!(0, utils_1.validToken)(at)) {
                console.log('Invalid token');
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
            wss.handleUpgrade(req, socket, head, (ws) => {
                socket.removeListener('error', onSocketPreError);
                console.log('WebSocket upgrade successful');
                wss.emit('connection', ws, req);
            });
        });
    });
    wss.on('connection', (ws, req) => {
        const extWs = ws;
        console.log('WebSocket connection established:', req.url);
        extWs.isAlive = true;
        extWs.on('error', onSocketPostError);
        if (!req.url) {
            sendAll(extWs, wss);
        }
        else {
            const idx = req.url.indexOf('?');
            const uri = idx >= 0 ? req.url.slice(0, idx) : req.url;
            const paths = uri.split('/').filter((p) => !!p);
            switch (paths[0]) {
                case 'thread':
                    sendThread(extWs, paths[1]);
                    break;
                default:
                    sendAll(extWs, wss);
                    break;
            }
        }
    });
    const interval = setInterval(() => {
        wss.clients.forEach((client) => {
            const extClient = client;
            if (!extClient.isAlive) {
                extClient.terminate();
                return;
            }
            extClient.isAlive = false;
            ping(extClient);
        });
    }, HEARTBEAT_INTERVAL);
    wss.on('close', () => {
        clearInterval(interval);
    });
}
exports.default = configureSockets;
