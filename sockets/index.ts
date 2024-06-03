import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AT_KEY, COOKIE_SECRET, validToken } from '../utils';

type IExtRawData = Buffer;

interface IWebSocketClients {
    threads: { [key: string]: ExtendedWebSocket[] };
}

interface ExtendedWebSocket extends WebSocket {
    isAlive: boolean;
}

const HEARTBEAT_INTERVAL = 1000 * 5;
const HEARTBEAT_VALUE = 1;
const clients: IWebSocketClients = {
    threads: {},
};

function onSocketPreError(e: Error) {
    console.log('Pre-error:', e);
}

function onSocketPostError(e: Error) {
    console.log('Post-error:', e);
}

function ping(ws: ExtendedWebSocket) {
    ws.send(Buffer.from([HEARTBEAT_VALUE]));
}

function sendAll(ws: ExtendedWebSocket, wss: WebSocketServer) {
    ws.on('message', (msg: IExtRawData, isBinary: boolean) => {
        if (isBinary && msg.length === 1 && msg[0] === HEARTBEAT_VALUE) {
            ws.isAlive = true;
        } else {
            wss.clients.forEach((client: any) => {
                const extClient = client as ExtendedWebSocket;
                if (extClient.readyState === WebSocket.OPEN) {
                    extClient.send(msg);
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
    });
}

function sendThread(ws: ExtendedWebSocket, threadid: string) {
    if (!threadid) {
        ws.on('close', () => {
            console.log('Connection closed');
        });
        return;
    }

    const threads = clients.threads;

    if (!threads[threadid]) {
        threads[threadid] = [ws];
    } else {
        threads[threadid].push(ws);
    }

    ws.on('message', (msg: IExtRawData, isBinary: boolean) => {
        if (isBinary && msg.length === 1 && msg[0] === HEARTBEAT_VALUE) {
            ws.isAlive = true;
        } else {
            threads[threadid].forEach((client: any) => {
                const extClient = client as ExtendedWebSocket;
                if (extClient.readyState === WebSocket.OPEN) {
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

export default function configureSockets(s: Server) {
    const wss = new WebSocketServer({ noServer: true });

    s.on('upgrade', (req: any, socket: any, head: any) => {
        console.log('Upgrade request:', req.url);
        socket.on('error', onSocketPreError);

        cookieParser(COOKIE_SECRET)(req, {} as any, () => {
            const signedCookies = req.signedCookies;
            let at = signedCookies[AT_KEY as string];

            if (!at && !!req.url) {
                const url = new URL(req.url, `ws://${req.headers.host}`);
                at = url.searchParams.get('at');
            }

            if (!validToken(at)) {
                console.log('Invalid token');
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws: any) => {
                socket.removeListener('error', onSocketPreError);
                console.log('WebSocket upgrade successful');
                wss.emit('connection', ws, req);
            });
        });
    });

    wss.on('connection', (ws: any, req: any) => {
        const extWs = ws as ExtendedWebSocket;
        console.log('WebSocket connection established:', req.url);
        extWs.isAlive = true;

        extWs.on('error', onSocketPostError);

        if (!req.url) {
            sendAll(extWs, wss);
        } else {
            const idx = req.url.indexOf('?');
            const uri = idx >= 0 ? req.url.slice(0, idx) : req.url;
            const paths = uri.split('/').filter((p: any) => !!p);

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
        wss.clients.forEach((client: any) => {
            const extClient = client as ExtendedWebSocket;
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