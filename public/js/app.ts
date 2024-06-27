interface CustomWebSocket extends WebSocket {
    pingTimeout?: NodeJS.Timeout | number;
}

let ws: CustomWebSocket | null = null;

function closeConnection() {
    if (ws) {
        ws.close();
        ws = null;
    }
}

function showMessage(message: string) {
    const messages = document.getElementById('messages') as HTMLElement;
    if (!messages) {
        return;
    }
    messages.textContent += `\n${message}`;
    messages.scrollTop = messages.scrollHeight;
}

function isBinary(obj: any): boolean {
    return typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Blob]';
}

function heartbeat() {
    if (!ws) {
        return;
    } else if (ws.pingTimeout) {
        if (typeof ws.pingTimeout === "number") {
            clearTimeout(ws.pingTimeout);
        } else {
            clearTimeout(ws.pingTimeout as NodeJS.Timeout);
        }
    }

    ws.pingTimeout = setTimeout(() => {
        if (ws) {
            ws.close();
        }
    }, 6000);

    const data = new Uint8Array(1);
    data[0] = 1;
    ws.send(data);
}

function getCookie(name: string): string | undefined {
    const value = `; ${document.cookie}`;
    console.log(`Document cookie: ${document.cookie}`);
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        console.log(`Retrieved cookie ${name}=${cookieValue}`);
        return cookieValue;
    }
}

async function fetchToken(): Promise<string> {
    const token = localStorage.getItem('userToken');
    if (token) {
        console.log(`Fetched token from local storage: ${token}`);
        return token;
    }
    throw new Error('Token not found in local storage');
}



async function initConnection(threadId: string) {
    try {
        const token = await fetchToken();
        console.log(`Using token for WebSocket connection: ${token}`);
        closeConnection();
        const wsUrl = `ws://${window.location.hostname}:3107/thread/${threadId}?at=${token}`;
        console.log(`Connecting to WebSocket URL: ${wsUrl}`);
        ws = new WebSocket(wsUrl) as CustomWebSocket;

        ws.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
            showMessage('WebSocket error');
        });

        ws.addEventListener('open', () => {
            console.log('WebSocket connection established');
            showMessage(`WebSocket connection established for thread id ${threadId}`);
            ws!.send(JSON.stringify({ type: 'join', threadId }));
        });

        ws.addEventListener('close', () => {
            console.log('WebSocket connection closed');
            showMessage(`WebSocket connection closed for thread id ${threadId}`);
            if (ws?.pingTimeout) {
                if (typeof ws.pingTimeout === 'number') {
                    clearTimeout(ws.pingTimeout);
                } else {
                    clearTimeout(ws.pingTimeout as NodeJS.Timeout);
                }
            }
        });

        ws.addEventListener('message', (msg: MessageEvent) => {
            if (isBinary(msg.data)) {
                heartbeat();
            } else {
                try {
                    const data = JSON.parse(msg.data);
                    console.log('Received WebSocket message:', data);
                    const senderId = getCookie('userId');
                    if (data.type === 'threadMessages') {
                        data.messages.forEach((message: any) => {
                            showMessage(`${message.senderUsername}: ${message.content}`);
                        });
                    } else if (data.type === 'message') {
                        if (data.senderId !== senderId) {
                            showMessage(`${data.senderUsername}: ${data.content}`);
                        }
                    }
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            }
        });
    } catch (error) {
        console.error('Failed to initialize WebSocket connection:', error);
        showMessage('Failed to initialize WebSocket connection');
    }
}






