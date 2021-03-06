var Fellowship = require('mongoose').model('Fellowship'),
    FellowshipUser = require('mongoose').model('FellowshipUser'),
    Church = require('mongoose').model('Church'),
    ChurchFellowship = require('mongoose').model('ChurchFellowship'),
    ChurchUser = require('mongoose').model('ChurchUser'),
    Membership = require('mongoose').model('Membership'),
    Album = require('mongoose').model('Album'),
    Calendar = require('mongoose').model('Calendar'),
    Notification = require('mongoose').model('Notification'),
    commFunc = require('../utilities/commonFunctions'),
    deleteKey = require('key-del'),
    async = require('async'),
    _ = require('lodash');
//Library for Array

//Post - Round1
exports.createFellowship = function(req, res) {
	console.log('server createFellowship function has been called');
	var fellowship = req.body;

	//TODO, prevent duplicate fellowship
	//compared by name, address, if there's associated church,
	//admin cannot create duplicate fellowships
	fellowship = commFunc.removeInvalidKeys(req.body, ['name', 'about', 'address', 'city', 'state', 'country', 'zipcode', 'phone']);
	fellowship = new Fellowship(fellowship);
	console.log('chking fellowship obj');
	console.log(fellowship);

	//TODO call geocoding to get the coordinate

	fellowship.save(function(err) {
		console.log('fellowship.save has been called');
		console.log('chking fellowship obj inside .save');
		console.log(fellowship);

		if (err)
			return res.json(err);

		var fellowshipUser = new FellowshipUser();
		fellowshipUser.userId = req.user._id;
		fellowshipUser.fellowshipId = fellowship._id;
		fellowshipUser.status = 'pending';
		fellowshipUser.role = 'admin';

		console.log('chking fellowshipUser');
		console.log(fellowshipUser);

		fellowshipUser.save(function(err) {
			console.log('fellowshipUser.save has been called');
			if (err)
				return res.json(err);
			return res.json({
				status : "success",
				fellowship : fellowship
			});
		});
	});
};

//Test - Round1
exports.createFellowshipTest = function(req, res) {
	console.log('server createFellowship function has been called');

	var fellowship = req.body;

	//TODO, prevent duplicate fellowship
	//compared by name, address, if there's associated church,
	//admin cannot create duplicate fellowships
	//fellowship=commFunc.removeInvalidKeys(req.body,['name','about','address','city','state',
	//	'country','zipcode','phone']);
	fellowship = new Fellowship(fellowship);
	console.log('chking fellowship obj');
	console.log(fellowship);

	//TODO call geocoding to get the coordinate
	//fellowship.approved=true; //added 12.27.2014
	fellowship.save(function(err) {
		console.log('fellowship.save has been called');
		console.log('chking fellowship obj inside .save');
		console.log(fellowship);

		if (err)
			return res.json(err);

		var fellowshipUser = new FellowshipUser();
		fellowshipUser.userId = req.body.userId;
		fellowshipUser.fellowshipId = fellowship._id;
		fellowshipUser.status = 'approved';
		fellowshipUser.role = 'admin';

		console.log('chking fellowshipUser');
		console.log(fellowshipUser);

		fellowshipUser.save(function(err) {
			console.log('fellowshipUser.save has been called');
			if (err)
				return res.json(err);
			var pushObj = {
				fellowshipId : fellowship._id,
				name : fellowship.name,
				role : "admin"
			}
			Membership.update({
				userId : fellowshipUser.userId,
				'fellowships.fellowshipId' : {
					$ne : fellowship._id
				}
			}, {
				$push : {
					fellowships : pushObj
				}
			}, function(err) {
				console.log('Membership.update has been called');
				if (err)
					return res.json(err);
				return res.json(fellowship);
			});
		});
	});
};

