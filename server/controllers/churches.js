var Church = require('mongoose').model('Church'),
	ChurchUser = require('mongoose').model('ChurchUser'),
	Membership = require('mongoose').model('Membership'),
	ChurchFellowship = require('mongoose').model('ChurchFellowship'),
	FellowshipUser = require('mongoose').model('FellowshipUser'),
	Notification = require('mongoose').model('Notification'),
	commFunc = require('../utilities/commonFunctions'),
	deleteKey = require('key-del'),
	_ = require('lodash');//Library for Array

//Post - Round1
exports.createChurch = function (req, res) {
	console.log('server createChurch has been called');
	//TODO, prevent duplicate church
	//compared by name, address
	//admin cannot create duplicate church

	var church = req.body;
	church = new Church(church);
	church.save(function (err) {
		console.log('church.save has been called');
		if (err) return res.json(err);
		ChurchUser.findOneAndUpdate({churchId: church._id, userId: commFunc.reqSessionUserId(req)},
			{churchId: church._id, userId: commFunc.reqSessionUserId(req), status: 'pending', role: 'admin'},
			{upsert: true},
			function (err) {
				console.log('ChurchUser.findOneAndUpdate has been called');
				if (err) return res.json(err);
				return res.json({status: "success", church: church});
			});

	})
};

exports.createChurchTest = function (req, res) {
	console.log('server createChurchTest has been called');
	//TODO, prevent duplicate church
	//compared by name, address
	//admin cannot create duplicate church

	var church = req.body;
	church = new Church(church);
	church.save(function (err) {
		console.log('church.save has been called');
		if (err) return res.json(err);
		ChurchUser.findOneAndUpdate({churchId: church._id, userId: req.body.userId},
			{churchId: church._id, userId: req.body.userId, status: 'approved', role: 'admin'},
			{upsert: true},
			function (err) {
				console.log('ChurchUser.findOneAndUpdate has been called');
				if (err) return res.json(err);
				//add the fellowship to the membership of the fellowship Admin user.
				Membership.update({userId: req.body.userId, 'churches.churchId': {$ne: church._id}},
					{$push: {churches: {churchId: church._id, name: church.name, role: "admin"}}},
					function (err) {
						console.log('Membership.update has been called');
						if (err) return res.json(err);
						return res.json(church);
					});
			});
	})
};

var approveChurch = function (churchId, res) {
	console.log('server approveChurch has been called');
	console.log('chk churchId parameter value');
	console.log(churchId);

	Church.findById(churchId).exec(function (err, church) {
		console.log('Church.findById has been called');
		console.log(church);

		if (err) return res.json(err);
		church.approved = true;
		church.save(function (err) {
			console.log('church.save has been called');
			console.log(church);
			if (err) return res.json(err);
			//approve the fellowship admin as well.
			ChurchUser.findOne({churchId: churchId, role: "admin"}, function (err, churchUser) {
				console.log('ChurchUser.findOne has been called');
				console.log('chk churchUser obj parameter');
				console.log(churchUser);
				if (err) return res.json(err);
				churchUser.status = "approved";
				churchUser.save(function () {
					console.log('churchUser.save has been called');
					console.log(churchUser);
					if (err) return res.json(err);
					//add the fellowship to the membership of the fellowship Admin user.
					Membership.update({userId: churchUser.userId, 'churches.churchId': {$ne: church._id}},
						{$push: {churches: {churchId: church._id, name: church.name, role: "admin"}}},
						function (err) {
							console.log('Membership.update has been called');
							if (err) return res.json(err);
							return res.json({status: "church is approved"});
						});
				});
			});
		});
	});
};

//Added 01.28.2015, extract approval logic into its own route
exports.approveChurchById=function(req, res){
	console.log('server approveChurchById has been called');
	//Scenario: site admin approves the church.
	console.log('chk req.user');
	console.log(req.user);

	console.log('chk req.user.userName');
	console.log(req.user.userName);


	console.log('chk req.body.approved');
	console.log(req.body.approved);

	if (req.user.userName === 'lc@gmail.com' && req.body.approved === true) {
		console.log('site admin criteria has been met');
		return approveChurch(req.params.id, res);
	}
};


