import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AT_KEY, COOKIE_SECRET, verifyToken } from '../utils';
import setupDatabase from '../database';

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

async function saveMessageToDatabase(threadId: string, senderId: string, receiverId: string, content: string, sent: string) {
    const db = await setupDatabase();
    await db.run(`
        INSERT INTO messages (thread_id, sender_id, receiver_id, content, sent) 
        VALUES (?, ?, ?, ?, ?)
    `, [threadId, senderId, receiverId, content, sent]);
}

async function sendThread(ws: ExtendedWebSocket, threadId: string) {
    if (!threadId) {
        ws.on('close', () => {
            console.log('Connection closed');
        });
        return;
    }

    const threads = clients.threads;

    if (!threads[threadId]) {
        threads[threadId] = [ws];
    } else {
        threads[threadId].push(ws);
    }

    ws.on('message', async (msg: IExtRawData, isBinary: boolean) => {
        if (isBinary && msg.length === 1 && msg[0] === HEARTBEAT_VALUE) {
            ws.isAlive = true;
        } else {
            try {
                const data = JSON.parse(msg.toString());
                if (data.type === 'message') {
                    const { senderId, receiverId, content } = data;
                    console.log(`Broadcasting message to thread ${threadId}: ${content}`);

                    if (threads[threadId].length === 1) {
                        await saveMessageToDatabase(threadId, senderId, receiverId, content, '0');
                        console.log('No active connections for this thread, message saved to database.');
                    } else {
                        threads[threadId].forEach((client) => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(isBinary ? msg : msg.toString());
                            }
                        });
                        await saveMessageToDatabase(threadId, senderId, receiverId, content, '1');
                    }
                }
            } catch (error) {
                console.error('Failed to process message:', error);
            }
        }
    });

    ws.on('close', (event: CloseEvent) => {
        console.log(`WebSocket connection closed: code=${event.code}, reason=${event.reason}`);
        // Replace this.showMessage with an appropriate logging or function call.
        // For example, log the message:
        console.log({ senderId: 0, senderUsername: 'system', content: `WebSocket connection closed: ${event.reason}`, threadId: 0 });

        const idx = threads[threadId].indexOf(ws);
        if (idx >= 0) {
            threads[threadId].splice(idx, 1);
            if (threads[threadId].length === 0) {
                delete threads[threadId];
            }
        }
    });
}

export default function configureSockets(s: Server) {
    const wss = new WebSocketServer({ noServer: true });

    s.on('upgrade', (req: any, socket: any, head: any) => {
        console.log('Upgrade request:', req.url);
        socket.on('error', onSocketPreError);

        cookieParser(COOKIE_SECRET)(req, {} as any, async () => {
            const signedCookies = req.signedCookies;
            let at = signedCookies[AT_KEY as string];

            if (!at && !!req.url) {
                const url = new URL(req.url, `ws://${req.headers.host}`);
                at = url.searchParams.get('at');
            }

            console.log('Token for verification:', at);

            const result = await verifyToken(at);
            console.log('verifyToken result:', result);

            if (!result) {
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
