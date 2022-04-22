const sqlite3 = require('sqlite3').verbose();

let db = module.exports = new sqlite3.Database('./db/mydatabase.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log(err.message);
    }else {
        console.log('Connected to Database');
    }
});