//Put - Round1 (retest required)
exports.updateChurchById = function (req, res) {
//	console.log('server updateChurchById has been called');
//	//Scenario: site admin approves the church.
//	if (req.user.userName === 'butterfly43026@gmail.com' && req.body.approved === true) {
//		console.log('site admin criteria has been met');
//		return approveChurch(req.params.id, res);
//	}
	if (!commFunc.isChurchAdmin(req.user, req.params.id)) {
		console.log('church admin criteria has been met');
		return res.json({status: 'fail', message: 'you are not an admin for this church.'});
	}
	var church = commFunc.removeInvalidKeys(req.body, ['approved', 'name', 'about', 'url', 'address', 'city', 'state', 'country',
		'zipcode', 'phone', 'fax', 'faithStatement', 'mission', 'vision']);

	console.log('chk church obj');
	console.log(church);

	Church.update({ _id: req.params.id}, church, { multi: true }, function (err, numberAffected, raw) {
		console.log('Church.update has been called');
		if (err) return res.json(err);
		console.log('church update executed');
		return res.json({status: "success", raw: raw});
	});
};

//Get - Round1
exports.getChurchById = function (req, res) {
	//chk if entry exist match by churchId & status of approved
	if (commFunc.isChurchMember(req.user, req.params.id)) {
		Church.findOne({_id: req.params.id}).exec(function (err, church) {
			if (err) return res.json(err);
			return res.json({status: "success", church: church});
		});
	} else {
		Church.findOne({_id: req.params.id}, '-updateDate').exec(function (err, church) {
			if (err) return res.json(err);
			return res.json({status: "success", church: church});
		});
	}
};
//Get - Round1
exports.queryChurches = function (req, res) {
	//query from a particular fellowship
	//user parameter passes as search criteria
	//filter out any non-qualified parameter keys using lo-dash
	var validKeys = commFunc.removeInvalidKeys(req.query, ['ownerType', 'title']);
	Church.find(validKeys).exec(function (err, queryChurches) {
		if (err) return res.json(err);
		return res.json(queryChurches);
	});
};

//Delete - Round1
exports.deleteChurchById = function (req, res) {
	// Session user must be an admin in order to delete
	// church from Church & ChurchUser Models
	if (!commFunc.isChurchAdmin(req.user, req.params.id)) {
		return res.json({status: 'fail', message: 'you are not an admin for this church.'});
	}
	Church.findOneAndUpdate({_id: req.params.id}, {active: false}, function (err) {
		if (err) return res.json(err);
		return res.json({status: 'success', church: 'Church has been de-activated'});
	});
};
//Post - Round1
exports.addFellowshipToChurch = function (req, res) {
	//Populate data onto ChurchFellowship tbl
	Church.count({ _id: req.params.church_id}, function (err, count) {
		if (err) return res.json(err);
		if (count == 1) {
			var churchFellowship = req.body;
			churchFellowship.churchId = req.params.church_id;
			churchFellowship.fellowshipId = req.params.fellowship_id;
			churchFellowship.updateDate = new Date();
			churchFellowship.status = "Pending";
			churchFellowship = new ChurchFellowship(churchFellowship);

			churchFellowship.save(function (err) {
				if (err) return res.json(err);
				return res.json({status: "success", churchFellowship: churchFellowship});
			})
		}
	});
};

//Test - Round1
exports.addFellowshipToChurchTest = function (req, res) {
	console.log('server addFellowshipToChurchTest has been called');
	//Populate data onto ChurchFellowship tbl
	Church.count({ _id: req.body.churchId}, function (err, count) {
		console.log('server Church.count has been called');
		if (err) return res.json(err);
		if (count == 1) {
			console.log('count equates to 1');
			var churchFellowship = req.body;
			churchFellowship.churchId = req.body.churchId;
			churchFellowship.fellowshipId = req.body.fellowshipId;
			churchFellowship.updateDate = new Date();
			churchFellowship.status = "Approved";
			churchFellowship = new ChurchFellowship(churchFellowship);

			churchFellowship.save(function (err) {
				console.log('server churchFellowship.save has been called');
				if (err) return res.json(err);
				return res.json({status: "success", churchFellowship: churchFellowship});
			})
		}
	});
};