var approveFellowship = function(fellowshipId, req, res) {
	console.log('server approveFellowship function has been called');

	Fellowship.findById(fellowshipId).exec(function(err, fellowship) {
		console.log('chk fellowship');
		console.log(fellowship);

		//TODO chk if album, calendar already exist then do not create default album/calendar

		if (err)
			return res.json(err);
		var album = new Album({
			name : "Fellowship Photos",
			createdBy : req.user._id
		});
		var calendar = new Calendar({
			createdBy : req.user._id,
			ownerType : "fellowship",
			fellowshipId : fellowship._id,
			title : "Fellowship Calendar"
		});
		var albumId,
		    calendarId;
		async.parallel([
		function(callback) {
			console.log("create a default album");
			album.save(function(err) {
				if (err)
					return callback(err);
				albumId = album._id;
				callback(null);
			});
		},
		function(callback) {
			console.log("create a default calendar");
			calendar.save(function(err) {
				if (err)
					return callback(err);
				calendarId = calendar._id;
				callback(null);
			});
		}], function(err) {
			console.log("update fellowship");
			if (err)
				return res.json(err);
			fellowship.approved = true;
			fellowship.defaultAlbumId = albumId;
			fellowship.calendarIds = calendarId;
			fellowship.save(function(err) {
				console.log("chk fellowship after save");
				console.log(fellowship);
				if (err)
					return res.json(err);
				//approve the fellowship admin as well.
				//locate fellowship admin record
				//find will always return array
				//findOne will return object
				FellowshipUser.findOne({
					fellowshipId : fellowship._id,
					role : "admin"
				}).populate('fellowshipId').exec(function(err, fellowshipUser) {
					console.log('chk fellowshipUser');
					console.log(fellowshipUser);
					if (err)
						return res.json(err);

					fellowshipUser.status = "approved";
					fellowshipUser.save(function(err) {
						console.log('chk fellowshipUser after save');
						console.log(fellowshipUser);
						if (err)
							return res.json(err);

						var notification = new Notification({
							recipient : fellowshipUser.userId,
							url : 'http://localhost:3030/fellowship/' + fellowshipUser.fellowshipId._id,
							message : fellowshipUser.fellowshipId.name + 'has been approved'
						});
						notification.save(function(err) {
							console.log('notification.save has been called');
							if (err)
								return res.json(err);

							var pushObj = {
								fellowshipId : fellowship._id,
								name : fellowship.name,
								role : "admin"
							};
							//Update membership table
							Membership.update({
								userId : fellowshipUser.userId,
								'fellowships.fellowshipId' : {
									$ne : fellowship._id
								}
							}, {
								$push : {
									fellowships : pushObj
								}
							}, function(err) {
								console.log('Membership.update has been called');
								if (err)
									return res.json(err);
								return res.json(notification);
							});
						});

					});
				});
			});
		});
	});
};

//added on 01.21.2015
exports.approveFellowshipById = function(req, res) {
	console.log('server approveFellowshipById has been called');
	//TODO test this scenario after creation of church
	//Scenario: church admin approves the fellowship.
	if (req.body.approved === true) {
		console.log('church admin condition met');
		//1. find out the churchId it associated with this fellowship.
		//if user userName=butterfly43026@gmail.com then we can bypass admin church approval
		ChurchFellowship.findOne({
			fellowshipId : req.params.id
		}).exec(function(err, churchFellowship) {
			console.log('ChurchFellowship.findOne has been called');

			console.log('chk req.user');
			console.log(req.user);

			console.log('chk churchFellowship obj');
			console.log(churchFellowship);

			if (err)
				return res.json(err);
			//2. check current user is the church admin.
			if (commFunc.isChurchAdmin(req.user, churchFellowship.churchId)) {
				console.log('isChurchAdmin condition met');
				//3. approve the fellowship and add approve fellowship admin user.
				return approveFellowship(req.params.id, req, res);
			} else {
				return res.json({
					status : "fail",
					message : 'your are not allowed to approve the fellowship'
				});
			}
		});
	}

};

