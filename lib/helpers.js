/*
*Helpers for various task
*
*/

//Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

//Container for all the helpers
const helpers = {}

//Declare value
helpers.alertType = {
    'success': '\x1b[32m%s\x1b[0m',
    'info': '\x1b[34m%s\x1b[0m',
    'warning': '\x1b[33m%s\x1b[0m',
    'error': '\x1b[31m%s\x1b[0m',
    'optional_info': '\x1b[35m%s\x1b[0m',
};

//Parse a JSON String to an Object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
};

//Create custom console.log with custom color
//TODO Request value: success, info, warning, error, optional_info
helpers.customConsole = function (alert, message) {

    //Check the validation of data
    const alertColor = typeof (helpers.alertType[alert]) !== 'undefined' ? alert : false;
    message = typeof message == 'string' && message.trim().length > 0 ? message : false;

    if (alertColor && message) {
        console.log(alert, message);
    } else {
        console.log(message);
    }
};

//Verify if email is valid
helpers.isEmail = function (email) {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(emailRegEx)) {
        return true;
    } else {
        return false;
    }
};

//Hash password with SHa256
helpers.hash = function (str) {
    str = typeof (str) === 'string' && str.trim().length > 0 ? str : false;
    if (str) {
        const hash = crypto.createHash('sha256').update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

//Create random string
helpers.createRandomString = function (length) {
    //check if length is number
    const lengthNumber = typeof (length) == 'number' ? length : false;
    if (length) {
        //Possible strings 
        const possibleStrings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomString = '';
        for (let i = 0; i < lengthNumber; i++) {
            randomString += possibleStrings.charAt(Math.floor(Math.random() * possibleStrings.length));
        }

        return randomString;

    } else {
        return '';
    }
};

//Check if string contains only digit
helpers.isNumber = function (str) {
    //check if parameters is not empty
    if (typeof (str) == 'string' && str.trim().length) {
        let isNum = /^\d+$/.test(str);

        if (isNum) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }

};

//Create Token Card to use for Stripe
//Giving paramaters: cardDetails(number, exp_month, exp_year, cvc)
//TODO This function will create a token with the card details to use in the checkout
helpers.createToken = function (cardDetails, callback) {
    //Check if parameters is valid
    const cardNumber = typeof (cardDetails.card.number) == 'string' && cardDetails.card.number.trim().length == 16 && helpers.isNumber(cardDetails.card.number.trim()) ? cardDetails.card.number.trim() : false;
    const expMonth = typeof (cardDetails.card.exp_month) == 'number' && cardDetails.card.exp_month > 0 ? cardDetails.card.exp_month : false;
    const expYear = typeof (cardDetails.card.exp_year) == 'number' ? cardDetails.card.exp_year : false;
    const cvc = typeof (cardDetails.card.cvc) == 'string' && cardDetails.card.cvc.trim() && cardDetails.card.cvc.trim().length == 3 && helpers.isNumber(cardDetails.card.cvc.trim()) ? cardDetails.card.cvc.trim() : false;

    if (cardNumber && expMonth && expYear && cvc) {

        //Configure the payload
        let payload = {
            'card': {
                'number': cardNumber,
                'exp_month': expMonth,
                'exp_year': expYear,
                'cvc': cvc
            },
        }

        //Convert the payload to foo[bar]=baz structures
        payload = helpers.convertFirstLevelDataStructure(payload);

        //stringify the payload
        const payloadString = querystring.stringify(payload);

        //Configure the request details
        const requestDetails = {
            'hostname': config.stripe.hostname,
            'path': '/v1/tokens',
            'method': 'POST',
            'headers': {
                'Authorization': 'Bearer ' + config.stripe.secretKey,
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payloadString),
            }
        };

        //Instantiate the request
        const req = https.request(requestDetails, function (res) {
            //Grab the status of the sent request
            const status = res.statusCode;
            //Callback successfully if the request went thought
            if (status == 200 || status == 201) {
                //Get the response data
                let data = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    data += chunk;
                });

                res.on('end', function () {
                    data = helpers.parseJsonToObject(data);
                    callback(data)
                })

            } else {
                callback('Something bad happened on the request. Code error: ' + status);
            }

        });

        //Bind to the error event so it doesnt get thrown
        req.on('error', function (e) {
            callback(e);
        });

        //Add the payload
        req.write(payloadString);

        //End the request
        req.end();

    } else {
        callback('Giving parameters are missing or invalid');
    }

};

