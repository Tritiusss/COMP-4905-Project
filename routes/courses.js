const express = require('express');
const db = require('../config/database');
const {check, validationResult} = require('express-validator');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

let reqPath = path.join(__dirname, '../');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, reqPath+ 'public/upload/');
    },
    filename: function (req, file, cb) {
        cb(null,  Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage});



let router = express.Router();

router.get('/new', ensureAuthenticated, function(req, res) {
    res.render('courses/new');
});

router.post('/new', [
    check('cid').isLength({min: 1}).withMessage('Course Unique ID is required.'),
    check('subject').isLength({min: 1}).withMessage('Subject is required.'),
    check('title').isLength({min: 1}).withMessage('Title is required.'),
    check('section').isLength({min: 1}).withMessage('Section is required.')
], function(req, res) {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        res.render('courses/new', {
            errors: errors.array(),
            user: req.user
        });
    }else {
        db.get('SELECT * FROM courses where cid = ?', req.body.cid, function(err, course) {
            if(err) {
                console.log(err);
                return;
            }
            if(!course) {
                db.run('INSERT INTO courses(cid, subject, title, section, creator) VALUES(?,?,?,?,?)', [req.body.cid, req.body.subject, req.body.title, req.body.section, req.user.uid]);
                console.log('Insert course success');
                req.flash('success', 'Course Create Successful!');
                res.redirect('/')
            } else {
                req.flash('false', 'Course ID Already Exist!');
                res.redirect('/courses/new')
            }
        });
    }
});

router.get('/myCourse', ensureAuthenticated, function(req, res) {
    db.all('SELECT * FROM courses where creator = ?', req.user.uid, function(err, course) {
        if(err) {
            console.log(err);
            return;
        }
        res.render('courses/myCourse', {
            user: req.user,
            courses: course
        });
    });
});

router.get('/registerCourse', ensureAuthenticated, function(req, res) {
    db.all('SELECT * FROM courses JOIN (SELECT student_id, course_id from registers) on cid = course_id where student_id = ?', req.user.uid, function(err, course) {
        if(err) {
            console.log(err);
        }
        res.render('courses/registerCourse', {
            user: req.user,
            courses: course
        });
    });
});

router.get('/join', ensureAuthenticated, function(req, res) {
    res.render('courses/join');
});

router.post('/join', [
    check('cid').isLength({min: 1}).withMessage('Please enter the Course Unique ID to join new Course.')
], function(req, res) {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        res.render('courses/join', {
            errors: errors.array(),
            user: req.user
        });
    }else {
        db.get('SELECT cid FROM courses where cid = ?', req.body.cid, function(err, course) {
            if(err) {
                console.log(err);
                return;
            }
            if(!course) {
                req.flash('false', 'Course ID NOT Exist! Please Enter Correct Course ID');
                res.redirect('/courses/join');
            }else {
                db.run('INSERT INTO registers (student_id, course_id) VALUES (?,?)', [req.user.uid, req.body.cid]);
                req.flash('success', 'Enter Course Successful');
                res.redirect('/');
            }

        });
    }
});

router.get('/events', ensureAuthenticated, function(req, res) {
    res.render('courses/events', {
        user: req.user
    });
});

router.post('/events', upload.any(), function(req, res) {
    db.get('SELECT * FROM courses where cid = ?', req.body.course_id, function(err, course) {
        if (err) {
            console.log(err);
            return;
        }
        if(!course) {
            req.flash('false', 'Course ID NOT Exist! Please Enter Correct Course ID');
            res.redirect('/courses/events');
        }else if (course.creator != req.user.uid) {
            req.flash('false', 'You have no Permission to add events to this course');
            res.redirect('/courses/events')
        }else {
            console.log('Add success!');
            console.log(req.files[0].filename);
            
        }
    })
});


router.get('/:id', ensureAuthenticated, function(req, res) {
    db.get('SELECT * FROM courses where cid = ?', req.params.id, function(err, course) {
        res.render('courses/coursePage', {
            course: course,
            user: req.user
        });
    });
});


router.post('/:id', function(req, res) {
    //console.log(req);
    /*
    const form = new formidable.IncomingForm();
    let reqPath = path.join(__dirname, '../');
    form.parse(req, function(err, fields, file) {
        console.log(file.event_file.filepath);
        let oldpath = file.event_file.filepath;
        let newpath = reqPath + 'public/upload/' + file.event_file.originalFilename;
        fs.rename(oldpath, newpath, function(err) {
            if (err) throw err;
            console.log("success");
        });
    

    });
    console.log(req.params.id);
    const form = new formidable.IncomingForm();
    form.parse(req);
    let reqPath = path.join(__dirname, '../');
    let newfilename;
    form.on('fileBegin', function(name, file) {
        console.log(req.params.id);
        file.path = reqPath+ 'public/upload/'+ req.params.id + file.name;
        newfilename = req.params.id + file.name;
        console.log(file.name);
    });
    form.on('file', function(name, file) {
        db.run('INSERT INTO events (course_id, event_name, event_file) VALUES(?,?,?)', [req.params.id, newfilename, newfilename], function(err, result) {
            if (err) {
                console.log(err);
            }
        });

    });
    */
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      req.flash('danger', 'Please login');
      res.redirect('/users/login');
    }
}

module.exports = router;