//Put - Round1
exports.updateFellowshipById = function(req, res) {
	console.log('server updateFellowshipById has been called');
	//Scenario: site admin approves the fellowship.
	if (req.user && req.user.userName === 'butterfly43026@gmail.com' && req.body.approved === true) {
		console.log('site admin approval criteria has been met');
		return approveFellowship(req.params.id, req, res);
	}

	console.log('chk req.user obj to check role & status');
	console.log(req.user);

	console.log('chk req.user._id obj');
	console.log(req.user._id);

	console.log('chk req.params.id obj');
	console.log(req.params.id);

	//regular fellowship content update by fellowship admin
	FellowshipUser.count({
		userId : req.user._id,
		fellowshipId : req.params.id,
		role : 'admin',
		status : 'approved'
	}, function(err, count) {
		console.log('FellowshipUser.count has been called');
		if (err)
			return res.json(err);
		if (count > 0) {
			console.log('count > 0 has been met');
			var fellowship = commFunc.removeInvalidKeys(req.body, ['name', 'about', 'address', 'city', 'state', 'country', 'zipcode', 'phone', 'bannerImage', 'logoImage']);

			Fellowship.update({
				_id : req.params.id
			}, fellowship, {
				multi : true
			}, function(err, numberAffected, raw) {
				console.log('chk fellowship obj within Fellowship.update call');
				console.log(fellowship);
				if (err)
					return res.json(err);
				return res.json({
					status : "success",
					raw : raw
				});
			});
		}
		;
	});
};

//Get - Round1
exports.getFellowshipById = function(req, res) {
	console.log('server getFellowshipById has been called ');
	//chk if entry exist match by fellowshipId & status of approved
	FellowshipUser.count({
		fellowshipId : req.params.id,
		userId : req.user._id,
		status : 'approved'
	}, function(err, count) {
		if (count == 1) {
			Fellowship.findOne({
				_id : req.params.id
			}).exec(function(err, fellowship) {
				if (err)
					return res.json(err);
				return res.json(fellowship);
			});
		} else {
			Fellowship.findOne({
				_id : req.params.id
			}, '-albumIds -fileIds -calendarIds').exec(function(err, fellowship) {
				if (err)
					return res.json(err);
				return res.json(fellowship);
			});

		}
		;
	});

};

//Delete - Round 1
exports.deleteFellowshipById = function(req, res) {
	// Session user must be an admin in order to delete
	// fellowship from Fellowship & FellowUser Models
	if (!commFunc.isFellowshipAdmin(req.user, req.params.id)) {
		return res.json({
			status : 'fail',
			message : 'you are not an admin for this fellowship.'
		});
	}
	Fellowship.findOneAndUpdate({
		_id : req.params.id
	}, {
		active : false
	}, function(err) {
		if (err)
			return res.json(err);
		return res.json({
			status : 'success',
			church : 'Fellowship has been de-activated'
		});
	});
};

//Post - Round1
exports.addUserToFellowship = function(req, res) {
	console.log('server addUserToFellowship has been called');
	//Populate data onto FellowshipUsers tbl
	FellowshipUser.count({
		fellowshipId : req.params.fellowship_id,
		userId : req.params.user_id
	}, function(err, count) {
		console.log('Chk count against Fellowship tbl, chk if fellowship exist');
		if (count == 0) {
			var fellowshipUser = req.body;
			fellowshipUser.userId = req.user._id;
			fellowshipUser.fellowshipId = req.params.fellowship_id;
			console.log(fellowshipUser.userId);
			console.log(fellowshipUser.fellowshipId);
			fellowshipUser.status = "Pending";
			fellowshipUser.role = 'member';
			fellowshipUser = new FellowshipUser(fellowshipUser);
			fellowshipUser.save(function(err) {
				console.log(err);
				if (err)
					return res.json(err);
				console.log('fellowship user has been saved');
				return res.json({
					status : "success",
					fellowshipUser : fellowshipUser
				});
			});
		} else {
			return res.json({
				status : "success",
				fellowshipUser : req.body
			});
		}
	});
};