(async function () {
    let loginForms = document.querySelectorAll('.login-form') as NodeListOf<HTMLElement>;
    let chatAreas = document.querySelectorAll('.chat-area') as NodeListOf<HTMLElement>;
    const messages = document.getElementById('messages') as HTMLElement;
    const messageArea = document.getElementById('message-area') as HTMLButtonElement;
    const login = document.getElementById('login') as HTMLButtonElement;
    const logout = document.getElementById('logout') as HTMLButtonElement;
    const wsSend = document.getElementById('ws-send') as HTMLButtonElement;
    const wsInput = document.getElementById('ws-input') as HTMLInputElement;
    const userDropdown = document.getElementById('user-dropdown') as HTMLSelectElement;
    const refreshUsers = document.getElementById('refresh-users') as HTMLButtonElement;

    async function fetchUsers() {
        try {
            const res = await fetch('/api/v1/users/user_list', {
                credentials: 'same-origin'
            });
            console.log('Fetch response status:', res.status);

            if (res.ok) {
                const users = await res.json();
                const userId = getCookie('userId');
                console.log('Fetched users:', users);
                userDropdown.innerHTML = ''; // Clear existing options

                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select a user';
                userDropdown.appendChild(defaultOption);

                // Add user options, excluding the current user
                users.forEach((user: any) => {
                    if (user.id !== userId) {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.username;
                        userDropdown.appendChild(option);
                    }
                });
            } else {
                showMessage('Error fetching users - 1');
                console.error('Error response fetching users:', res.status, res.statusText);
            }
        } catch (error) {
            showMessage('Error fetching users - 2');
            console.error('Fetch error:', error);
        }
    }

    login.addEventListener('click', async () => {
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;

        const res = await fetch('/api/v1/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include' // Ensure cookies are included in the request
        });

        console.log('Login response status:', res.status);
        const responseBody = await res.json();
        console.log('Login response body:', responseBody);

        if (res.ok) {
            const { token, userId } = responseBody;
            console.log(`User token: ${token}`);
            console.log(`User ID: ${userId}`);

            // Save the token to local storage
            localStorage.setItem('userToken', token);

            loginForms.forEach(form => form.style.display = 'none');
            chatAreas.forEach(area => area.style.display = 'block');

            showMessage('Logged in');

            // Wait for the cookie to be set before fetching users
            setTimeout(() => {
                console.log(`Document cookie after login: ${document.cookie}`);
                fetchUsers();
            }, 1500); // Adjust the delay as necessary
        } else {
            showMessage('Log in error');
            console.error('Login failed with status:', res.status);
        }
    });





    userDropdown.addEventListener('change', async () => {
        messageArea.style.display = 'block';
        const receiverId = userDropdown.value;
        const senderId = getCookie('userId');

        console.log(`Selected receiver ID: ${receiverId}`);
        console.log(`Sender ID from cookie: ${senderId}`);

        if (senderId && receiverId) {
            const threadId = await createThreadIfNotExists(senderId, receiverId);
            initConnection(threadId);
        } else {
            showMessage('Sender or receiver missing');
        }
    });


    refreshUsers.addEventListener('click', fetchUsers);


    wsInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    wsSend.addEventListener('click', sendMessage);


    async function sendMessage() {
        console.log('wsSend button clicked or Enter key pressed');

        const val = wsInput.value;
        const receiverId = userDropdown.value;
        const senderId = getCookie('userId');

        console.log(`Sender ID: ${senderId}`);
        console.log(`Receiver ID: ${receiverId}`);
        console.log(`Message: ${val}`);

        if (val && receiverId && senderId) {
            const threadId = await createThreadIfNotExists(senderId, receiverId);
            const senderUsername = getUsernameById(senderId);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'message', threadId, senderId, receiverId, senderUsername, content: val }));
                showMessage(`${senderUsername}: ${val}`);
                wsInput.value = '';
            } else {
                showMessage('WebSocket connection not open');
            }
        } else {
            showMessage('Message, sender, or receiver missing');
        }
    }



    async function createThreadIfNotExists(user1Id: string, user2Id: string): Promise<string> {
        const res = await fetch('/api/v1/threads/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user1_id: user1Id, user2_id: user2Id })
        });
        if (res.ok) {
            const thread = await res.json();
            return thread.id;
        } else {
            throw new Error('Failed to create or retrieve thread');
        }
    }

    function getUsernameById(userId: string): string | undefined {
        const users = Array.from(userDropdown.options).map(option => ({
            id: option.value,
            username: option.textContent || ''
        }));
        const user = users.find(user => user.id === userId);
        return user ? user.username : undefined;
    }


    logout.addEventListener('click', async () => {
        closeConnection();
        const res = await fetch('/api/v1/users/logout', {
            credentials: 'include' // Ensure cookies are included in the request
        });
        if (res.ok) {
            loginForms.forEach(form => form.style.display = 'block');
            chatAreas.forEach(area => area.style.display = 'none');
            showMessage('Logged out');
        } else {
            showMessage('Log out error');
        }
    });

    await fetchUsers();
    // Initial fetch of users
    // fetchUsers();
})();
