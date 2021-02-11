const path = require('path');
const fs = require('fs');
// Allows to spin up an https server
const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// Used for creating a session middleware
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
// Cross Site Forgery Protection
const csrf = require('csurf');
// Used for flashing messages
const flash = require('connect-flash');
// Used for multipart/form-data, which is primarily used for uploading files
const multer = require('multer');
// Used for headers
const helmet = require('helmet');
// Used to compress files
const compression = require('compression');
// Used for request loging
const morgan = require('morgan');

const errorController = require('./controllers/error');
const User = require('./models/user');

// Set the NODE_ENV environment variable to production when deploying
// Hosting providers usually do that
// console.log(process.env.NODE_ENV);

const MongoDB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env
	.MONGO_PASSWORD}@cluster0.zsx5a.mongodb.net/${process.env
	.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`;

const app = express();
const store = new MongoDBStore({
	// Connection string to the database
	uri: MongoDB_URI,
	collection: 'sessions'
});
// Create csrf middleware
const csrfProtection = csrf();
// Read in my files for the local ssl server
// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');
// To be used by multer - handles the destination for the files and their names
const fileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images');
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + '_' + file.originalname);
	}
});
// Filter out invalid files for multer
const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		// Accept the files that statisfy the format specified in the above if statement
		cb(null, true);
	} else {
		cb(null, false);
	}
};

// Set a global configuration value and set the view engine
app.set('view engine', 'ejs');
// Where to find the templates  - in the views folder (although not required here since by default express would look for a 'views' folder)
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

// To be used for morgan - loging
// Write stream in the current directory in the access.log file
// flags: 'a' is instructing that new data is appended to the file and is not overwriting the existing data
const accessLogStream = fs.createWriteStream(
	path.join(__dirname, 'access.log'),
	{ flags: 'a' }
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: true }));
// Set express to use multer for parsing incoming requests that containg both text and binary data (files)
// Used .single() as I am only expecting a single image file
// Used 'image' because it is the same name I am using in the edit-product.ejs view: name="image"
// {storage: fileStorage} this tells multer to use the above defined fileStorage
app.use(
	multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use(
	session({
		secret: 'my secret',
		resave: false,
		saveUninitialized: false,
		store: store
	})
);
// Both csrfProtection and flash should be initialized / used / registered after we initialize the session (above)
app.use(csrfProtection);
app.use(flash());
// Server static files from the 'public' folder
// Express will take any request that tries to find some file (css or js types) and automatically forwards it to the public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Tell express that we have some data that should be included in every rendered view
app.use((req, res, next) => {
	// The 'res.locals' field allows to set local varables that are passed into the views
	// It is local because these variables will only exist in the views which are rendered
	res.locals.isAuthenticated = req.session.isLoggedIn;
	// The .csrfToken() is made available by the csrf middleware we added
	res.locals.csrfToken = req.csrfToken();
	next();
});

// Find the user by id
app.use((req, res, next) => {
	// throw new Error('Sync Dummy');
	if (!req.session.user) {
		return next();
	}
	User.findById(req.session.user._id)
		.then((user) => {
			// throw new Error('Async Dummy');
			// For async code we need to pass the error to next, just throwing it like for sync code will not work
			// The error will not be caught by the error handler if it is not passed to next when using async code
			if (!user) {
				return next();
			}
			// Store the user in the request
			req.user = user;
			next();
		})
		.catch((err) => {
			next(new Error(err));
		});
});

// adminData refers to all the exports and in the admins.js file we have routes and products
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

// Error handler
app.use((error, req, res, next) => {
	//res.redirect('/500');
	res.status(500).render('500', {
		pageTitle: 'Error!',
		path: '/500',
		isAuthenticated: req.session.isLoggedIn
	});
});

// Connect to the database via mongoose
mongoose
	.connect(MongoDB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => {
		// https
		// 	.createServer({ key: privateKey, cert: certificate }, app)
		// 	.listen(process.env.PORT || 3000);
		app.listen(process.env.PORT || 3000);
	})
	.catch((err) => console.log(err));
