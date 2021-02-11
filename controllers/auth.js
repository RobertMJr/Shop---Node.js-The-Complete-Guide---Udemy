// Use the crypto library to create a token (a random secure value)
const crypto = require('crypto');
// Import bcrypt -  helps with hashing passwords
const bcrypt = require('bcryptjs');
// Import the nodemailer package - helps with sending emails
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');

const User = require('../models/user');

let transport = nodemailer.createTransport({
	host: 'smtp.mailtrap.io',
	port: 2525,
	auth: {
		user: 'e56dbbe6942eeb',
		pass: '1ed31a1909a8d9'
	}
});

exports.getLogin = (req, res, next) => {
	let message = req.flash('error');
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	// See the header with the cookie
	// console.log(req.get('Cookie').split('=')[1]);
	// const isLoggedIn = req.get('Cookie').split('=')[1];
	res.render('auth/login', {
		path: '/login',
		pageTitle: 'Login',
		// Access the possible error via req.flash() and the key 'error' which I specified in the .postLogin controller
		// It will only hold a value if we have an error flashed into our session
		// This is then removed from the session
		// Changed this as it was returning an empty array - stored it above in the message variable and used that
		errorMessage: message,
		oldInput: {
			email: '',
			password: ''
		},
		validationErrors: []
	});
};

exports.getSignup = (req, res, next) => {
	let message = req.flash('error');
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render('auth/signup', {
		path: '/signup',
		pageTitle: 'Signup',
		errorMessage: message,
		oldInput: {
			email: '',
			password: '',
			confirmPassword: ''
		},
		validationErrors: []
	});
};

exports.postLogin = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	// Gather all the errors collected by the validation package from the request object
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(422).render('auth/login', {
			path: '/login',
			pageTitle: 'Login',
			errorMessage: errors.array()[0].msg,
			oldInput: {
				email: email,
				password: password
			},
			validationErrors: errors.array()
		});
	}
	User.findOne({ email: email })
		.then((user) => {
			if (!user) {
				return res.status(422).render('auth/login', {
					path: '/login',
					pageTitle: 'Login',
					errorMessage: 'Invalid email or password.',
					oldInput: {
						email: email,
						password: password
					},
					validationErrors: []
				});
			}
			bcrypt
				.compare(password, user.password)
				// The bcrypt.compare method will not trhow any errors if the password do not match
				// It will return a boolean (doMathc in my case here)
				.then((doMatch) => {
					if (doMatch) {
						req.session.isLoggedIn = true;
						req.session.user = user;
						// Using the save method to ensure the req.session has been written to the database before we continue with the redirect
						// In the save method I then call a function that will run once I am done saving the session
						return req.session.save((err) => {
							console.log(err);
							res.redirect('/');
						});
					}
					return res.status(422).render('auth/login', {
						path: '/login',
						pageTitle: 'Login',
						errorMessage: 'Invalid email or password.',
						oldInput: {
							email: email,
							password: password
						},
						validationErrors: []
					});
				})
				// Error can be trhown if something else besides password missmatch occurs
				.catch((err) => {
					console.log(err);
					res.redirect('/login');
				});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};

exports.postLogout = (req, res, next) => {
	// Clear the session - takes a function that will be exectued after destroying the session
	// Calling res.redirect inside the function to ensure the redirect only occurs after the session was destroyed
	req.session.destroy((err) => {
		console.log(err);
		res.redirect('/');
	});
};

exports.postSignup = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		console.log(errors.array());
		return res.status(422).render('auth/signup', {
			path: '/signup',
			pageTitle: 'Signup',
			errorMessage: errors.array()[0].msg,
			oldInput: {
				email: email,
				password: password,
				confirmPassword: req.body.confirmPassword
			},
			validationErrors: errors.array()
		});
	}
	bcrypt
		.hash(password, 12)
		.then((hashedPasword) => {
			// Create the user
			const user = new User({
				email: email,
				password: hashedPasword,
				cart: { items: [] }
			});
			// Save the user to the database
			return user.save();
		})
		.then((result) => {
			res.redirect('/login');
			// Send message
			return transport.sendMail({
				to: email,
				from: 'murarurobertionut@yahoo.ro',
				subject: 'Signup succeeded!',
				html: '<h1>You successfully signed up!</h1>'
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};

exports.getReset = (req, res, next) => {
	let message = req.flash('error');
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render('auth/reset', {
		path: '/reset',
		pageTitle: 'Reset Password',
		errorMessage: message
	});
};

exports.postReset = (req, res, next) => {
	// Get random bytes
	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			console.log(err);
			return res.redirect('/reset');
		}
		// Convert the random bytes to a string, we pass 'hex' because the buffer stores hexadecimal values
		const token = buffer.toString('hex');
		User.findOne({ email: req.body.email })
			.then((user) => {
				if (!user) {
					req.flash('error', 'No account with that email found.');
					return res.redirect('/reset');
				}
				user.resetToken = token;
				// Set to expire in one hour - 3mil 600 thousand miliseconds
				user.resetTokenExpiration = Date.now() + 3600000;
				return user.save();
			})
			.then((result) => {
				res.redirect('/');
				transport.sendMail({
					to: req.body.email,
					from: 'murarurobertionut@yahoo.ro',
					subject: 'Password reset',
					html: `
						<p>You requested a password reset</p>
						<p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
					`
				});
			})
			.catch((err) => {
				const error = new Error(err);
				error.httpStatusCode = 500;
				return next(err);
			});
	});
};

exports.getNewPassword = (req, res, next) => {
	const token = req.params.token;
	User.findOne({
		resetToken: token,
		resetTokenExpiration: { $gt: Date.now() }
	})
		.then((user) => {
			if (!user) {
				req.flash(
					'error',
					'Oops! The reset password link has already been used.'
				);
				return res.redirect('/login');
			}
			let message = req.flash('error');
			if (message.length > 0) {
				message = message[0];
			} else {
				message = null;
			}
			res.render('auth/new-password', {
				path: '/new-password',
				pageTitle: 'New Password',
				errorMessage: message,
				userId: user._id.toString(),
				passwordToken: token
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};

exports.postNewPassword = (req, res, next) => {
	const newPassword = req.body.password;
	const { userId, passwordToken } = req.body;
	let resetUser;

	User.findOne({
		resetToken: passwordToken,
		resetTokenExpiration: { $gt: Date.now() },
		_id: userId
	})
		.then((user) => {
			resetUser = user;
			return bcrypt.hash(newPassword, 12);
		})
		.then((hashedPasword) => {
			resetUser.password = hashedPasword;
			resetUser.resetToken = undefined;
			resetUser.resetTokenExpiration = undefined;
			return resetUser.save();
		})
		.then((result) => {
			res.redirect('/login');
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};
