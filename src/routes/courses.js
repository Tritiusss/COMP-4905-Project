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
        db.all('select DISTINCT list_name, uid from users join (select list_name, user_id from personalise_courses) on uid = user_id where user_id = ?', req.user.uid, function(err, list) {
            if(err) {
                console.log(err);
            }
            console.log(list);
            res.render('courses/registerCourse', {
                user: req.user,
                courses: course,
                lists: list
            });
        });
        
    });
});

router.get('/registerCourse/:list_name', ensureAuthenticated, function(req, res) {
    db.all('SELECT * FROM courses JOIN (SELECT student_id, course_id from registers) on cid = course_id where student_id = ?', req.user.uid, function(err, course) {
        if(err) {
            console.log(err);
        }
        db.all('select DISTINCT list_name, uid from users join (select list_name, user_id from personalise_courses) on uid = user_id where user_id = ?', req.user.uid, function(err, list) {
            if(err) {
                console.log(err);
            }
            db.all('SELECT * FROM courses JOIN (SELECT * FROM personalise_courses) on cid = course_id where user_id = ? and list_name = ?', [req.user.uid, req.params.list_name], function(err, PLists) {
                if(err) {
                    console.log(err);
                }
                res.render('courses/listCourse', {
                    user: req.user,
                    courses: course,
                    lists: list,
                    PLists: PLists
                });
            });
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
                //Remeber to change student_id to user_id
                let check_join = true;
                db.all('SELECT DISTINCT student_id id FROM registers where course_id = ?', req.body.cid, function(err, registers) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    if(!registers) {
                        db.run('INSERT INTO registers (student_id, course_id) VALUES (?,?)', [req.user.uid, req.body.cid]);
                        req.flash('success', 'Enter Course Successful');
                        res.redirect('/');
                    }else{
                        registers.forEach(function(register) {
                            if(register.id == req.user.uid) {
                                check_join = false;
                            }
                            console.log(register.id + '-' + req.user.uid);
                            console.log(check_join);
                        });
                        if(check_join) {
                            db.run('INSERT INTO registers (student_id, course_id) VALUES (?,?)', [req.user.uid, req.body.cid]);
                            req.flash('success', 'Enter Course Successful');
                            res.redirect('/');
                        }else {
                            req.flash('false', 'You Already Join This Course!');
                            res.redirect('/courses/join');
                        }
                    }
                });
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
            res.redirect('/courses/events');
        }else {
            //console.log('Add success!');
            //console.log(req.files[0].filename);
            let check = true;
            db.all('SELECT DISTINCT event_name name from events where course_id = ?', req.body.course_id, function(err, events) {
                if (err) {
                    console.log(err);
                    return;
                }
                if(!events) {
                    db.run('INSERT INTO events (course_id, event_name, event_file) VALUES(?,?,?)', [req.body.course_id, req.body.event_name, req.files[0].filename]);
                    req.flash('success', 'Event Add Success');
                    res.redirect('/');
                }else {
                    events.forEach(function(event) {
                        if(event.name == req.body.event_name) {
                            check = false;
                        }
                        console.log(event.name + '-' + req.body.event_name);
                        console.log(check);
                    });
                    if(check) {
                        //console.log(req.body.course_id);
                        //console.log(req.body.event_name);
                        //console.log(req.files[0].filename);
                        db.run('INSERT INTO events (course_id, event_name, event_file) VALUES(?,?,?)', [req.body.course_id, req.body.event_name, req.files[0].filename]);
                        req.flash('success', 'Event Add Success');
                        res.redirect('/');
                    }else {
                        req.flash('false', 'This event already exits!');
                        res.redirect('/courses/events');
                    }
                }
                
            });
            
        }
    });
});

router.get('/atlist', ensureAuthenticated, function(req, res) {
    res.render('courses/atlist', {
        user: req.user
    });
});

