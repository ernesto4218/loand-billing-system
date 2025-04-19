//index.js

const express = require('express')
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const app = express();
// const expressLayouts = require('express-ejs-layouts');

// app.use(expressLayouts);
app.set('layout', 'layout'); // looks for views/layout.ejs
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    console.log('helllo');
    res.render('index', {name: "Ernesto"});
})

// config
const userRouter = require('./routes/user');
app.use('/user', userRouter)

const adminRouter = require('./routes/admin');
app.use('/admin', adminRouter);

app.listen(3000);