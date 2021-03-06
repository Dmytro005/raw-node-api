const _performance = require("perf_hooks").performance;
const util = require("util");
const debug = util.debuglog("performance");

const _data = require("../../common/data");
const helpers = require("../../common/helpers");

// Tokens controller
const TokensController = {
    // Tokens post
    // Reqired data: phone, token
    post: function(data, callback) {
        _performance.mark("Entered function");
        let { phone, password } = data.payload;
        phone =
            typeof phone == "string" && phone.trim().length === 10
                ? phone.trim()
                : false;
        password =
            typeof password == "string" && password.trim().length > 0
                ? password.trim()
                : false;

        _performance.mark("Inputs validated");
        if (phone && password) {
            _performance.mark("Beginning user lookup");
            _data.read("users", phone, function(err, data) {
                _performance.mark("User lookup completed");
                if (!err) {
                    // Hash sent password and compare it with stored password
                    _performance.mark("Beginning password hashing");
                    const hashedPassword = helpers.hash(password);
                    _performance.mark("Password hashing complete");
                    if (hashedPassword === data.hashedPassword) {
                        _performance.mark("Creating data for token");
                        const tokenId = helpers.createRamdomString(20);
                        const expires = Date.now() + 1000 * 60 * 60;
                        const tokenObject = {
                            phone,
                            id: tokenId,
                            expires
                        };
                        _performance.mark("Beginning storing token");
                        _data.create("tokens", tokenId, tokenObject, function(
                            err
                        ) {
                            _performance.mark("Storing token complete");

                            // Gather all the measutements
                            _performance.measure(
                                "Complete token.post function",
                                "Entered function",
                                "Storing token complete"
                            );
                            _performance.measure(
                                "Data valifdation",
                                "Entered function",
                                "Inputs validated"
                            );
                            _performance.measure(
                                "User lookup",
                                "Beginning user lookup",
                                "User lookup completed"
                            );
                            _performance.measure(
                                "Password hashing",
                                "Beginning password hashing",
                                "Password hashing complete"
                            );
                            _performance.measure(
                                "Token data creation",
                                "Creating data for token",
                                "Storing token complete"
                            );
                            _performance.measure(
                                "Token storing",
                                "Beginning storing token",
                                "Storing token complete"
                            );

                            // Log out all the measurements
                            const measurements = _performance.getEntriesByType(
                                "measure"
                            );

                            measurements.forEach(function(measurement) {
                                debug(
                                    "\x1b[33m%s\x1b[0m",
                                    measurement.name +
                                        " " +
                                        measurement.duration +
                                        " ms"
                                );
                            });

                            if (!err) {
                                callback(200, tokenObject);
                            } else {
                                callback(500, {
                                    Error: "Could not create a new token"
                                });
                            }
                        });
                    } else {
                        callback(400, {
                            Error: "Password did not match with specified users"
                        });
                    }
                } else {
                    callback(400, { Error: "Could not find specify user" });
                }
            });
        } else {
            callback(400, { Error: "Missing reqired fields" });
        }
    },

    // Tokens get
    // Reqired data: tokenId
    get: function(data, callback) {
        // Check phone number is valid
        let { tokenId } = data.queryStringObject;

        tokenId =
            typeof tokenId == "string" && tokenId.trim().length === 20
                ? tokenId.trim()
                : false;

        if (tokenId) {
            _data.read("tokens", tokenId, function(err, data) {
                if (!err && data) {
                    callback(200, data);
                } else {
                    callback(404);
                }
            });
        } else {
            callback(400, { Error: "Missing reqired fields" });
        }
    },

    // Tokens put
    // Required fields: id, extend
    put: function(data, callback) {
        let { extend, tokenId } = data.payload;

        tokenId =
            typeof tokenId == "string" && tokenId.trim().length === 20
                ? tokenId.trim()
                : false;
        extend = typeof extend == "boolean" && extend === true ? true : false;

        if (tokenId && extend) {
            _data.read("tokens", tokenId, function(err, data) {
                if (!err && data) {
                    // Make sure that token isn`t expired
                    if (data.expires > Date.now()) {
                        // Store the new update an hour from now
                        data.expires = Date.now() + 1000 * 60 * 60;

                        //Store the new updates
                        _data.update("tokens", tokenId, data, function(
                            err,
                            data
                        ) {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {
                                    Error: "Could not update token`s expiration"
                                });
                            }
                        });
                    } else {
                        callback(400, {
                            Token:
                                "The token has already expired and can not be extended"
                        });
                    }
                } else {
                    callback(400, {
                        Token: "Specified token does not exist"
                    });
                }
            });
        } else {
            callback(400, { Error: "Missing reqired fields" });
        }
    },

    // Tokens delete
    // Required fields: tokenId
    delete: function(data, callback) {
        let { tokenId } = data.payload;

        tokenId =
            typeof tokenId == "string" && tokenId.trim().length === 20
                ? tokenId.trim()
                : false;

        if (tokenId) {
            _data.read("tokens", tokenId, function(err, data) {
                if (!err && data) {
                    _data.delete("tokens", tokenId, function(err) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(
                                500,
                                "Could not delete the specified token"
                            );
                        }
                    });
                } else {
                    callback(400, {
                        Error: "Could not find specified token"
                    });
                }
            });
        } else {
            callback(400, { Error: "Missing reqired fields" });
        }
    },

    // Token verify
    // Required data:
    // Details: Verofy if given token is valid for given user
    verifyToken: function(tokenId, phone, callback) {
        _data.read("tokens", tokenId, function(err, data) {
            if (!err && data) {
                if (data.phone === phone && data.expires > Date.now()) {
                    callback(true);
                } else {
                    callback(false);
                }
            } else {
                callback(false);
            }
        });
    }
};

module.exports = TokensController;
