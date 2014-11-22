/*************************************************************************************
 4.29.2014, create getFellowByZip object that grabs data from mongodb by zipcode
 ***************************************************************************************/

var Fellowship = require('mongoose').model('Fellowship'),
	FellowshipUser = require('mongoose').model('FellowshipUser'),
	commFunc = require('../utilities/commonFunctions'),
	deleteKey = require('key-del'),
	_=require('lodash');//Library for Array

var toLowerCase=function(obj){
	for (var i in obj) {
		if (i!=="albumIds" || i!=="fileIds" || i!=="calendarIds"){
			console.log(obj[i]);
			obj[i] = obj[i].toLowerCase();
		}
	}
	return obj;
};

//Post
exports.createFellowship=function (req, res) {
	var fellowship = req.body;
//	fellowship.startDate=new Date();

	//TODO, prevent duplicate fellowship
	//compared by name, address, if there's associated church,
	//admin cannot create duplicate fellowships

	var fellowship = new Fellowship(fellowship);
	fellowship.save(function (err) {
		if (err) {
			err = commFunc.handleError(err);
			return res.json(err);
		}
		var fellowshipUser = new FellowshipUser();
		fellowshipUser.userId = req.user._id;
		fellowshipUser.fellowshipId = fellowship._id;
		fellowshipUser.status = 'pending';
		fellowshipUser.role = 'admin';
//		fellowshipUser.signupDate = new Date();
//		fellowshipUser.updateDate = new Date();
		fellowshipUser.save(function(err){
			if (err) {
				err = commFunc.handleError(err);
				return res.json(err);
			}
			return res.json({status:"success",fellowship:fellowship});
		});
	})
};

//Put
exports.updateFellowshipById=function (req, res) {
	FellowshipUser.count({userId: req.user._id, fellowshipId:req.params.id, role:'admin',status:'approved'},function (err, count) {
		if (err) {
			err = commFunc.handleError(err);
			return res.json(err);
		}
		if (count>0){
			var fellowship=req.body;
			fellowship = toLowerCase(fellowship);
			fellowship = deleteKey(fellowship, ['calendarIds', 'fileIds','albumIds']);

			var keys = _.keys(fellowship);
			if(keys.length==1 && keys[0]=='_id'){
				return res.json({});
			}
			Fellowship.update({ _id: req.params.id}, fellowship, { multi: true }, function (err, numberAffected, raw) {
				if (err) {
					err = commFunc.handleError(err);
					return res.json(err);
				}
				return res.json({status:"success",raw:raw});
			});
		};
	});
};

//Get
exports.getFellowshipById=function (req, res) {
	//chk if entry exist match by fellowshipId & status of approved
	FellowshipUser.count({ fellowshipId: req.params.id,userId: req.user._id,status: 'approved'}, function(err, count){
		console.log('count');
		console.log(count);

		if (count==1){
			Fellowship.findOne({_id: req.params.id}).exec(function (err, fellowship) {
				if (err) {
					err = commFunc.handleError(err);
					return res.json(err);
				}
				return res.json({status:"success",fellowship:fellowship});
			});

		}else{
			Fellowship.findOne({_id: req.params.id},'-albumIds -fileIds -calendarIds').exec(function (err, fellowship) {
				if (err) {
					err = commFunc.handleError(err);
					return res.json(err);
				}
				return res.json({status:"success",fellowship:fellowship});
			});

		};
	});

};

//Delete
exports.deleteFellowshipById=function (req, res) {
	// Session user must be an admin in order to delete
	// fellowship from Fellowship & FellowUser Models
	FellowshipUser.count({userId:req.user._id,fellowshipId: req.params.id,status:'approved',role:'admin'},function (err, count) {
		if (err) {
			err = commFunc.handleError(err);
			return res.json(err);
		}
		if (count>0){
			FellowshipUser.remove({fellowshipId:req.params.id}, function (err) {
				if (err) {
					err = commFunc.handleError(err);
					return res.json(err);
				}
				Fellowship.remove({_id:req.params.id}, function (err) {
					if (err) {
						err = commFunc.handleError(err);
						return res.json(err);
					}
					return res.json({status:"successfully removed from Fellowship & FellowshipUser"});
				});
			});
		};
	});
};

//Post
exports.addUserToFellowship=function (req, res) {
	//Populate data onto FellowshipUsers tbl
	console.log('chk req.user obj');
	console.log(req.user);

	Fellowship.count({ _id: req.params.fellowship_id}, function(err, count){
		console.log('count');
		console.log(count);

		if (count==1){
			var fellowshipUser = req.body;
			fellowshipUser.userId=req.user._id;
			fellowshipUser.fellowshipId=req.params.fellowship_id;
//			fellowshipUser.signupDate=new Date();
			fellowshipUser.status="Pending";
			fellowshipUser.role="Admin";
//			fellowshipUser.updateDate=new Date();

			console.log('chk fellowUser variable');
			console.log(fellowshipUser);

			fellowshipUser = new FellowshipUser(fellowshipUser);
			fellowshipUser.save(function (err) {
				if (err) {
					err = commFunc.handleError(err);
					return res.json(err);
				}
				return res.json({status:"success",fellowshipUser:fellowshipUser});
			})
		}
	});
};

