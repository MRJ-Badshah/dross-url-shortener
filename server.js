/* eslint-disable no-var */
/* eslint-disable no-useless-escape */
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const shortModel = require('./models/short');
const crypto = require('crypto');
const favicon = require('serve-favicon');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

const DB_URI = process.env.DB_URI;

mongoose
	.connect(DB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.catch((error) => console.error(error));

const apiLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: 'Too many requests from this IP, please try again after a minute',
});

app.use('/shorten', apiLimiter);

const createAccountLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: 'Too many requests from this IP, please try again after a minute',
});

// Make sure view engine uses ejs
app.set('view engine', 'ejs');
app.use(express.urlencoded({
	extended: false,
}));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
	const hasUrlBeenShortened = false;
	const doErrorsExist = false;
	const errors = '';
	const shortenedURL = '';
	const shortened = '';
	res.render('index', {
		doErrorsExist,
		errors,
		hasUrlBeenShortened,
		shortenedURL,
		shortened,
	});
});

app.get('/stats/:slug', async (req, res) => {
	const slug = await shortModel.findOne({
		short: req.params.slug,
	});
	const slugExists = slug != null;
	let clicks;
	slugExists ? (clicks = slug.clicks) : (clicks = null);

	console.log(clicks);
	res.render('stats', {
		slugExists,
		clicks,
	});
});

function isEmpty(str) {
	return !str.trim().length;
}

app.post('/shorten', createAccountLimiter, async (req, res) => {
	const secret_key = process.env.SECRET_KEY;
	const token = req.body['g-recaptcha-response'];
	const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`;

	const data = {
		secret_key,
		token,
	};

	try {
		const response = await fetch(url, {
			method: 'post',
			body: JSON.stringify(data),
		});

		const responseJSON = await response.json();

		if (responseJSON.success) {
			let doErrorsExist = false;
			let errors = '';

			const long = req.body.long;
			const short =
				req.body.short === '' ||
				req.body.short === null ||
				!req.body.short.match(/^[a-zA-Z]+?[^\\\/:*?"<>|\n\r]+$/) ||
				isEmpty(req.body.short) ?
					crypto
						.createHash('sha256')
						.update(long)
						.digest('hex')
						.substring(0, 7) :
					req.body.short;
			const type =
				req.body.short === '' ||
				req.body.short === null ||
				!req.body.short.match(/^[a-zA-Z]+?[^\\\/:*?"<>|\n\r]+$/) ||
				isEmpty(req.body.short) ?
					'generated' :
					'manual';

			const shortURLtoLookUp = await shortModel.findOne({
				long,
				short,
			});
			const onlyShortToLookUp = await shortModel.findOne({
				short,
				type,
			});

			if (onlyShortToLookUp && onlyShortToLookUp.type == 'manual') {
				doErrorsExist = true;
				errors = 'Sorry, that short URL already exists!';
				console.log('short url exists');
			} else if (shortURLtoLookUp) {
				console.log(shortURLtoLookUp);
			} else {
				await shortModel.create({
					long,
					short,
					type,
				});
				console.log(long, short, type);
			}

			const hasUrlBeenShortened = true;
			const shortenedURL = `https://dross.herokuapp.com/${short}`;
			const shortened = `dross.herokuapp.com/${short}`;

			res.render('index', {
				doErrorsExist,
				errors,
				hasUrlBeenShortened,
				shortenedURL,
				shortened,
			});
			console.log('CAPTCHA PASSED, SUCCESS');
		} else {
			const doErrorsExist = true;
			const errors = 'Captcha Failed!';

			const hasUrlBeenShortened = false;
			const shortenedURL = '';
			const shortened = '';
			res.render('index', {
				doErrorsExist,
				errors,
				hasUrlBeenShortened,
				shortenedURL,
				shortened,
			});
			console.log('CAPTCHA FAILED');
		}
	} catch (err) {
		console.error(err);
		return;
	}
});

app.get('/:slug', async (req, res) => {
	try {
		var shortUrl = await shortModel.findOne({
			short: req.params.slug,
		});
	} catch (err) {
		console.error(err);
	}

	if (shortUrl == null) return res.sendStatus(404);

	shortUrl.clicks++;
	shortUrl.save();

	console.log(shortUrl.clicks);
	console.log(`Redirecting to ${shortUrl.long}`);
	res.status(301).redirect(shortUrl.long);
});

const PORT = 3000;
app.listen(PORT, console.log(`Dross is listening on port : ${PORT} | Site : http://localhost:${PORT}`));