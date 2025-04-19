const express = require('express')
const router = express.Router();
const bodyParser = require('body-parser');
const crypto = require('crypto');

// Middleware to parse form data
router.use(bodyParser.urlencoded({ extended: false }));

// Set up MySQL connection
const pool = require('../config/db');

router.get('/', (req, res) => {
    res.render('login');
})

router.post('/login', (req, res) => {
    // res.render('login');
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    console.log(req.body);
    console.log(password);

    pool.execute(query, [email, password], (err, results) => {
        if (err) {
          console.error('Error executing query:', err);
          return res.status(500).send('Internal Server Error');
        }
    
        if (results.length > 0) {
            const token = crypto.randomBytes(32).toString('hex');

            // Set the token as a cookie
            res.cookie('auth_token', token, {
              httpOnly: true, 
              secure: false,
              maxAge: 24 * 60 * 60 * 1000, // 1 day
            });
      
            const updateQuery = 'UPDATE users SET auth_token = ? WHERE email = ?';
            pool.execute(updateQuery, [token, email]);
      
            return res.redirect('/admin');
        } else {
          res.send('Invalid email or password!');
        }
    });
})

module.exports = router;