//Added 01.28.2015, extract approval logic into its own route
exports.approveFellowshipToChurch=function(req, res){
	ChurchFellowship.findOne({ churchId: req.params.church_id, fellowshipId: req.params.fellowship_id}).exec(function (err, churchFellowship) {
		if (err) return res.json(err);
		if (churchFellowship.status == "pending") {
			churchFellowship.status = "approved";
			churchFellowship.updateDate = new Date();
			churchFellowship.save(function (err) {
				if (err) return res.json(err);
				//add all fellowshipsUsers to churchUsers
				FellowshipUser.find({fellowshipId: churchFellowship.fellowshipId}).exec(function (err, fellowshipUsers) {
					if (err) return res.json(err);
					var userIds = _.pluck(fellowshipUsers, 'userId');
					var churchUserArray = [];
					_.forEach(userIds, function (userId) {
						churchUserArray.push({
							churchId: req.params.church_id,
							userId: userId,
							status: "approved",
							role: "member"
						});
					});
					ChurchUser.create(churchUserArray, function (err) {
						if (err) return res.json(err);
						//add church to membership where user has this fellowship.
						Church.findOne({_id: req.params.church_id}, 'name').exec(function (err, church) {
							console.log('chk church');
							console.log(church);

							if (err) return res.json(err);
							Membership.update({'fellowships.fellowshipId': req.params.fellowship_id, 'churches.churchId': {$ne: req.params.church_id}}, {$push: {churches: {churchId: req.params.church_id, name: church.name, role: "member"}}}, function (err) {
								if (err) return res.json(err);
								//locate fellowship admin record
								//find will always return array
								//findOne will return object
								FellowshipUser.findOne({fellowshipId:req.params.fellowship_id,role:'admin'}).populate('fellowshipId').exec(function(err,fellowAdmin){
									if (err) return res.json(err);
									console.log('chk fellowAdmin obj');
									console.log(fellowAdmin);

									var notification = new Notification({recipient:fellowAdmin.userId,url:'http://localhost:3030/church/'+req.params.church_id, message:fellowAdmin.fellowshipId.name +'has been approved by your Church, '+church.name});
									notification.save(function (err) {
										console.log('notification.save has been called');
										if (err) return res.json(err);
										return res.json(notification);
									});
								});
								return res.json({status: "success"});
							});
						});
					});
				});
			});
		}
	});
};

exports.rejectFellowshipToChurch=function(req, res){
	ChurchFellowship.findOne({ churchId: req.params.church_id, fellowshipId: req.params.fellowship_id}).exec(function (err, churchFellowship) {
		if (err) return res.json(err);
		if (churchFellowship.status === "pending") {
			churchFellowship.status = "rejected";
			churchFellowship.rejReason = req.body.rejReason;
			churchFellowship.updateDate = new Date();
			churchFellowship.save(function (err) {
				if (err) return res.json(err);
				return res.json({status: "success"});
			});
		}
	});
};

//Put -Round 1
exports.updateFellowshipToChurch = function (req, res) {
	//Only admin privilege allowed to update from ChurchFellowship tbl
	if (!commFunc.isChurchAdmin(req.user, req.params.church_id)) {
		return res.json({status: 'fail', message: 'you are not an admin for this church.'});
	}
	ChurchFellowship.findOne({ churchId: req.params.church_id, fellowshipId: req.params.fellowship_id}).exec(function (err, churchFellowship) {
		if (err) return res.json(err);
		if (churchFellowship.status == "pending" && req.body.status == "approved") {
			churchFellowship.status = req.body.status;
			churchFellowship.updateDate = new Date();
			churchFellowship.save(function (err) {
				if (err) return res.json(err);
				//add all fellowshipsUsers to churchUsers
				FellowshipUser.find({fellowshipId: churchFellowship.fellowshipId}).exec(function (err, fellowshipUsers) {
					if (err) return res.json(err);
					var userIds = _.pluck(fellowshipUsers, 'userId');
					var churchUserArray = [];
					_.forEach(userIds, function (userId) {
						churchUserArray.push({
							churchId: req.params.church_id,
							userId: userId,
							status: "approved",
							role: "member"
						});
					});
					ChurchUser.create(churchUserArray, function (err) {
						if (err) return res.json(err);
						//add church to membership where user has this fellowship.
						Church.find({_id: req.params.church_id}, 'name').exec(function (err, church) {
							if (err) return res.json(err);
							Membership.update({'fellowships.fellowshipId': req.params.fellowship_id, 'churches.churchId': {$ne: req.params.church_id}}, {$push: {churches: {churchId: req.params.church_id, name: church.name, role: "member"}}}, function (err) {
								if (err) return res.json(err);
								return res.json({status: "success"});
							});
						});
					});
				});
			});
		}
		if (churchFellowship.status === "pending" && req.body.status === "rejected") {
			churchFellowship.status = req.body.status;
			churchFellowship.rejReason = req.body.rejReason;
			churchFellowship.updateDate = new Date();
			churchFellowship.save(function (err) {
				if (err) return res.json(err);
				return res.json({status: "success"});
			});
		}
	});
};
//Get- Round1
exports.getFellowships = function (req, res) {
	console.log('server getFellowships has been called');
	//chk if entry exist match by churchId & status of approved
	ChurchFellowship.find({churchId: req.params.church_id}, 'fellowshipId').populate('fellowshipId').exec(function (err, churchFellowships) {
		console.log('ChurchFellowship.find has been called');
		console.log('chk churchFellowships obj');
		console.log(churchFellowships);
		if (err) return res.json(err);
		return res.json(_.pluck(churchFellowships, 'fellowshipId'));
	});
};