//Get
exports.getUsersFromFellowship=function (req, res) {
	//Populate users associated to a fellowship
	//Search FellowUser model by fellowshipId against param id,
	// then populate user table
	FellowshipUser.find({fellowshipId:req.params.fellowship_id}).populate("userId").exec(function (err, fellowshipUser) {
		if (err) {
			err = commFunc.handleError(err);
			return res.json(err);
		}
		return res.json({status:"success",fellowshipUsers:_.pluck(fellowshipUser, 'userId')});
	});
};

//Put
exports.updateUserToFellowship=function (req, res) {
	//Only admin privilege allowed to update from fellowshipUser tbl
	FellowshipUser.count({userId: req.user._id, fellowshipId:req.params.fellowship_id, role:'admin',status:'approved'},function (err, count) {
		if (err) {
			err = commFunc.handleError(err);
			return res.json(err);
		}
		if (count>0){
			var fellowshipUser=req.body;
			fellowshipUser = toLowerCase(fellowshipUser);
//			fellowshipUser.updateDate=new Date();
			fellowshipUser = deleteKey(fellowshipUser, ['userId', 'fellowshipId','signupDate']);

			var keys = _.keys(fellowshipUser);
			if(keys.length==1 && keys[0]=='_id'){
				return res.json({});
			}
			FellowshipUser.update({ userId: req.params.user_id}, fellowshipUser, { multi: true }, function (err, numberAffected, raw) {
				if (err) {
					err = commFunc.handleError(err);
					return res.json(err);
				}
				return res.json({status:"success",raw:raw});
			});
		};
	});
};

//Delete
exports.removeUserFromFellowship=function (req, res) {
	// Session user must be an admin in order to delete
	// fellowship from Fellowship & FellowUser Models
	FellowshipUser.count({userId:req.user._id,fellowshipId: req.params.fellowship_id,status:'approved',role:'admin'},function (err, count) {
		if (err) {
			err = commFunc.handleError(err);
			return res.json(err);
		}
		if (count>0){
			FellowshipUser.remove({fellowshipId:req.params.fellowship_id, userId:req.params.user_id},function (err) {
				if (err) {
					err = commFunc.handleError(err);
					return res.json(err);
				}
				return res.json({status:"successfully removed from FellowshipUser"});
			});
		};
	});
};


/* ------ Invite Other To Fellowships related API -------- */
//TODO
exports.createInvite=function (req, res) {
	//user must belong to that specific fellowship in order to invite

};
//TODO
exports.queryInvites=function (req, res) {
	//query from a particular fellowship
	res.end();
};
//TODO
exports.getInvite=function (req, res) {
	res.end();
};
//TODO
exports.deleteInvite=function (req, res) {
	res.end();
};

//find doc by zipcode from URL within Fellow collection
//exports.getFellows = function (req, res) {
//	if (req.query.zip) {
//		//by zipcode
//		Fellow.find({zipcode: req.query.zip}, null, {}, function (err, fellows) {
//			if (!err) {
////                console.log(fellows);
//				res.send(fellows);
//			} else {
//				res.status(404);
//			}
//		});
//	} else if (req.query.status) {
//		//by all fellowships
//		Fellow.find({status: req.query.status}, null, {}, function (err, fellows) {
//			if (!err) {
////                console.log(fellows);
//				res.send(fellows);
//			} else {
//				res.status(404);
//			}
//		});
//
//	} else {
//		//by all fellowships
//		Fellow.find({}, null, {}, function (err, fellows) {
//			if (!err) {
////                console.log(fellows);
//				res.send(fellows);
//			} else {
//				res.status(404);
//			}
//		});
//
//	}
//
//};

//grab 1 fellowship
//exports.getFellow = function (req, res) {
//	console.log("getFellow");
//	console.log(req.params);
//	Fellow.findOne({_id: req.params.id}).exec(function (err, item) {
//		console.log("try this");
//		console.log(item);
//		res.json(item);
//	});
//};

//exports.createFellow = function (req, res) {
//	var fellowData = req.body;
//	var fellowDoc = {
//		"name": commFunc.toProperCase(fellowData.fellowName),
//		"zipcode": fellowData.zipcode,
//		"status": fellowData.status,
//		"url": fellowData.url,
//		"address": commFunc.toProperCase(fellowData.address),
//		"description": fellowData.description
//	};
//
//	Fellow.create(fellowDoc, function (err, fellow) {
//		if (err) {
//			if (err.toString().indexOf('E11000') > -1) {
//				err = new Error("Duplicate createFellow");
//			}
//			res.status(400);
//			var err_message = err.toString();
//			return res.send({reason: err_message});
//		}
//		res.send({status: "success", fellow: fellow});
//	});
//
//};
//
//exports.updateFellow = function (req, res) {
//	return Fellow.findById(req.params.id, function (err, Fellow) {
//		Fellow.status = req.body.status; //pass client status into Fellow database in the server
//		Fellow.reason = req.body.reason;  //pass client status into Fellow database in the server
//		return Fellow.save(function (err) {
//			if (!err) {
//				console.log("updated");
//			} else {
//				console.log(err);
//			}
//			return res.send(Fellow);
//		});
//	});
//};

