/*
*Server-Related tasks
*
*/

//Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
const helpers = require('./helpers');
const config = require('./config');
const handlers = require('./handlers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

//Instantiate the server module
const server = {};

//Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});


//Instantiate the HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
    server.unifiedServer(req, res);
});


//All the server logic for both http and https server
server.unifiedServer = function (req, res) {
    //Get the parsed url
    const parsedUrl = url.parse(req.url, true);

    //Get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    //Get the query string from the url
    const queryStringObject = parsedUrl.query;

    //Get the HTTP method
    const method = req.method.toLowerCase();

    //Get the Headers
    const headers = req.headers

    //Get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', function (data) {
        buffer += decoder.write(data);
    });

    req.on('end', function () {
        buffer += decoder.end();

        //Choose the handler the request should go on. IF NOT FOUND, He will go to not found handler
        const chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        //Construct the data object to send the handlers
        const data = {
            'url': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        //Route the request to the handler specified in the router
        chosenHandler(data, function (statusCode, payload) {
            //Use the status code called back by the handler, or use default 200
            statusCode = typeof statusCode === 'number' ? statusCode : 200;

            //Use the payload called back by the handler or use empty object
            payload = typeof payload === 'object' ? payload : {};

            //Convert the payload to a string
            const payloadString = JSON.stringify(payload);

            //Return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
            //If the response is 200, print success else print red
            if (statusCode === 200) {
                debug(helpers.alertType.success, method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            } else {
                debug(helpers.alertType.error, method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            }

        });
    });
};


//Define the request router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'menu': handlers.menu,
    'cart': handlers.cart,
    'order': handlers.orders,
};

//Init script
server.init = function () {
    //Start the HTTP server
    server.httpServer.listen(config.httpPort, function () {
        console.log(helpers.alertType.optional_info, "The server is listenning on port " + config.httpPort);
    });

    //Start the HTTPS server

    server.httpsServer.listen(config.httpsPort, function () {
        console.log(helpers.alertType.success, "The server is listenning on port " + config.httpsPort);
    });

}

//Export the module
module.exports = server;