exports.addUserToFellowshipTest = function(req, res) {
	//Populate data onto FellowshipUsers tbl
	Fellowship.count({
		_id : req.body.fellowshipId
	}, function(err, count) {

		if (count == 1) {
			var fellowshipUser = req.body;
			fellowshipUser.userId = req.body.userId;
			fellowshipUser.fellowshipId = req.body.fellowshipId;

			//fellowshipUser.status = "Pending";
			fellowshipUser.role = 'member';
			fellowshipUser = new FellowshipUser(fellowshipUser);
			fellowshipUser.save(function(err) {
				if (err)
					return res.json(err);
				return res.json({
					status : "success",
					fellowshipUser : fellowshipUser
				});
			})
		}
	});
};

exports.queryFellowships = function(req, res) {
	//TODO geo search
	console.log(req.query);
	if (!_.isEmpty(req.query)) {
		console.log("req.query is not empty");
		if (req.query.lat && req.query.lng && req.query.maxDistance) {
			Fellowship.find({
				geo : {
					$near : [Number(req.query.lat), Number(req.query.lng)],
					$maxDistance : Number(req.query.maxDistance) / 111.12
				}
			}).exec(function(err, queryFellowships) {
				console.log('chk queryFellowships results using geospatial');
				console.log(queryFellowships);
				if (err)
					return res.json(err);
				return res.json(queryFellowships);
			});
		}
	} else {
		//below is for site admin to retrieve a list of yet approved fellowships.
		console.log('server queryFellowships has been called');
		if (req.user) {
			//populate Fellowships where approved status is false
			Fellowship.find({
				approved : true
			}).exec(function(err, queryFellowships) {
				console.log('chk queryFellowships results');
				console.log(queryFellowships);

				if (err)
					return res.json(err);
				return res.json(queryFellowships);
			});
		} else if (req.user && req.user.userName == "butterfly43026@gmail.com") {
			//populate Fellowships where approved status is false
			Fellowship.find({
				approved : false
			}).exec(function(err, queryFellowships) {
				console.log('chk queryFellowships results');
				console.log(queryFellowships);

				if (err)
					return res.json(err);
				return res.json(queryFellowships);
			});

		} else {
			return res.json({
				status : "failure",
				message : "you are not allowed to call this"
			});
		}
	}

};

exports.getUsersFromFellowship = function(req, res) {
	//Populate users associated to a fellowship
	//Search FellowUser model by fellowshipId against param id,
	//then populate user table
	//	console.log(req.user);
	console.log('server getUsersFromFellowship has been called');
	console.log('chk req.query');
	console.log(req.query);
	console.log('chk req.user');
	console.log(req.user);

	if (_.isEmpty(req.query)) {
		console.log('req.query is empty condition is met');
		var condition;
		//if your site admin then grab for all statuses
		if (commFunc.isFellowshipAdmin(req.user, req.params.fellowship_id)) {
			console.log('admin condition is met, will grab all statuses');
			condition = {
				fellowshipId : req.params.fellowship_id
			};

		} else {
			console.log('user condition is met, only grab approved statues');
			condition = {
				fellowshipId : req.params.fellowship_id,
				status : 'approved'
			};
		}

		FellowshipUser.find(condition).populate("userId").exec(function(err, fellowshipUsers) {
			console.log('FellowshipUser.find has been called and populate data depending on admin/user condition');
			if (err)
				return res.json(err);
			console.log('chk fellowshipUsers');
			console.log(fellowshipUsers);
			return res.json(fellowshipUsers);
		});

	}
};