//Delete Round1
exports.removeFellowshipFromChurch = function (req, res) {
	// Session user must be an admin in order to delete
	// church from ChurchFellowship Models
	if (!commFunc.isChurchAdmin(req.user, req.params.church_id)) {
		return res.json({status: 'fail', message: 'you are not an admin for this church.'});
	}
	ChurchFellowship.remove({churchId: req.params.church_id, fellowshipId: req.params.fellowship_id}, function (err) {
		if (err) return res.json(err);
		return res.json({status: "successfully removed from ChurchFellowship"});
	})
};

//Post
exports.addUserToChurch = function (req, res) {
	//Populate data onto ChurchUser tbl
	Church.count({ _id: req.params.church_id}, function (err, count) {
		if (count == 1) {
			var churchUser = req.body;
			churchUser.userId = req.user._id;
			churchUser.churchId = req.params.church_id;
			churchUser.status = "Pending";
			churchUser.role = churchUser.role;

			churchUser = new ChurchUser(churchUser);
			churchUser.save(function (err) {
				if (err) return res.json(err);
				return res.json({status: "success", churchUser: churchUser});
			})
		}
	});
};

//Added 01.28.2015, extract approval logic into its own route
exports.approveUserToChurch=function(req, res){
	console.log('server approveUserToChurch has been called');

};


//Put
exports.updateUserToChurch = function (req, res) {
	//Only admin privilege allowed to update from ChurchUser tbl
	if (!commFunc.isChurchAdmin(req.user, req.params.id)) {
		return res.json({status: 'fail', message: 'you are not an admin for this church.'});
	}
	var churchUser = commFunc.removeInvalidKeys(req.body, ['rejReason', 'status', 'role']);
	churchUser.updateDate = new Date();

	var preStatus = churchUser.status;
	ChurchUser.findOneAndUpdate({ userId: commFunc.reqSessionUserId(req), churchId: req.params.church_id}, churchUser).populate('churchId').exec(function (err, churchUser) {
		if (err) return res.json(err);
		//if user is approved. add fellowshipId to membership.
		if (preStatus === 'pending' && churchUser.status === 'approved') {
			membership.churches.push({
				churchId: churchUser.churchId._id,
				churchName: churchUser.churchId.name,
				role: churchUser.role
			});
			membership.save(function (err) {
				if (err) return res.json(err);
				return res.json({status: "success", message: "update user to fellowship successfully"});
			});
		} else {
			return res.json({status: "success", message: "update user to fellowship successfully"});
		}
		return res.json({status: "success", raw: raw});
	});
};
//Get
exports.getUsers = function (req, res) {
	//chk if entry exist match by churchId & status of approved
	ChurchUser.find({churchId: req.params.church_id}, 'userId').populate('userId').exec(function (err, churchUsers) {
		if (err) return res.json(err);
		return res.json({status: "success", churchUsers: _.pluck(churchUsers, 'userId')});
	});
};

//Delete
exports.removeUserFromChurch = function (req, res) {
	// Session user must be an admin in order to delete
	// church from ChurchFellowship Models
	if (!commFunc.isChurchAdmin(req.user, req.params.id)) {
		return res.json({status: 'fail', message: 'you are not an admin for this church.'});
	}
	ChurchUser.remove({churchId: req.params.church_id, userId: commFunc.reqSessionUserId(req)}, function (err) {
		if (err) return res.json(err);
		//remove this fellowship from all membership.
		Membership.update({userId: req.params.user_id, 'churches.churchId': req.params.id}, {$pull: {churches: {churchId: req.params.id}}}, function (err) {
			if (err) return res.json(err);
			return res.json({status: "successfully removed from ChurchUser"});
		});
	})
};
