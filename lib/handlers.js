/*
*Request handlers
*
*/

//Dependencies
const helpers = require('./helpers');
const _data = require('./data');

//Container for all Handlers
const handlers = {};

//Users
handlers.users = function (data, callback) {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for the users submethods
handlers._users = {};

//Post - Users
//Required Data: name, email, streetAddress, password
//optional data: None
handlers._users.post = function (data, callback) {
    //Check all the data required
    const name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
    const email = typeof (data.payload.email) == 'string' && data.payload.email.trim().length > 0 > 0 && helpers.isEmail(data.payload.email.trim()) ? data.payload.email.trim() : false;
    const streetAddress = typeof (data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 0 > 0 ? data.payload.streetAddress.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 > 0 ? data.payload.password.trim() : false;

    //Check if all data is valid
    if (name && email && streetAddress && password) {
        //Verify if email already exists
        _data.read('users', email, function (err) {
            if (err) {
                //hashed the password
                const hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    const userObject = {
                        'email': email,
                        'hashedPassword': hashedPassword,
                        'name': name,
                        'streetAddress': streetAddress,
                        'dateCreation': Date.now(),
                        "lastModified": "",
                    };

                    //Store the user in the file
                    _data.create('users', email, userObject, function (err) {
                        if (!err) {
                            callback(200, userObject);
                        } else {
                            console.log(err);
                            callback(500, { 'Error': 'Could not create new user' });
                        }
                    });
                } else {
                    callback(500, { 'Error': 'Error hashing password' });
                }

            } else {
                callback(400, { 'Error': 'Email already exists' });
            }
        });
    } else {
        callback(400, { 'Error': 'Required fields missing.' });
    }
};

//Get - Users
//Required Data: email
//Optional Data: None
//TODO: Only user with valid token can read user data
handlers._users.get = function (data, callback) {
    //Check if email is valid
    const email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 && helpers.isEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.trim() : false;
    //If email is valid.
    if (email) {

        //Check if user is authentificated with given token
        const tokenId = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

        handlers._tokens.verifyToken(tokenId, email, function (tokenIsValid) {
            if (tokenIsValid) {

                //Lookup and read data
                _data.read('users', email, function (err, data) {
                    if (!err && data) {
                        //Delete the hash password from the result
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(400);
                    }
                });

            } else {
                callback(403, { 'Error': 'User unauthorized to read user data' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
};

//Put - Users
//Required Data: email
//Optional Data: name, streetAddress
//TODO: Only user with valid token can update user data
handlers._users.put = function (data, callback) {
    //Check all data request
    const email = typeof (data.payload.email) == 'string' && data.payload.email.trim().length > 0 && helpers.isEmail(data.payload.email.trim()) ? data.payload.email.trim() : false;
    const name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
    const streetAddress = typeof (data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 0 > 0 ? data.payload.streetAddress.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 > 0 ? data.payload.password.trim() : false;

    //Check if email is valid
    if (email) {

        //Check if user is authentificated with given token
        const tokenId = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

        handlers._tokens.verifyToken(tokenId, email, function (tokenIsValid) {
            if (tokenIsValid) {

                //Check if there is data to update, if not don't update
                if (name || streetAddress || password) {

                    //Lookup for data user
                    _data.read('users', email, function (err, dataUser) {
                        if (!err && dataUser) {

                            //If no data, don't update
                            if (name) {
                                dataUser.name = name;
                            }

                            if (streetAddress) {
                                dataUser.streetAddress = streetAddress;
                            }

                            if (password) {
                                dataUser.hashedPassword = helpers.hash(password);
                            }

                            //Last modified users
                            dataUser.lastModified = Date.now();

                            //Store new data to user
                            _data.update('users', email, dataUser, function (err) {
                                if (!err) {
                                    callback(200, dataUser);
                                } else {
                                    callback(500, { 'Error': 'Cannot updated user' });
                                }
                            });

                        } else {
                            callback(400, { 'Error': 'User does not exists' });
                        }
                    });

                } else {
                    callback(400, { 'Error': 'There is no data to update' });
                }
            } else {
                callback(403, { 'Error': 'User unauthorized to update user data' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing Required fields.' });
    }

};

//Delete - Users
//Required Data: email
//Optional Data: none
//TODO: Only user with valid token can delete user data
handlers._users.delete = function (data, callback) {
    //Check if required data is valid
    const email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 && helpers.isEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.trim() : false;

    if (email) {

        //Check if user is authentificated with given token
        const tokenId = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token : false;

        handlers._tokens.verifyToken(tokenId, email, function (tokenIsValid) {
            if (tokenIsValid) {

                //Lookup on data to verify if user exist
                _data.read('users', email, function (err, dataUser) {
                    if (!err && dataUser) {

                        //Delete user
                        _data.delete('users', email, function (err) {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, { 'Error': 'Cannot delete user' });
                            }
                        });
                    } else {
                        callback(400, { 'Error': 'User does not exist' });
                    }
                });
            } else {
                callback(403, { 'Error': 'User unauthorized to delete user data' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }

};

//Tokens
handlers.tokens = function (data, callback) {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for the Token submethods
handlers._tokens = {};

//Post - Token
//Required Data: email, password
//Optional Data: none
handlers._tokens.post = function (data, callback) {
    //Check validity of all required fields
    const email = typeof (data.payload.email) == 'string' && data.payload.email.trim().length > 0 && helpers.isEmail(data.payload.email.trim()) ? data.payload.email.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (email && password) {
        //Check if there is associated user with the email
        _data.read('users', email, function (err, dataUser) {
            if (!err && dataUser) {

                //Hash password and compare it to user hashedPassword
                const hashedPassword = helpers.hash(password);
                if (hashedPassword == dataUser.hashedPassword) {
                    //If password valid create data and object data for token
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 60 * 60 * 1000;
                    const objectData = {
                        'email': dataUser.email,
                        'tokenId': tokenId,
                        'expires': expires
                    };

                    //Store token 
                    _data.create('tokens', tokenId, objectData, function (err) {
                        if (!err) {
                            callback(200, objectData);
                        } else {
                            callback(500, { 'Error': 'Could not create token for this user' });
                        }
                    });

                } else {
                    callback(400, { 'Error': 'Password is incorrect' });
                }

            } else {
                callback(400, { 'Error': 'User with this email does not exist.' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
}

//Get - Token
//Required Data: id
//Optional Data: none
handlers._tokens.get = function (data, callback) {
    //Check if token is valid
    const tokenId = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (tokenId) {
        //Get token data
        _data.read('tokens', tokenId, function (err, dataToken) {
            if (!err && dataToken) {
                callback(200, dataToken);
            } else {
                callback(400);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
};

//Put - Token
//Required Data: tokenId, extend
//Optional Data: none
//TODO We can not extend the time of a token that expires
handlers._tokens.put = function (data, callback) {
    //Check all required fields
    const tokenId = typeof (data.payload.tokenId) == 'string' && data.payload.tokenId.trim().length == 20 ? data.payload.tokenId.trim() : false;
    const extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend ? data.payload.extend : false;
    if (tokenId && extend) {

        //get data associated with the tokenId
        _data.read('tokens', tokenId, function (err, dataToken) {
            if (!err && dataToken) {

                //check if token is expires
                if (dataToken.expires > Date.now()) {

                    //Add new expires data to dataToken object
                    const expires =
                        dataToken.expires = Date.now() + 60 * 60 * 1000;;

                    //Store the new token data
                    _data.update('tokens', dataToken.tokenId, dataToken, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { 'Error': 'Could nt extend the token data' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Can not update token that is expired' });
                }
            } else {
                callback(400, { 'Error': 'No token data associated with the tokenId' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
};

//Delete - Token
//Required Data: tokenId
//Optional Data: none
handlers._tokens.delete = function (data, callback) {
    //Check if required fields is valid
    const tokenId = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (tokenId) {

        //check if token exists
        _data.read('tokens', tokenId, function (err, dataToken) {
            if (!err && tokenId) {

                //Delete token
                _data.delete('tokens', tokenId, function (err) {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { 'Error': 'Could not delete token' });
                    }
                });
            } else {
                callback(400, { 'Error': 'Token does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

//Function to check if Token is valid for given email
//Required data: tokenId, email
//Optional data: none
handlers._tokens.verifyToken = function (tokenId, email, callback) {
    //Lookup the Token data 
    _data.read('tokens', tokenId, function (err, dataToken) {
        if (!err && dataToken) {

            //check if token email is equal to given email and check if token is expires
            if (dataToken.email == email && dataToken.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

//Menus
handlers.menu = function (data, callback) {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._menu[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for the Menus submethods
handlers._menu = {};

//Post - Menu
//Required data: name, description, price, quantity
//Optional data: none
handlers._menu.post = function (data, callback) {
    //Check validity of required fields
    const name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
    const description = typeof (data.payload.description) == 'string' && data.payload.description.trim().length > 0 ? data.payload.description.trim() : false;
    const price = typeof (data.payload.price) == 'string' && data.payload.price >= 0 ? data.payload.price : false;
    const quantity = typeof (data.payload.quantity) == 'string' && data.payload.quantity >= 0 ? data.payload.quantity : false;

    if (name && description && price && quantity) {

        //Create id of item 
        const id = helpers.createRandomString(10);

        const dateCreation = Date.now();

        //Create object data for menu item
        const objectMenuItem = {
            'id': id,
            'name': name,
            'description': description,
            'price': price,
            'quantity': quantity,
            'dateCreation': dateCreation,
        }

        //Store data for menu item
        _data.create('menu', id, objectMenuItem, function (err) {
            if (!err) {
                callback(200);
            } else {
                callback(500, { 'Error': 'Could not created menu item' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
};

//Get - menu
//Required data: email,token from headers
//Optional Data: none
//TODO: Only user with valid token can grab all the possible item in the menu
handlers._menu.get = function (data, callback) {
    //Check if there is valid token and if user is authentificated
    const tokenId = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;
    const email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 && helpers.isEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.trim() : false;

    if (email) {
        handlers._tokens.verifyToken(tokenId, email, function (tokenIsValid) {

            //if token is valid, grab all possibles item in the menu
            if (tokenIsValid) {

                //Lookup in the file data and grab all possible menu id of Item
                _data.list('menu', function (err, menuListId) {
                    if (!err && menuListId?.length) {

                        //Lookup in each item and grab data to add in menu list object
                        let menuList = [];

                        menuListId.forEach(function (idItem) {
                            //Lookup data
                            menuList.push(_data.extractData('menu', idItem));
                        });

                        //If there is data, send response else send error to read data
                        if (menuList?.length) {
                            callback(200, menuList);
                        } else {
                            callback(500, { 'Error': 'Could not read data' });
                        }


                    } else {
                        callback(400, { 'Error': 'Could not read data in the menu item' });
                    }
                });

            } else {
                callback(403, { 'Error': 'User unauthorized to do this request' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }

};


//put - Menu
//Required data: id
//optional data: name, description, price, quantity
handlers._menu.put = function (data, callback) {
    //Check if Required fields is valid
    const id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 10 ? data.payload.id.trim() : false;
    const name = typeof (data.payload.name) == 'string' && data.payload.name.trim().length > 0 ? data.payload.name.trim() : false;
    const description = typeof (data.payload.description) == 'string' && data.payload.description.trim().length > 0 ? data.payload.description.trim() : false;
    const price = typeof (data.payload.price) == 'string' && data.payload.price.trim().length > 0 ? data.payload.price.trim() : false
    const quantity = typeof (data.payload.quantity) == 'string' && data.payload.quantity.trim().length > 0 ? data.payload.quantity.trim() : false;
    if (id) {

        //Check if exist data to update
        if (name || description || price || quantity) {

            //Check if id data is exist
            _data.read('menu', id, function (err, dataMenu) {
                if (!err && dataMenu) {

                    //Add data to dataMenu
                    if (name) {
                        dataMenu.name = name;
                    }

                    if (description) {
                        dataMenu.description = description;
                    }

                    if (price) {
                        dataMenu.name = price;
                    }

                    if (quantity) {
                        dataMenu.quantity = quantity;
                    }

                    //Store data in data file
                    _data.update('menu', id, dataMenu, function (err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { 'Error': 'Could not update menu item' });
                        }
                    });

                } else {
                    callback(400, { 'Error': 'Item does not exists' });
                }
            });
        } else {
            callback(400, { 'Error': 'There is no data to update' });
        }
    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

//delete - menu
//Required Data: id
//Optional data : none
handlers._menu.delete = function (data, callback) {
    //Check required fields
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 10 ? data.queryStringObject.id.trim() : false;
    if (id) {

        //Check if item exists
        _data.read('menu', id, function (err, dataMenu) {
            if (!err && dataMenu) {

                //Delete the menu item
                _data.delete('menu', id, function (err) {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { 'Error': 'Could not delete menu item' });
                    }
                });
            } else {
                callback(400, { 'Error': 'Item not found' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
};

//Cart
handlers.cart = function (data, callback) {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._cart[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for the Cart submethods
handlers._cart = {};

//post - cart
//Required Data: email, shoppingCart{itemId (from menu), quantity}
//Optional data:none
//TODO Only user with token can be able to fill shopping cart
handlers._cart.post = function (data, callback) {
    //Check if required data is valid
    const email = typeof (data.payload.email) == 'string' && data.payload.email.trim().length > 0 ? data.payload.email.trim() : false;
    const shoppingCart = typeof (data.payload.shoppingCart) == 'object' && data.payload.shoppingCart?.length ? data.payload.shoppingCart : false;
    const tokenId = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;

    if (email) {

        //Check if user is authentificated
        handlers._tokens.verifyToken(tokenId, email, function (tokenIsValid) {
            if (tokenIsValid) {

                //Check validity of data shoppingCart and get dataMenu
                let details = [];
                shoppingCart.forEach(function (itemCart) {
                    //Create object cart for each item 
                    let object = {
                        'id': itemCart.id,
                        'name': '',
                        'quantity': itemCart.quantity,
                        'priceUnit': 0,
                    };
                    //Get data from id
                    let tempData = _data.extractData('menu', itemCart.id);
                    object.name = tempData.name;
                    object.priceUnit = tempData.price;

                    if (typeof (itemCart.quantity) == 'number' && itemCart.quantity > 0) {
                        details.push(object);
                    } else {
                        console.log('Quantity is not number or less than 0');
                    }
                });

                if (details) {

                    //If shopping cart is not empty, Create object data for Shoppingcart
                    let objectDataCart = {
                        'id': helpers.createRandomString(10),
                        'email': email,
                        'shoppingCart': details,
                        'checkout': false,
                        dateCreation: Date.now(),
                    };

                    //Store data in file
                    _data.create('cart', objectDataCart.id, objectDataCart, function (err) {
                        if (!err) {

                            callback(200, objectDataCart);
                        } else {
                            callback(500, { 'Error': 'Could not create shopping cart ' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Shopping Cart do not have data' });
                }

            } else {
                callback(403, { 'Error': 'User is not authentificated, could not make this request' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }

};

//Get - Cart
//Required Data: id, email, token (from Headers)
//Optional Data: none
handlers._cart.get = function (data, callback) {
    //Check if Required data is valid
    const idCart = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 10 ? data.queryStringObject.id.trim() : false;
    const email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 && helpers.isEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.trim() : false;
    const tokenId = typeof (data.queryStringObject.token) == 'string' && data.queryStringObject.token.trim() == 20 ? data.queryStringObject.token.trim() : false;

    if (email || idCart || tokenId) {

        //Check if user is authentificated
        handlers._tokens.verifyToken(tokenId, email, function (tokenIsValid) {
            if (tokenIsValid) {

                //Lookup on data idCart
                _data.read('cart', idCart, function (err, dataCart) {
                    if (!err && dataCart) {

                        callback(200, dataCart);
                    } else {
                        callback(500, { 'Error': 'Data does not exists for this id' });
                    }
                });
            } else {
                callback(500, { 'Error': 'User is not authentificated, caould not make request' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
};

//Delete - Cart
//Required Data: id, email (from queryString) token(from Headers)
//Optional Data: none
handlers._cart.delete = function (data, callback) {
    //Check if Required data is valid
    const idCart = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 10 ? data.queryStringObject.id.trim() : false;
    const email = typeof (data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 0 && helpers.isEmail(data.queryStringObject.email.trim()) ? data.queryStringObject.email.trim() : false;
    const tokenId = typeof (data.headers.token) == 'string' && data.headers.token.trim() == 20 ? data.headers.token.trim() : false;

    if (email || idCart || tokenId) {

        //Check if user is authentificated
        handlers._tokens.verifyToken(tokenId, email, function (tokenIsValid) {
            if (tokenIsValid) {

                //delete cart
                _data.delete('cart', idCart, function (err) {
                    if (!err) {

                        callback(200);
                    } else {
                        callback(500, { 'Error': 'Cart Could not be delete' });
                    }
                });
            } else {
                callback(500, { 'Error': 'User is not authentificated, could not make request' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }
};

//Orders
handlers.orders = function (data, callback) {
    let acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._orders[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for the Cart submethods
handlers._orders = {};

//post - Orders
//Required Data: id(from Cart), email, token(headers), CardDetails{number, exp_month, exp_year,cvc}
//Optional data:none
handlers._orders.post = function (data, callback) {
    //Check if required data is valid
    const id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 10 ? data.payload.id.trim() : false;
    const email = typeof (data.payload.email) == 'string' && data.payload.email.trim().length > 0 && helpers.isEmail(data.payload.email.trim()) ? data.payload.email.trim() : false;
    const token = typeof (data.headers.token) == 'string' && data.headers.token.trim().length == 20 ? data.headers.token.trim() : false;
    const cardNumber = typeof (data.payload.cardDetails.number) == 'string' && data.payload.cardDetails.number.trim().length == 16 && helpers.isNumber(data.payload.cardDetails.number.trim()) ? data.payload.cardDetails.number.trim() : false;
    const expMonth = typeof (data.payload.cardDetails.exp_month) == 'number' && data.payload.cardDetails.exp_month > 0 ? data.payload.cardDetails.exp_month : false;
    const expYear = typeof (data.payload.cardDetails.exp_year) == 'number' ? data.payload.cardDetails.exp_year : false;
    const cvc = typeof (data.payload.cardDetails.cvc) == 'string' && data.payload.cardDetails.cvc.trim() && data.payload.cardDetails.cvc.trim().length == 3 && helpers.isNumber(data.payload.cardDetails.cvc.trim()) ? data.payload.cardDetails.cvc.trim() : false;

    if (id &&
        email &&
        token &&
        cardNumber &&
        expMonth &&
        expYear &&
        cvc) {

        //Check if user is authentificated
        handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
            if (tokenIsValid) {

                //Get data of user
                _data.read('users', email, function (err, dataUser) {
                    if (!err && dataUser) {

                        //get data of the cart
                        _data.read('cart', id, function (err, dataCart) {
                            if (!err && dataCart) {

                                //Check if this cart was not checkout
                                if (!dataCart.checkout) {

                                    //Calculate total amount of the cart
                                    let totalAmount = 0;
                                    dataCart.shoppingCart.forEach(function (item) {
                                        totalAmount += item.quantity * item.priceUnit;
                                    });
                                    totalAmount = totalAmount * 100;

                                    //Create the object for checkOut
                                    let payloadCard = {
                                        'card': {
                                            'number': cardNumber,
                                            'exp_month': expMonth,
                                            'exp_year': expYear,
                                            'cvc': cvc,
                                            'name': dataUser.name,
                                        }
                                    };

                                    //Create token to checkOut
                                    helpers.createToken(payloadCard, function (dataTokenPayment) {
                                        if (typeof (dataTokenPayment) == 'object' && dataTokenPayment) {

                                            //Create the payload checkout
                                            let payloadCharge = {
                                                'amount': totalAmount.toString(),
                                                'currency': 'USD',
                                                'source': dataTokenPayment.id,
                                                'description': 'Total Order'
                                            }

                                            //Checkout order
                                            helpers.checkOut(payloadCharge, function (chargeData) {
                                                if (typeof (chargeData) == 'object' && chargeData) {

                                                    //Create object to store data orders
                                                    let payloadOrder = {
                                                        'id': helpers.createRandomString(10),
                                                        'idCart': dataCart.id,
                                                        'idTransaction': chargeData.id,
                                                        'email': dataUser.email,
                                                        'totalAmount': payloadCharge.amount / 100 + ' $' + payloadCharge.currency,
                                                        'dateCreation': Date.now(),
                                                        'status': 'success'
                                                    };

                                                    //Store the Order object
                                                    _data.create('orders', payloadOrder.id, payloadOrder, function (err) {
                                                        if (!err) {

                                                            //Change checkout in cart to true and add modification date
                                                            dataCart.checkout = true;
                                                            dataCart.dateModification = Date.now();

                                                            //Edit the new cart
                                                            _data.update('cart', dataCart.id, dataCart, function (err) {
                                                                if (!err) {

                                                                    //Create object for order receipt
                                                                    let payloadReceipt = {
                                                                        'name': dataUser.name,
                                                                        'email': dataUser.email,
                                                                        'address': dataUser.streetAddress,
                                                                        'stripeReceipt': chargeData.receipt_url,
                                                                        'cart': dataCart.shoppingCart,
                                                                        'subject': 'Your order is placed successfully'
                                                                    };

                                                                    //Create template htlm for receipt
                                                                    const receipt = helpers.createHtmlTemplate(payloadReceipt);
                                                                    //Send Email to notify user
                                                                    helpers.sendEmail(dataUser.email, payloadReceipt.subject, receipt, function (isEmailSent) {
                                                                        if (typeof isEmailSent == 'boolean' && isEmailSent) {
                                                                            callback(200, payloadOrder);
                                                                        } else {
                                                                            callback(500, { 'Error': 'Order paid successfully but Email not sent' });
                                                                        }
                                                                    });


                                                                } else {
                                                                    callback(500, { 'Error': 'Could not edit the cart' });
                                                                }
                                                            });

                                                        } else {
                                                            callback(500, { 'Error': 'Could not create Order for this cart' });
                                                        }
                                                    });

                                                } else {
                                                    callback(402, { 'Error': chargeData });
                                                }
                                            });

                                        } else {
                                            callback(402, { 'Error': dataTokenPayment });
                                        }
                                    });

                                } else {
                                    callback(400, { 'Error': 'Could not get data of cart' });
                                }
                            } else {
                                callback(400, { 'Error': 'This cart has already paid' });
                            }

                        });
                    } else {
                        callback(400, { 'Error': 'Could not get data of user' });
                    }
                });
            } else {
                callback(500, { 'Error': 'User is not authentificated, could not make request' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing Required fields' });
    }

};

//Ping handler
handlers.ping = function (data, callback) {
    callback(200);
}

//Not found handler
handlers.notFound = function (data, callback) {
    callback(404);
};

//Export the module
module.exports = handlers;