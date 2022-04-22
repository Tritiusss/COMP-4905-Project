const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');



const app = express();

app.use(session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: false
}));

app.use(require('connect-flash')());
app.use(function(req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});

//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false }));
//app.use(cookieParser());

//Connect to database
let db = new sqlite3.Database('./db/mydatabase.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log(err.message);
    }else {
        console.log('Connected to Database');
    }
});



require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next) {
    res.locals.user = req.user || null;
    console.log(req.user);
    next();
});


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

let users = require('./routes/users');
let courses = require('./routes/courses');

app.use('/', users);
app.use('/users', users);
app.use('/courses', courses);

app.get('/', function(req, res) {
    //console.log(req.user.uid);
    res.render('index', {
        title: 'Home Page',
    });
});

app.listen(3000, function() {
    console.log("Server started on port 3000...");
});