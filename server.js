var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var app = express();

var config = require('./config/main');
var User = require('./app/models/user');

app.listen(3000);

// Use body-parser to get POST requests for API use
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

require('./app/routes')(app);

// Log requests to console
app.use(morgan('dev'));

// Home route. We'll end up changing this to our main front end index later.
app.get('/', function(req, res) {
    res.send('Relax. We will put the home page here later.');
});

// Connect to database
mongoose.connect(config.database);