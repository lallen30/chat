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
let ws;
function closeConnection() {
    if (ws) {
        ws.close();
    }
}
function showMessage(message) {
    const messages = document.getElementById('messages');
    if (!messages) {
        return;
    }
    messages.textContent += `\n${message}`;
    messages.scrollTop = messages.scrollHeight;
}
function isBinary(obj) {
    return typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Blob]';
}
function heartbeat() {
    if (!ws) {
        return;
    }
    else if (ws.pingTimeout) {
        if (typeof ws.pingTimeout === "number") {
            clearTimeout(ws.pingTimeout);
        }
        else {
            clearTimeout(ws.pingTimeout);
        }
    }
    ws.pingTimeout = setTimeout(() => {
        ws.close();
    }, 6000);
    const data = new Uint8Array(1);
    data[0] = 1;
    ws.send(data);
}
function getCookie(name) {
    var _a;
    const value = `; ${document.cookie}`;
    console.log(`Document cookie: ${document.cookie}`);
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const cookieValue = (_a = parts.pop()) === null || _a === void 0 ? void 0 : _a.split(';').shift();
        console.log(`Retrieved cookie ${name}=${cookieValue}`);
        return cookieValue;
    }
}
function fetchToken() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch('/api/v1/users/token', {
            credentials: 'include' // Ensure cookies are included in the request
        });
        if (res.ok) {
            const data = yield res.json();
            return data.token;
        }
        throw new Error('Unable to fetch token');
    });
}
function initConnection(threadId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = yield fetchToken();
            closeConnection();
            const wsUrl = `ws://${window.location.hostname}:3107/thread/${threadId}?at=${token}`;
            console.log(`Connecting to WebSocket URL: ${wsUrl}`);
            ws = new WebSocket(wsUrl);
            ws.addEventListener('error', (error) => {
                console.error('WebSocket error:', error);
                showMessage('WebSocket error');
            });
            ws.addEventListener('open', () => {
                console.log('WebSocket connection established');
                showMessage(`WebSocket connection established for thread id ${threadId}`);
                ws.send(JSON.stringify({ type: 'join', threadId }));
            });
            ws.addEventListener('close', () => {
                console.log('WebSocket connection closed');
                showMessage(`WebSocket connection closed for thread id ${threadId}`);
                if (ws.pingTimeout) {
                    if (typeof ws.pingTimeout === 'number') {
                        clearTimeout(ws.pingTimeout);
                    }
                    else {
                        clearTimeout(ws.pingTimeout);
                    }
                }
            });
            ws.addEventListener('message', (msg) => {
                if (isBinary(msg.data)) {
                    heartbeat();
                }
                else {
                    try {
                        const data = JSON.parse(msg.data);
                        const senderId = getCookie('userId');
                        if (data.type === 'threadMessages') {
                            data.messages.forEach((message) => {
                                showMessage(`${message.senderUsername}: ${message.content}`);
                            });
                        }
                        else if (data.type === 'message') {
                            if (data.senderId !== senderId) {
                                showMessage(`${data.senderUsername}: ${data.content}`);
                            }
                        }
                    }
                    catch (error) {
                        console.error('Failed to parse message:', error);
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to initialize WebSocket connection:', error);
            showMessage('Failed to initialize WebSocket connection');
        }
    });
}
(function () {
    const messages = document.getElementById('messages');
    const login = document.getElementById('login');
    const logout = document.getElementById('logout');
    const wsSend = document.getElementById('ws-send');
    const wsInput = document.getElementById('ws-input');
    const userDropdown = document.getElementById('user-dropdown');
    const refreshUsers = document.getElementById('refresh-users');
    function fetchUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch('/api/v1/users/user_list', {
                    credentials: 'same-origin'
                });
                if (res.ok) {
                    const users = yield res.json();
                    const userId = getCookie('userId');
                    console.log('Fetched users:', users);
                    userDropdown.innerHTML = ''; // Clear existing options
                    // Add default option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Select a user';
                    userDropdown.appendChild(defaultOption);
                    // Add user options, excluding the current user
                    users.forEach((user) => {
                        if (user.id !== userId) {
                            const option = document.createElement('option');
                            option.value = user.id;
                            option.textContent = user.username;
                            userDropdown.appendChild(option);
                        }
                    });
                }
                else {
                    showMessage('Error fetching users');
                    console.error('Error response fetching users:', res.status, res.statusText);
                }
            }
            catch (error) {
                showMessage('Error fetching users');
                console.error('Fetch error:', error);
            }
        });
    }
    refreshUsers.addEventListener('click', fetchUsers);
    userDropdown.addEventListener('change', () => __awaiter(this, void 0, void 0, function* () {
        const receiverId = userDropdown.value;
        const senderId = getCookie('userId');
        if (!senderId || !receiverId) {
            showMessage('Sender or receiver missing');
            return;
        }
        const threadId = yield createThreadIfNotExists(senderId, receiverId);
        initConnection(threadId);
    }));
    wsSend.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
        const val = wsInput.value;
        const receiverId = userDropdown.value;
        const senderId = getCookie('userId');
        console.log(`Sender ID: ${senderId}`);
        console.log(`Receiver ID: ${receiverId}`);
        console.log(`Message: ${val}`);
        if (!val || !receiverId || !senderId) {
            showMessage('Message, sender, or receiver missing');
            return;
        }
        const threadId = yield createThreadIfNotExists(senderId, receiverId);
        const senderUsername = getUsernameById(senderId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'message', threadId, senderId, receiverId, senderUsername, content: val }));
            showMessage(`${senderUsername}: ${val}`);
            wsInput.value = '';
        }
        else {
            showMessage('WebSocket connection not open');
        }
    }));
    function createThreadIfNotExists(user1Id, user2Id) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch('/api/v1/threads/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user1_id: user1Id, user2_id: user2Id })
            });
            const thread = yield res.json();
            return thread.id;
        });
    }
    function getUsernameById(userId) {
        const users = Array.from(userDropdown.options).map(option => ({
            id: option.value,
            username: option.textContent || ''
        }));
        const user = users.find(user => user.id === userId);
        return user ? user.username : undefined;
    }
    login.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const res = yield fetch('/api/v1/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include' // Ensure cookies are included in the request
        });
        if (res.ok) {
            const data = yield res.json();
            showMessage('Logged in');
            fetchUsers();
        }
        else {
            showMessage('Log in error');
        }
    }));
    logout.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
        closeConnection();
        const res = yield fetch('/api/v1/users/logout', {
            credentials: 'include' // Ensure cookies are included in the request
        });
        if (res.ok) {
            showMessage('Logged out');
        }
        else {
            showMessage('Log out error');
        }
    }));
    // Initial fetch of users
    fetchUsers();
})();
