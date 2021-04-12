/*
*Library for storing and Reading data from file
*
*/

//Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

//Container module to export
const lib = {};

//Base directory for storing and reading data
lib.baseDir = path.join(__dirname, '/../.data/');

//Write data to file
lib.create = function (dir,file,data,callback) {
    //Open the file 
    fs.open(lib.baseDir+ dir + '/' + file + '.json', 'wx', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            //Convert data to string
            const dataString = JSON.stringify(data);
            //Write in file and close it
            fs.writeFile(fileDescriptor, dataString, function (err) {
                if (!err) {
                    fs.close(fileDescriptor, function (err) {
                        if (!err) {
                            callback(false);
                        } else {
                            console.log('Error closing new file');
                        }
                    });
                } else {
                    console.log('Error writing on new file');
                }
            });
        } else {
            console.log('Could not create new file, it may already existed');
        }
    });
};

//Read the file
lib.read = function (dir, file, callback) {
    //Read the file
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', function (err, data) {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err,data);
        }
    });
};

//Update the file
lib.update = function (dir, file, data, callback) {
    //Open the file to write 
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function (err, fileDescriptor) {
        if (!err && fileDescriptor) {
            //Convert data to String
            const dataString = JSON.stringify(data);

            //Truncate the file
            fs.ftruncate(fileDescriptor, function (err) {
                if (!err) {
                    //Write in the file
                    fs.writeFile(fileDescriptor, dataString, function (err) {
                        if (!err) {
                            //close the file
                            fs.close(fileDescriptor, function (err) {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the updated file');
                                }
                            });
                        } else {
                            callback('Could not write on the file, It may not existed');
                        }
                    });
                } else {
                    callback('Error truncating the file');
                }
            });
        } else {
            callback('Could not open the file for updating, It may already existed');
        }
    });
};

//Deleting a file
lib.delete = function (dir, file, callback) {
    //Unlink the file
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function (err) {
        if (!err) {
            callback(false);
        } else {
            callback('Could not deleting the file');
        }
    });
};

//List all of items in a directory
lib.list = function (dir, callback) {
    //Read all file in the directory
    fs.readdir(lib.baseDir + dir + '/', function (err, data) {
        if (!err && data && data.length > 0) {
            var trimmedFileNames = [];
            data.forEach(function (fileName) {
                trimmedFileNames.push(fileName.replace('.json',''));
            });
            callback(false, trimmedFileNames);
        } else {
            callaback(err,data);
        }
    });
};

lib.extractData = function (dir, file) {
    const data = fs.readFileSync(lib.baseDir + dir + '/' + file + '.json', 'utf8');

    if (data?.length) {
        return helpers.parseJsonToObject(data);
    } else {
        return {};
    }
};


//Export the module
module.exports = lib;