//Create the charge to checkout
//Giving parameters: amount, currency, sources (id from token), description
//TODO This function will create a the request to charges the card
helpers.checkOut = function (chargeData, callback) {
    //Check if parameters is valid
    const amount = typeof (chargeData.amount) == 'string' && chargeData.amount.trim().length ? chargeData.amount.trim() : false;
    const currency = typeof (chargeData.currency) == 'string' && chargeData.currency.trim().length ? chargeData.currency.trim() : false;
    const source = typeof (chargeData.source) == 'string' && chargeData.source.trim().length ? chargeData.source.trim() : false;
    const description = typeof (chargeData.description) == 'string' ? chargeData.description.trim() : false;

    if (amount && currency && source) {

        //if valid, create object to do a request
        let payload = {
            'amount': amount,
            'currency': currency,
            'source': source,
            'description': description
        };

        //Convert data structure to foo[bar] = baz
        payload = helpers.convertFirstLevelDataStructure(payload);

        //stringify the payload
        const payloadString = querystring.stringify(payload);

        //Configure the request details
        const requestDetails = {
            'hostname': config.stripe.hostname,
            'path': '/v1/charges',
            'method': 'POST',
            'headers': {
                'Authorization': 'Bearer ' + config.stripe.secretKey,
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payloadString),
            }
        }

        //Instantiate the request
        const req = https.request(requestDetails, function (res) {
            //Grab the status of the sent request
            const status = res.statusCode;
            //Callback successfully if the request went thought
            if (status == 200 || status == 201) {
                //Get the response data
                let data = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    data += chunk;
                });

                res.on('end', function () {
                    data = helpers.parseJsonToObject(data);
                    callback(data)
                });

            } else {
                callback('Something bad happened on the request. Code error: ' + status);
            }

        });

        //Bind to the error event so it doesnt get thrown
        req.on('error', function (e) {
            callback(e);
        });

        //Add the payload
        req.write(payloadString);

        //End the request
        req.end();



    } else {
        callback('giving parameters is missing or invalid');
    }
};

//Convert deep data structure to foo[bar]=baz
helpers.convertFirstLevelDataStructure = function (data) {
    Object.keys(data).forEach(function (key) {
        if (typeof data[key] == 'object' && data[key] != 'null') {
            var o = data[key];
            delete data[key];
            Object.keys(o).forEach(function (k) {
                var new_key = key + '[' + k + ']';
                data[new_key] = o[k];
            });
        }
    });

    return data;
};

//Create Token Card to use for Stripe
//Giving paramaters: cardDetails(number, exp_month, exp_year, cvc)
//TODO This function will create a token with the card details to use in the checkout
helpers.sendEmail = function (email, subject, message, callback) {
    //Check if data is valid
    email = typeof email == 'string' && email.trim().length && helpers.isEmail(email.trim()) ? email.trim() : false;
    subject = typeof subject == 'string' && subject.trim().length ? subject.trim() : false;
    message = typeof message == 'string' && message.trim().length ? message.trim() : false;

    if (email && subject && message) {

        //Create the payload object
        const payload = {
            from: config.mailgun.from,
            to: email,
            subject: subject,
            html: message
        };

        const payloadString = querystring.stringify(payload);

        //create the request details
        let requestDetails = {
            'hostname': config.mailgun.hostname,
            'path': '/v3/' + config.mailgun.domain + '/messages',
            'method': 'POST',
            'headers': {
                'Authorization': 'Basic ' + Buffer.from('api:' + config.mailgun.apiKey).toString('base64'),
                'Content-type': 'application/x-www-form-urlencoded',
                'Content-length': Buffer.byteLength(payloadString)
            }
        };

        //Instantiate the request
        const req = https.request(requestDetails, function (res) {

            //Grab the status of the sent request
            const status = res.statusCode;
            if (status == 200 || status == 201) {
                callback(true);
            } else {
                console.log(status)
                callback('Something bad happened on the request. Code error: ' + status);
            }
        });

        //Bind to the error request error so it doesn't thrown
        req.on('error', function (e) {
            console.log(e)
            callback(e);
        });

        //Send the request payload
        req.write(payloadString);

        //End the request
        req.end();

    } else {
        callback('Missing giving parameters.');
    }

};

//Create Template html for receipt
helpers.createHtmlTemplate = function (receiptData) {
    //Check if it's an object
    if (typeof receiptData == 'object') {

        let html = "<h1>RECEIPT ORDER Pizza-Delivery </h1>",
            total = 0,
            i = 0;

        html += '<p> Name:' + receiptData.name + '</p>';
        html += '<p> Email:' + receiptData.email + '</p>';
        html += '<p> Address:' + receiptData.address + '</p>';
        html += '<p> Date: ' + new Date().toString() + '</p>';

        //Create html and populated data
        html += "<table><thead><tr>";
        html += "<th>#</th> <th>Name</th> <th>Qty</th> <th>Price Unt</th> <th>Price Total</th></tr>";
        receiptData.cart.forEach(function (item) {
            html += "<tr>";
            html += "<td>" + (i + 1) + "</td>";
            html += "<td>" + item.name + "</td>";
            html += "<td>" + item.quantity + "</td>";
            html += "<td>" + item.priceUnit + " $USD" + "</td>";
            html += "<td>" + (item.quantity * item.priceUnit) + " $USD" + "</td>";
            total += item.quantity * item.priceUnit;
        });

        html += '<tr><td colspan = "5" style = "text-align:right; padding:10px;">';
        html += '<strong> Sub Total: </strong >' + total + ' $USD</td ></tr >';
        html += '<p> Stripe Receipt: ' + receiptData.stripeReceipt + '</p>';


        return html;
    } else {
        return "";
    }
};



//Exports the module
module.exports = helpers;