router.post('/atlist', [
    check('course_id').isLength({min: 1}).withMessage('Course Unique ID is required.'),
    check('list_name').isLength({min: 1}).withMessage('List name is required. ')
], function(req, res) {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        res.render('courses/atlist', {
            errors: errors.array(),
            user: req.user
        });
    }else {
        db.get('SELECT * FROM registers where student_id = ? and course_id = ?', [req.user.uid, req.body.course_id], function(err, register){
            if (err) {
                console.log(err);
                return;
            }
            if(!register) {
                req.flash('false', "You don't join this course yet!");
                res.redirect('/courses/atlist');
            }else {
                db.get('SELECT * FROM personalise_courses where user_id = ? and course_id = ? and list_name = ?', [req.user.uid, req.body.course_id, req.body.list_name], function(err, list) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    if(!list) {
                        db.run('INSERT INTO personalise_courses (user_id, course_id, list_name) VALUES (?,?,?)', [req.user.uid, req.body.course_id, req.body.list_name]);
                        req.flash('success', 'Course Add To PList');
                        res.redirect('/courses/atlist');
                    }else {
                        req.flash('false', "This list already have this course.");
                        res.redirect('/courses/atlist');
                    }
                });
            }
        });
    }
});

router.get('/:id', ensureAuthenticated, function(req, res) {
    db.all('SELECT * FROM courses JOIN (SELECT * FROM EVENTS) on cid = course_id where cid = ?', req.params.id, function(err, courses) {
        res.render('courses/coursePage', {
            courses: courses,
            user: req.user
        });
    });
});

router.get('/:id/:event_name', ensureAuthenticated, function(req, res) {
    //console.log(req.params.id);
    //console.log(req.params.event_name);
    db.get('SELECT * FROM courses JOIN (SELECT * FROM EVENTS) on cid = course_id where cid = ? and event_name = ?',[req.params.id, req.params.event_name], function(err, event) {
        db.all('SELECT * FROM users join (SELECT * FROM comments) on uid = user_id where course_id = ? and event_name = ?;', [req.params.id, req.params.event_name], function(err, comments) {
            res.render('courses/show', {
                event: event,
                user: req.user,
                comments: comments
            });
        });
        
    });
    
});

router.post('/show', function(req, res) {
    if(!req.body.delete) {
        if (!req.body.comment_content) {
            req.flash('false', "Empty comment not allowed");
            res.redirect('/courses/' + req.body.cid + '/' + req.body.event_name);
        }else {
            db.run('INSERT INTO comments (user_id, course_id, event_name, comment_content) VALUES (?,?,?,?)',[req.user.uid, req.body.cid, req.body.event_name, req.body.comment_content]);
            req.flash('success', "Add comment");
            res.redirect('/courses/' + req.body.cid + '/' + req.body.event_name);
        }
    }else {
        db.get('SELECT * FROM comments where comment_id = ?', req.body.delete, function(err, comment) {
            if (err) {
                console.log(err);
                return;
            }
            if(!comment) {
                req.flash('false', "No such comment exits");
                res.redirect('/courses/' + req.body.cid + '/' + req.body.event_name);
            }else {
                if(req.body.event_name == comment.event_name) {
                    db.run('DELETE FROM comments WHERE comment_id = ?', req.body.delete);
                    if (!req.body.comment_content) {
                        req.flash('false', "Empty comment not allowed");
                        res.redirect('/courses/' + req.body.cid + '/' + req.body.event_name);
                    }else {
                        db.run('INSERT INTO comments (user_id, course_id, event_name, comment_content) VALUES (?,?,?,?)',[req.user.uid, req.body.cid, req.body.event_name, req.body.comment_content]);
                        req.flash('success', "Add comment");
                        res.redirect('/courses/' + req.body.cid + '/' + req.body.event_name);
                    }
                }else {
                    req.flash('false', "The comment id you input not from this event");
                    res.redirect('/courses/' + req.body.cid + '/' + req.body.event_name);
                }
            }
        });
        
    }
    
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