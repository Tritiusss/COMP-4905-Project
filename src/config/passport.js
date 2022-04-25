const db = require('../config/database');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;


module.exports = function(passport) {
    passport.use(new LocalStrategy(
        function verify(username, password, cb) { 
            db.get('SELECT * FROM users WHERE uid = ?', username, function(err, user) {
                if(err) { return cb(err); }
                if(!user) { return cb(null, false, { message: 'No User Found!'}); }

                bcrypt.compare(password, user.password, function(err, isMatch) {
                    if(err) { return cb(err); }
                    if(isMatch) {
                        return cb(null, user);
                    }else {
                        return cb(null, false, { message: 'Incorrect password.'});
                    }
                });
            });
        }
    ));

    passport.serializeUser(function(user, cb) {
        cb(null, user.uid)
    });

    passport.deserializeUser(function(id, cb) {
        db.get('SELECT * FROM users WHERE uid = ?', id, function(err, user) {
            cb(err, user);
        });
    });
}




