const expres = require('express');
// Import the express-validator/check sub-package - used for all the validation logic you want to add
const { check, body } = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = expres.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.get('/reset', authController.getReset);

router.get('/reset/:token', authController.getNewPassword);

router.post(
	'/login',
	[
		body('email')
			.isEmail()
			.withMessage('Please enter a valid email.')
			.normalizeEmail(),
		body(
			'password',
			'Please enter a password with only numbers and text and at least 5 characters.'
		)
			.isLength({ min: 5 })
			.isAlphanumeric()
			.trim()
	],
	authController.postLogin
);

router.post(
	'/signup',
	[
		check('email')
			.isEmail()
			.withMessage('Please enter a valid email.')
			.custom((value, { req }) => {
				// if (value === 'test@test.com') {
				// 	throw new Error('This email address is fobridden.');
				// }
				// return true;
				/**
                 * The express validator package will check for a custom validator to retun true or false, to return a thrown error or to return a promise
                 * If it is a promise, such as in this case, it will wait for the promise to be fulfilled and if it fulfills with no error, it treats the validation as successful
                 * If it resolves with some rejection (such as here below in the 'if' block)
                 */
				return User.findOne({ email: value }).then((userDoc) => {
					// Check if a user with the same email already exists
					// If it does - redirect to the /signup page
					if (userDoc) {
						return Promise.reject('Email already in use.');
					}
				});
			})
			.normalizeEmail(),
		// Check the value in the body of the request - unlike the check() method this only looks in the body of the request (not in the header of the request or other places)
		body(
			'password',
			'Please enter a password with only numbers and text and at least 5 characters.'
		)
			.isLength({ min: 5 })
			.isAlphanumeric()
			.trim(),
		body('confirmPassword').trim().custom((value, { req }) => {
			if (value !== req.body.password) {
				throw new Error('Passwords have to match');
			}
			return true;
		})
	],
	authController.postSignup
);

router.post('/logout', authController.postLogout);

router.post('/reset', authController.postReset);

router.post('/new-password', authController.postNewPassword);

module.exports = router;
