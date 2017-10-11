var passport = require('passport');
var config = require('../config/main');
var jwt = require('jsonwebtoken');
var express = require('express');

// Load models
var User = require('./models/user');
var Chat = require('./models/chat');

// Export the routes for our app to use
module.exports = function(app) {
    // Initialize passport for use
    app.use(passport.initialize());

    // Bring in defined Passport Strategy
    require('../config/passport')(passport);

    // Create API group routes
    var apiRoutes = express.Router();

    // POST /register
    // x-www-form-urlencoded
    // email: test@test.com
    // password: test
    // Register new users
    apiRoutes.post('/register', function(req, res) {
        if (!req.body.email || !req.body.password) {
            res.json({ success: false, message: 'Please enter mail and password.'});
        } else {
            var newUser = new User({
                email: req.body.email,
                password: req.body.password
            });

            // Attemp to save the user
            newUser.save(function(err) {
                if (err) return res.json({ success: false, message: 'That email address already exists.'});
                res.json({ success: true, message: 'Successfully created new user.'});
            });
        }
    });

    // POST /authenticate
    // x-www-form-urlencoded
    // email: test@test.com
    // password: test
    apiRoutes.post('/authenticate', function(req, res) {
        User.findOne({
            email: req.body.email
        }, function(err, user) {
            if (err) throw err;

            if (!user) {
                res.send({ success: false, message: 'Authentication failed. User not found.'});
            } else {
                // Check if password matches
                user.comparePassword(req.body.password, function(err, isMatch) {
                    if (isMatch && !err) {
                        // Create token if the password matched and no error was thrown
                        var token = jwt.sign({user: user}, config.secret, {
                            expiresIn: 10080 // in seconds
                        });
                        res.json({ success: true, token: 'Bearer ' + token});
                    } else {
                        res.send({ success: false, message: 'Authentication failed. Passwords did not match.'});
                    }
                });
            }
        });
    });

    // GET /dashboard
    // Authorization: Bearer token
    apiRoutes.get('/dashboard', passport.authenticate('jwt', { session: false }), function(req, res) {
        res.send('It worked! User id is: ' + req.user._id + '.');
    });

    // Protect chat routes with JWT
    // GET messages for authenticated user
    apiRoutes.get('/chat', passport.authenticate('jwt', { session: false }), function(req, res) {
        Chat.find({$or: [{'to': req.user._id}, {'from': req.user._id}]}, function(err, messages) {
            if (err) res.send(err);

            res.json(messages);
        });
    });

    // POST to create a new message from the authenticated user
    apiRoutes.post('/chat', passport.authenticate('jwt', { session: false }), function(req, res) {
        var chat = new Chat();
        chat.from = req.user._id;
        chat.to = req.body.to;
        chat.message_body = req.body.message_body;

        // Save the chat message if there are no errors
        chat.save(function(err) {
            if (err) res.send(err);
            res.json({message: 'Message sent!'});
        })
    });

    // PUT to update a message the authenticated user sent
    apiRoutes.put('/chat/:message_id', passport.authenticate('jwt', {session: false}), function(req, res) {
        Chat.findOne({$and: [{'_id': req.params.message_id}, {'from': req.user._id}]}, function(err, message) {
            if (err) res.send(err);

            message.message_body = req.body.message_body;

            // Save the updates to the message
            message.save(function(err) {
                if (err) res.send(err);

                res.json({ message: 'Message edited!'});
            });
        });
    });

    // DELETE a message
    apiRoutes.delete('/chat/:message_id', passport.authenticate('jwt', { session:false }), function(req, res) {
        Chat.findOneAndRemove({$and: [{'_id': req.params.message_id}, {'from': req.user._id}]}, function(err) {
            if (err) res.send(err);

            res.json({ message: 'Message removed!' });
        });
    });

    // Set url for API group routes
    app.use('/api', apiRoutes);
}