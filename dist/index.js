"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routers_1 = __importDefault(require("./routers"));
const sockets_1 = __importDefault(require("./sockets"));
const http_1 = __importDefault(require("http"));
const utils_1 = require("./utils");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3107;
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)(utils_1.COOKIE_SECRET));
// Serve static files from the 'dist' directory
const staticPath = path_1.default.join(__dirname);
console.log(`__dirname: ${__dirname}`);
console.log(`Resolved static path: ${staticPath}`);
app.use(express_1.default.static(staticPath));
(0, routers_1.default)(app, staticPath);
console.log(`Attempting to run server on port ${port}`);
const server = http_1.default.createServer(app);
(0, sockets_1.default)(server);
server.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