//Put - Round 1
//TODO this function needs re-write
exports.updateUserToFellowship = function(req, res) {
	console.log('server updateUserToFellowship has been called');

	if (!commFunc.isFellowshipSuperAdmin(req.user, req.params.fellowship_id)) {
		return res.json({
			status : 'fail',
			message : 'you are not an admin for this fellowship.'
		});
	}
	var fellowshipUserObj = commFunc.removeInvalidKeys(req.body, ['status', 'role', 'rejectReason', 'updateDate']);
	var preStatus;
	var fellowshipUserInstance;
	async.series([
	function(callback) {
		console.log("retrieve the fellowshipUser instance");
		FellowshipUser.findOne({
			userId : req.params.user_id,
			fellowshipId : req.params.fellowship_id
		}).populate('fellowshipId').exec(function(err, fellowshipUser) {
			if (err)
				callback(err);
			fellowshipUserInstance = fellowshipUser;
			callback();
		});
	},
	function(callback) {
		console.log("update the fellowshipUser instance");
		preStatus = fellowshipUserInstance.status;
		console.log('chk preStatus');
		console.log(preStatus);
		if (fellowshipUserObj.status === preStatus || ['rejected', 'approved', 'pending'].indexOf(fellowshipUserObj.status) === -1) {
			console.log('chk fellowshipUserObj.status');
			console.log(fellowshipUserObj.status);
			return res.json({
				status : 'fail',
				message : 'invalid status string or update with the same status value.'
			});
		}
		if (fellowshipUserObj.status === 'rejected' && !fellowshipUserObj.rejectReason) {
			return res.json({
				status : "fail",
				message : "to reject, you must provide a reason"
			});
		}
		fellowshipUserInstance = commFunc.updateInstanceWithObject(fellowshipUserObj, fellowshipUserInstance);
		console.log(fellowshipUserInstance);
		fellowshipUserInstance.save(function(err) {
			if (err)
				callback(err);
			callback();
		});
	},
	function(callback) {
		async.parallel([
		function(callback) {
			console.log("add fellowship to the user's membership tbl.");
			if (preStatus === 'pending' && fellowshipUserInstance.status === 'approved') {
				var fellowship = {
					fellowshipId : fellowshipUserInstance.fellowshipId._id,
					name : fellowshipUserInstance.fellowshipId.name,
					role : fellowshipUserInstance.role
				};
				Membership.findOneAndUpdate({
					userId : req.params.user_id,
					'fellowships.fellowshipId' : {
						$ne : fellowshipUserInstance.fellowshipId._id
					}
				}, {
					$push : {
						fellowships : fellowship
					}
				}).exec(function(err) {
					if (err)
						return callback(err);
					callback();
				});
			}
		},
		function(callback) {
			//TODO: test the scenario where there is church that this fellowship belonged to.
			async.waterfall([
			function(callback) {
				console.log("see if this fellowship has any church.");
				ChurchFellowship.findOne({
					fellowshipId : fellowshipUserInstance.fellowshipId._id
				}).select('churchId').exec(function(err, churchFellowship) {
					if (err)
						return callback(err);
					if (!churchFellowship)
						return callback("This fellowhsip has no church connected.");
					callback(null, [churchFellowship]);
				});
			},
			function(result, callback) {
				console.log("add this user to that church if churchfellowship instance exists.");
				var churchFellowship = result[0];
				var churchUser = {
					churchId : churchFellowship.churchId,
					userId : fellowshipUserInstance.userId,
					status : "approved",
					role : "member"
				};
				ChurchUser.update({
					churchId : churchFellowship.churchId,
					userId : fellowshipUserInstance.userId
				}, churchUser, {
					upsert : true
				}, function(err) {
					if (err)
						return callback(err);
					callback(null, result);
				});
			},
			function(result, callback) {
				console.log("need to find the church name first for updating membership tbl.");
				console.log(result);
				var churchFellowship = result[0];
				//and updated membership tbl. need to find the church name first.
				Church.find({
					_id : churchFellowship.church_id
				}, 'name').exec(function(err, church) {
					if (err)
						return callback(err);
					callback(null, [churchFellowship, church]);
				});
			},
			function(result, callback) {
				console.log("update membership tbl. ");
				var churchFellowship = result[0];
				var church = result[1];
				Membership.update({
					'userId' : req.user._id,
					'churches.churchId' : {
						$ne : churchFellowship.churchId
					}
				}, {
					$push : {
						churches : {
							churchId : churchFellowship.churchId,
							name : church.name,
							role : "member"
						}
					}
				}, function(err) {
					if (err)
						return callback(err);
					callback(null, result);
				});
			}], callback);
		}], callback);
	}], function(err) {
		console.log("finally done");
		if (err)
			return res.json(err);

		console.log('chk recipient, req.user._id');
		console.log(req.user._id);

		console.log('chk fellowship id, fellowshipUserInstance.fellowshipId._id');
		console.log(fellowshipUserInstance.fellowshipId._id);

		console.log('chk fellowship name, fellowshipUserInstance.fellowshipId.name');
		console.log(fellowshipUserInstance.fellowshipId.name);

		var notification = new Notification({
			recipient : req.user._id,
			url : 'http://localhost:3030/fellowship/' + fellowshipUserInstance.fellowshipId._id,
			message : fellowshipUserInstance.fellowshipId.name + 'has been approved'
		});
		notification.save(function(err) {
			console.log('notification.save has been called within updateUserToFellowship');
			console.log('chk notification');
			console.log(notification);

			if (err)
				return res.json(err);
			return res.json(notification);
		});
		return res.json({
			status : "success",
			message : "user is updated on the fellowship."
		});
	});
};

