const express = require('express');
const path = require('path');
const db = require('../config/database');
const {check, validationResult} = require('express-validator');
const bcrypt = require('bcrypt');
const passport = require('passport')
//const LocalStrategy = require('passport-local').Strategy;


let router = express.Router();

router.get('/register', function(req,res){
    res.render('users/register');
});

router.post('/register', [
    check('inlineRadioOptions').isIn(['student', 'professor']).withMessage('Please select you are student or professor.'),
    check('given_name').isLength({min: 1}).withMessage('Given name is required.'),
    check('surname').isLength({min: 1}).withMessage('Surname is required.'),
    check('email').isLength({min: 1}).withMessage('Email address is required.'),
    check('email').isEmail().withMessage('Please enter correct email address.'),
    check('password').isLength({min: 1}).withMessage('Password is required.'),
    check('password', " ")
        .custom((value, {req, loc, path}) =>{
            if(value != req.body.password_confirmation){
                throw new Error("Password not match");
            }else{
                return value;
            }
        })

], function(req,res) {
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        res.render('users/register', {
            errors: errors.array()
        })
    }else{
        //console.log(req.body.inlineRadioOptions);

        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(req.body.password, salt, function(err, hash) {
                if(err) {
                    console.log(err);
                    return;
                }
                req.body.password = hash;
                db.run('INSERT INTO users(given_name, surname, email, password, role) VALUES(?,?,?,?,?)', [req.body.given_name, req.body.surname, req.body.email, req.body.password, req.body.inlineRadioOptions]);
                console.log('Insert user success');
                req.flash('success', 'Register Successful!');
                res.redirect('/users/login');

            });
        });

    }
    
    
});


router.get('/login', function(req,res){
    res.render('users/login');
});


router.post('/login', function(req, res, next) {
   passport.authenticate('local', {
       successRedirect: '/',
       failureRedirect: '/users/login',
       failureFlash: true,
       successFlash: 'Welcome back! '
   })(req, res, next)
});

router.get('/logout', function(req, res){
    req.logout();
    req.flash('success', 'Logged out');
    res.redirect('/');
});

/*
router.get('/:username', function(req, res) {
    db.get('SELECT * FROM users WHERE uid = ?', username, function(err, user) {
        if(err) throw err;
        res.send(user);
    });
});
*/


module.exports = router;