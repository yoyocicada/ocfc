var Image = require('mongoose').model('Image'),
	Album = require('mongoose').model('Album'),
	mongoose = require('mongoose'),
	deleteKey = require('key-del'),
	commFunc = require('../utilities/commonFunctions'),
	deleteKey = require('key-del'),
	_ = require('lodash'),
	html_strip = require('htmlstrip-native');//Library for Array

//Get - Round1
exports.getImage = function (req, res) {
	console.log('server getImage has been called');
	console.log('chk req.params');
	console.log(req.params);

	Image.findOne({_id: req.params.image_id}).populate('comments.userId').exec(function (err, image) {
		if (err) return res.json(err);
		console.log('chk image');
		console.log(image);
		return res.json(image);
	});

};

//Put - Round1
exports.updateImage = function (req, res) {
	console.log('chk req body');
	console.log(req.body);

	var image = commFunc.removeInvalidKeys(req.body, ['path', 'caption', 'comments']);

	Image.update({ _id: req.params.image_id }, image, { multi: true }, function (err, numberAffected, raw) {
		if (err) return res.json(err);
		return res.json({status: "success", raw: raw});
	});
};

//Delete - Round1
exports.deleteImage = function (req, res) {
	console.log('server deleteImage has been called');
	console.log('chk req.params');
	console.log(req.params);

	Image.findOneAndRemove({_id: req.params.image_id}, function (err) {
		if (err) return res.json(err);
		return res.json({status: "successfully removed from Image"});
	});

	Album.findById(req.params.album_id).exec(function (err, album) {
		console.log('server Album.findById has been called');
		console.log('chk album obj');
		console.log(album);

		var index = album.imageIds.indexOf(req.params.image_id);
		console.log('chk index');
		console.log(index);

		console.log('remove this image._id');
		console.log(req.params.image_id);

		album.imageIds.splice(index, 1);

		console.log('chk if id has been removed from album.imageIds');
		console.log(album.imageIds);

		album.save(function (err) {
			console.log('album.save has been called');
			if (err) return res.json(err);
			return res.json(album);
		});
	});

};

//Post - Round1
exports.addCommentToImage = function (req, res) {
	Image.findById(req.params.image_id).exec(function (err, image) {
		if (err) return res.json(err);

		var comment = req.body;
		errors = commFunc.checkRequiredFields(comment, ['comment']);
		if (errors > 0) return res.json(errors);

		//TODO html_strip is cutting off very last letter in comment
		comment = {
			userId: req.user._id,
			comment: html_strip.html_strip(comment.comment, commFunc.htmlStripOptions),
			profileImg: req.user.profileImg,
			firstName: req.user.firstName,
			lastName: req.user.lastName
		};
		image.comments.push(comment);
		image.save(function () {
			if (err) return res.json(err);
			return res.json({status: "success", image: image});
		});
	});
};

//Put - Round1
exports.updateCommentFromImage = function (req, res) {
	var commentObj = commFunc.removeInvalidKeys(req.body, ['comments']);
	Image.findOne({ _id: req.params.image_id }, function (err, image) {
		if (err) return res.json(err);

		var comment = image.comments.id(req.params.comment_id);
		comment.comment = commentObj.comment;

		image.save(function (err) {
			if (err) return res.json(err);
			return res.json({status: "success", comment: comment});
		});
	});
};
//Delete - Round1
exports.deleteCommentFromImage = function (req, res) {
	Image.findOne({ _id: req.params.image_id }, function (err, image) {
		if (err) return res.json(err);

		var comment = image.comments.id(req.params.comment_id).remove();

		image.save(function (err) {
			if (err) return res.json(err);
			return res.json({status: "success", comment: comment});
		});
	});
};