//Added 01.28.2015, extract approval logic into its own route
exports.approveUserToFellowship = function(req, res) {
	var fellowshipId = req.params.fellowship_id;
	var userId = req.params.user_id;
	var sessionUser = req.user;
	if (!commFunc.isFellowshipSuperAdmin(sessionUser, fellowshipId)) {
		return res.json({status:"no permission to perform action."});
	}
	async.waterfall([
		function(callback){
			FellowshipUser.findOne({
				fellowshipId : fellowshipId,
				userId : userId
			}).populate('fellowshipId').exec(function(err, fellowshipUser) {
				if (err)
					callback(err);
				callback(null, fellowshipUser);
			});
		},
		function(fellowshipUserInstance, callback){
			fellowshipUserInstance.status = 'approved';
			fellowshipUserInstance.save(function(err){
				if (err)
					callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function(fellowshipUserInstance, callback){
			var fellowship = {
				fellowshipId : fellowshipId,
				name : fellowshipUserInstance.fellowshipId.name,
				role : fellowshipUserInstance.role
			};
			Membership.findOneAndUpdate({
				userId : userId,
				'fellowships.fellowshipId' : {
					$ne : fellowshipUserInstance.fellowshipId._id
				}
			}, {
				$push : {
					fellowships : fellowship
				}
			}).exec(function(err) {
				if (err)
					callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function (fellowshipUserInstance, callback) {
			var notification = new Notification({
				recipient : userId,
				url : '/fellowship/' + fellowshipId,
				message : 'You have been approved to join ' + fellowshipUserInstance.fellowshipId.name
			});
			notification.save(function(err) {
				if (err)
					callback(err);
				callback();
			});
		}
	],function(err){
		if (err)
			res.json(err);
		res.json({status: "success"});
	});
};

exports.denyUserToFellowship = function(req, res) {
	var fellowshipId = req.params.fellowship_id;
	var userId = req.params.user_id;
	var reason = req.body.reason;
	var sessionUser = req.user;
	if (!commFunc.isFellowshipSuperAdmin(sessionUser, fellowshipId)) {
		return res.json({status:"no permission to perform action."});
	}
	async.waterfall([
		function(callback){
			FellowshipUser.findOne({
				fellowshipId : fellowshipId,
				userId : userId
			}).populate('fellowshipId').exec(function(err, fellowshipUser) {
				if (err)
					callback(err);
				callback(null, fellowshipUser);
			});
		},
		function(fellowshipUserInstance, callback){
			FellowshipUser.remove({
				fellowshipId : req.params.fellowship_id,
				userId : req.params.user_id
			}, function(err) {
				if (err) callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function (fellowshipUserInstance, callback) {
			var notification = new Notification({
				recipient : userId,
				url : '/fellowship/' + fellowshipId,
				message : 'Your request to join ' + fellowshipUserInstance.fellowshipId.name + 'has been denied, because ' + reason
			});
			notification.save(function(err) {
				if (err)
					callback(err);
				callback();
			});
		}
	],function(err){
		if (err)
			res.json(err);
		res.json({status: "success"});
	});
};
exports.removemember = function(req, res){
	console.log("test");
	Membership.update({
		'userId' : '54a0f90599b81bbbb99a00b9',
		'fellowships.fellowshipId' : '54a0f90799b81bbbb99a00cf'
	}, {
		$pull : {
			'fellowships':{ 'fellowshipId' : '54a0f90799b81bbbb99a00cf'}
		}
	}, function(err, numAffected) {
		console.log("numAffected");
		console.log(numAffected);
		console.log(err);
		if (err || numAffected === 0)
			return res.json(error);
		res.json({status:"success"});
	});
};
exports.removeUserFromFellowship = function(req, res) {
	var fellowshipId = req.params.fellowship_id;
	var userId = req.params.user_id;
	var reason = req.body.reason;
	var sessionUser = req.user;
	console.log("userID");
	console.log(userId);
		console.log("fellowshipID");
	console.log(fellowshipId);
		console.log("reason");
	console.log(reason);
	//return res.json({status:"success"});
	if (!commFunc.isFellowshipSuperAdmin(sessionUser, fellowshipId)) {
		return res.json({status:"no permission to perform action."});
	}
	async.waterfall([
		function(callback){
			FellowshipUser.findOne({
				fellowshipId : fellowshipId,
				userId : userId
			}).populate('fellowshipId').exec(function(err, fellowshipUser) {
				if (err)
					callback(err);
				callback(null, fellowshipUser);
			});
		},
		function(fellowshipUserInstance, callback){
			FellowshipUser.remove({
				fellowshipId : req.params.fellowship_id,
				userId : req.params.user_id
			}, function(err) {
				if (err) callback(err);
				callback(null, fellowshipUserInstance);
			});
			// fellowshipUserInstance.status = 'removed';
			// fellowshipUserInstance.rejectReason = reason;
			// fellowshipUserInstance.updateDate = new Date();
			// fellowshipUserInstance.save(function(err){
				// if (err)
					// callback(err);
				// callback(null, fellowshipUserInstance);
			// });
		},
		function(fellowshipUserInstance, callback){
			Membership.update({
				'userId' : userId,
				'fellowships.fellowshipId' : fellowshipId
			}, {
				$pull : {
					'fellowships':{ 'fellowshipId' : fellowshipId}
				}
			}, function(err, numAffected) {
				console.log("numAffected");
				console.log(numAffected);
				if (err || numAffected === 0)
					return callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function (fellowshipUserInstance, callback) {
			var notification = new Notification({
				recipient : userId,
				url : '/fellowship/' + fellowshipId,
				message : 'You have been removed from ' + fellowshipUserInstance.fellowshipId.name + ', because ' + reason
			});
			notification.save(function(err) {
				if (err)
					callback(err);
				callback();
			});
		}
	],function(err){
		if (err)
			res.json(err);
		res.json({status: "success"});
	});
};

exports.removeSubAdmin = function (req, res) {
	var fellowshipId = req.params.fellowship_id;
	var userId = req.params.user_id;
	var sessionUser = req.user;
	if (!commFunc.isFellowshipSuperAdmin(sessionUser, fellowshipId)) {
		return res.json({status:"no permission to perform action."});
	}
	async.waterfall([
		function(callback){
			FellowshipUser.findOne({
				fellowshipId : fellowshipId,
				userId : userId
			}).populate('fellowshipId').exec(function(err, fellowshipUser) {
				if (err)
					callback(err);
				callback(null, fellowshipUser);
			});
		},
		function(fellowshipUserInstance, callback){
			fellowshipUserInstance.role = 'member';
			fellowshipUserInstance.updateDate = new Date();
			fellowshipUserInstance.save(function(err){
				if (err)
					callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function(fellowshipUserInstance, callback){
			Membership.update({
				'userId' : userId,
				'fellowships.fellowshipId' : fellowshipId
			}, {
				$set : {
					'fellowships.$.role' : 'member'
				}
			}, function(err, numAffected) {
				console.log("numAffected");
				console.log(numAffected);
				if (err || numAffected === 0)
					return callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function (fellowshipUserInstance, callback) {
			var notification = new Notification({
				recipient : userId,
				url : '/fellowship/' + fellowshipId,
				message : 'Your sub admin role has been removed for ' + fellowshipUserInstance.fellowshipId.name
			});
			notification.save(function(err) {
				if (err)
					callback(err);
				callback();
			});
		}
	], function(err){
		if(err) return res.json(err);
		return res.json({status:"success"});
	});
};

exports.makeSubAdmin = function	(req, res){
	//check if the session user is superAdmin.
	//update fellowshipUser table
	var fellowshipId = req.params.fellowship_id;
	var userId = req.params.user_id;
	var sessionUser = req.user;
	if (!commFunc.isFellowshipSuperAdmin(sessionUser, fellowshipId)) {
		return res.json({status:"no permission to perform action."});
	}
	console.log(fellowshipId);
	console.log(userId);
	async.waterfall([
		function(callback){
			FellowshipUser.findOne({
				fellowshipId : fellowshipId,
				userId : userId
			}).populate('fellowshipId').exec(function(err, fellowshipUser) {
				if (err)
					callback(err);
				console.log("fellowshipUser");
				console.log(fellowshipUser.toString());
				callback(null, fellowshipUser);
			});
		},
		function(fellowshipUserInstance, callback){
			fellowshipUserInstance.role = 'subadmin';
			fellowshipUserInstance.updateDate = new Date();
			fellowshipUserInstance.save(function(err){
				if (err)
					callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function(fellowshipUserInstance, callback){
			Membership.update({
				'userId' : userId,
				'fellowships.fellowshipId' : fellowshipId
			}, {
				$set : {
					'fellowships.$.role' : 'subadmin'
				}
			}, function(err, numAffected) {
				if (err || numAffected === 0)
					return callback(err);
				callback(null, fellowshipUserInstance);
			});
		},
		function (fellowshipUserInstance, callback) {
			console.log(fellowshipUserInstance);
			console.log(fellowshipUserInstance.fellowshipId);
			var notification = new Notification({
				recipient : userId,
				url : '/fellowship/' + fellowshipId,
				message : 'You have been assigned as sub admin for ' + fellowshipUserInstance.fellowshipId.name
			});
			notification.save(function(err) {
				if (err)
					callback(err);
				callback();
			});
		}
	], function(err){
		if(err) return res.json(err);
		return res.json({status:"success"});
	});
};

//Delete - Round 1
// exports.removeUserFromFellowship = function(req, res) {
	// // fellowship from Fellowship & FellowUser Models
	// FellowshipUser.findOne({
		// userId : req.params.user_id,
		// fellowshipId : req.params.fellowship_id,
		// status : 'approved'
	// }, function(err, fellowshipUser) {
		// if (err)
			// return res.json(err);
		// if (commFunc.isFellowshipMember(req.user, req.params.fellowship_id) || req.user._id === req.params.user_id) {
			// // send out email to notify user about delection.
			// FellowshipUser.remove({
				// fellowshipId : req.params.fellowship_id,
				// userId : req.params.user_id
			// }, function(err) {
				// if (err)
					// return res.json(err);
				// //remove this fellowship from all membership.
				// Membership.update({
					// userId : req.params.user_id,
					// 'fellowships.fellowshipId' : req.params.fellowship_id
				// }, {
					// $pull : {
						// fellowships : {
							// fellowshipId : req.params.fellowship_id
						// }
					// }
				// }, function(err) {
					// if (err)
						// return res.json(err);
					// return res.json({
						// status : "successfully removed from FellowshipUser"
					// });
				// });
			// });
		// } else {
			// return res.json({
				// status : "success",
				// message : "you are not allowed to remove this user from fellowship."
			// });
		// }
	// });
// };
