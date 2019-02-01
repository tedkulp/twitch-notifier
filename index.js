const express = require('express');
const asyncHandler = require('express-async-handler');
const { createServer } = require('http');
const bodyParser = require('body-parser');
require('dotenv').config();

const handler = require('./handler');

const app = express();
const http = createServer(app);

app.use(bodyParser.json({
    verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            req['rawBody'] = buf.toString(encoding || 'utf8');
        }
    },
}));

app.get('/dev/webhook', asyncHandler(handler.webhookGet));
app.post('/dev/webhook', asyncHandler(handler.webhookPost));
app.post('/dev/register', asyncHandler(handler.register));
app.post('/dev/unregister', asyncHandler(handler.unregister));

const port = process.env.port || 3000;
http.listen(port, () => {
    console.log(`now listening for requests on port ${port}`);
});
