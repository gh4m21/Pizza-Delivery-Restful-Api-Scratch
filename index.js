/*
* Primary file for the API
*
*/

//Dependencies
const server = require('./lib/server');

//Declare the app
const app = {};

//Init function
app.init = function () {
    //Init server
    server.init();
};

//Execute the function
app.init();

//exports the module
module.exports = app;