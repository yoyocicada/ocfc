/*******************************************************************************
 * Routes are required to connect to the server
 *
 * Mapping:
 *
 * GET -> $HTTP GET QUERY -> $HTTP GET UPDATE -> $HTTP PUT (REQ BODY permitted)
 * REMOVE -> $HTTP DELETE ADD -> $HTTP POST (REQ BODY permitted)
 ******************************************************************************/

var albums = require('../controllers/albums'),
	calendars = require('../controllers/calendars'),
	churches = require('../controllers/churches');
	events = require('../controllers/events'),
	fellowships = require('../controllers/fellowships'),
	files = require('../controllers/files'),
	folders = require('../controllers/folders'),
	images = require('../controllers/images'),
	inits = require('../controllers/inits'),
	inviteOtherToFellowship = require('../controllers/inviteOtherToFellowship'),
	posts = require('../controllers/posts'),
	stats = require('../controllers/stats'),
	users = require('../controllers/users'),
	notifications=require('../controllers/notifications'),

	/*--Others--*/
	auth = require('./auth'),
	//eventsOld = require('../controllers/events-old'),
	cloudinary = require('cloudinary');

module.exports = function (app, io) {
	/* ------ Socket IO setup -------- */
	var ioSocket;
	var groupRooms = [];
	io.on('connection', function (socket) {
		ioSocket = socket;
		//ioSocket.emit('testSocket', {result: "Socket test complete"});
		ioSocket.join('123');
		//ioSocket.broadcast.to('123').emit("newpost", {success:true});
		io.sockets.to('123').emit("newpost", {success:true});
	});

	/* ------ Standard User related API -------- */
	app.post('/api/users', users.createUser);
	app.put('/api/users', users.updateUser);
	app.get('/api/users/:id', users.getUserById);
	app.delete('/api/users', users.deleteUser);
	app.get('/api/activate',users.activateUser);

	/*one off API calls*/
	app.get('/api/users/:id/reset_password', users.resetPassword);
	app.put('/api/eventParticipation/:event_id', users.updateEventParticipation);
	app.get('/api/getActivation',users.getActivation);
	app.put('/api/updatePassword',users.updateUserPassword);
	app.delete('/api/activate',users.deleteUserFromActivation);
	app.put('/api/users/update_profile_image', users.updateProfileImage);

	/* ------ Fellowship related API -------- */
	app.post('/api/fellowships', fellowships.createFellowship);
	app.put('/api/fellowships/:id', fellowships.updateFellowshipById);
	app.put('/api/fellowships/:id/approve', fellowships.approveFellowshipById);
	app.get('/api/fellowships/:id', fellowships.getFellowshipById);
	app.delete('/api/fellowships/:id', fellowships.deleteFellowshipById);
	app.get('/api/fellowships', fellowships.queryFellowships);

	app.post('/api/fellowships/:fellowship_id/users/:user_id', fellowships.addUserToFellowship);
	app.get('/api/fellowships/:fellowship_id/users', fellowships.getUsersFromFellowship);
	app.put('/api/fellowships/:fellowship_id/users/:user_id', fellowships.updateUserToFellowship);
	//TODO add approveUserToFellowship
	app.put('/api/fellowships/:fellowship_id/users/:user_id/approveUserToFellowship', fellowships.approveUserToFellowship);
	app.put('/api/fellowships/:fellowship_id/users/:user_id/denyUserToFellowship', fellowships.denyUserToFellowship);
	app.put('/api/fellowships/:fellowship_id/users/:user_id/removeUserFromFellowship', fellowships.removeUserFromFellowship);
	app.put('/api/fellowships/:fellowship_id/users/:user_id/makeSubAdmin', fellowships.makeSubAdmin);
	app.put('/api/fellowships/:fellowship_id/users/:user_id/removeSubAdmin', fellowships.removeSubAdmin);
	app.delete('/api/fellowships/:fellowship_id/users/:user_id', fellowships.removeUserFromFellowship);
	app.get('/api/removemember',fellowships.removemember);

	/* ------ Invite Other To Fellowships related API -------- */
	app.post('/api/inviteOtherToFellowships/batch', inviteOtherToFellowship.createInvites);
	app.get('/api/inviteOtherToFellowships', inviteOtherToFellowship.queryInvites);
	app.get('/api/inviteOtherToFellowships/:id', inviteOtherToFellowship.getInvite);
	app.get('/api/inviteOtherToFellowships/:id/inviteAgain', inviteOtherToFellowship.inviteAgain);
	app.delete('/api/inviteOtherToFellowships/:id', inviteOtherToFellowship.deleteInvite);

	/* ------ Church related API -------- */
	app.post('/api/churches', churches.createChurch);
	app.put('/api/churches/:id', churches.updateChurchById);
	app.put('/api/churches/:id/approve', churches.approveChurchById);
	app.get('/api/churches/:id', churches.getChurchById);
	app.get('/api/churches', churches.queryChurches);
	app.delete('/api/churches/:id', churches.deleteChurchById);

	app.post('/api/churches/:church_id/fellowships/:fellowship_id', churches.addFellowshipToChurch );
	app.put('/api/churches/:church_id/fellowships/:fellowship_id', churches.updateFellowshipToChurch);
	app.put('/api/churches/:church_id/fellowships/:fellowship_id/approve', churches.approveFellowshipToChurch);
	app.put('/api/churches/:church_id/fellowships/:fellowship_id/reject', churches.rejectFellowshipToChurch);
	app.get('/api/churches/:church_id/fellowships', churches.getFellowships);
	app.delete('/api/churches/:church_id/fellowships/:fellowship_id', churches.removeFellowshipFromChurch);

	app.post('/api/churches/:church_id/users/:user_id', churches.addUserToChurch);
	app.put('/api/churches/:church_id/users/:user_id', churches.updateUserToChurch);
	//TODO add approveUserToChurch
	app.put('/api/churches/:church_id/users/:user_id/approve', churches.approveUserToChurch);
	app.get('/api/churches/:church_id/users', churches.getUsers);
	app.delete('/api/churches/:church_id/users/:user_id', churches.removeUserFromChurch);

	/* ------ Post related API -------- */
	app.post('/api/posts', posts.createPost, function(req,res){
		console.log("socket io connection channel");
		console.log(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId);
		io.sockets.emit(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId, {type:"newPost", post:res.$_emitPost});
		return res.send(res.$_emitPost);
	});
	app.get('/api/posts/:id', posts.getPost);
	app.get('/api/posts', posts.queryPost);
	app.put('/api/posts/:id', posts.updatePost, function(req,res){
		console.log("socket io connection channel");
		console.log(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId);
		io.sockets.emit(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId, {type:"updatePost", post:res.$_emitPost});
		return res.send(res.$_emitPost);
	});
	app.delete('/api/posts/:id', posts.removePost, function(req,res){
		console.log("socket io connection channel");
		console.log(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId);
		io.sockets.emit(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId, {type:"removePost", postId:res.$_emitPost._id});
		return res.json({status: res.$_emitPost._id + "removed successfully."});
	});

	app.post('/api/posts/:post_id/comments', posts.addCommentToPost,function(req,res){
		console.log("socket io connection channel");
		console.log(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId);
		io.sockets.emit(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId, {type:"newComment", postId:res.$_emitPost._id, comment:res.$_emitComment});
		return res.send(res.$_emitComment);
	});
	app.put('/api/posts/:post_id/comments/:comment_id', posts.updateCommentFromPost);
	app.delete('/api/posts/:post_id/comments/:comment_id', posts.deleteCommentFromPost, function(req,res){
		console.log("remove comment from post");
		console.log(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId);
		io.sockets.emit(res.$_emitPost.postUnderGroupType + res.$_emitPost.postUnderGroupId, {type:"removeComment", postId:res.$_emitPost._id, commentId:res.$_emitComment._id});
		return res.send(res.$_emitComment);
	});

	/* ------ Calendar related API -------- */
	app.post('/api/calendars', calendars.createCalendar);
	app.get('/api/calendars/:id', calendars.getCalendar);
	app.get('/api/calendars', calendars.queryCalendars);
	app.put('/api/calendars/:id', calendars.updateCalendar);
	app.delete('/api/calendars/:id', calendars.deleteCalendar);

	app.post('/api/calendars/:calendar_id/events', calendars.createEventToCalendar);
	app.get('/api/calendars/:calendar_id/events', calendars.queryEventsFromCalendar);

	app.get('/api/events/:event_id', events.getEvent);
	app.put('/api/events/:event_id', events.updateEvent);
	app.delete('/api/events/:event_id', events.deleteEvent);

	app.post('/api/events/:event_id/comments', events.addCommentToEvent);
	app.put('/api/events/:event_id/comments/:comment_id', events.updateCommentFromEvent);
	app.delete('/api/events/:event_id/comments/:comment_id', events.deleteCommentFromEvent);
	//add invitee crud functions.


	/* ------ Album related API -------- */
	app.post('/api/albums', albums.createAlbum);
	app.get('/api/albums/:id', albums.getAlbum);
	app.get('/api/albums', albums.queryAlbum);
	app.put('/api/albums/:id', albums.updateAlbum);
	app.delete('/api/albums/:id', albums.deleteAlbum);

	app.post('/api/albums/:album_id/images', albums.createImage);
	app.get('/api/albums/:album_id/images', albums.queryImages);
	app.get('/api/albums/:album_id/images/:image_id', images.getImage);
	app.put('/api/albums/:album_id/images/:image_id', images.updateImage);
	app.delete('/api/albums/:album_id/images/:image_id', images.deleteImage);

	app.post('/api/images/:image_id/comments', images.addCommentToImage);
	app.put('/api/images/:image_id/comments/:comment_id', images.updateCommentFromImage);
	app.delete('/api/images/:image_id/comments/:comment_id', images.deleteCommentFromImage);

	/* ------ Folder related API -------- */
	app.post('/api/folders', folders.createFolder);
	app.get('/api/folders/:id', folders.getFolder);
	app.get('/api/folders', folders.queryFolders);
	app.put('/api/folders/:id', folders.updateFolder);
	app.delete('/api/folders/:id', folders.deleteFolder);

	app.post('/api/folders/:folder_id/files', folders.createFile);
	app.get('/api/folders/:folder_id', folders.queryFiles);
	app.get('/api/files/:file_id', files.getFile);
	app.put('/api/files/:file_id', files.updateFile);
	app.delete('/api/files/:file_id', files.deleteFile);

	app.post('/api/files/:file_id/comments', files.addCommentToFile);
	app.put('/api/files/:file_id/comments/:comment_id', files.updateCommentFromFile);
	app.delete('/api/files/:file_id/comments/:comment_id', files.deleteCommentFromFile);

	/*Notfication*/
	app.get('/api/notification', notifications.queryNotification);

	/*------Init, Stat----- */
	app.get('/api/inits',inits.getInit);
	/* ------ Traffic data API -------- */
	app.get('/api/stats',stats.getStats);

	/*------Cloudinary Image Signing------ */
	app.get('/cloudinarySigned', function(req, res){
		if (req.query.type==="avatar"){
			configurationObj={
			timestamp: cloudinary.utils.timestamp(),
			transformation: "c_limit,h_168,w_168",
			format: "jpg",
			public_id:req.user._id+'avatar'
			};
		}else if(req.query.type==="fullSizeImg") {
			configurationObj = {
				timestamp: cloudinary.utils.timestamp(),
				transformation: "c_limit,h_435,w_465",
				format: "jpg"
			};
		}
		var params = cloudinary.utils.sign_request(configurationObj,
			{
				api_key: "399137143626587",
				api_secret: "royt6Nw2fVrbRtdwT_mjmDP7CkE"
			});
		res.json(params);
	});

	// -----------------------------------------------------------------------------
/*
 * LEGACY CODE //4.29.2014, retrieve data from fellows controller
 * app.get('/api/fellows',fellows.getFellows);
 * app.get('/api/fellows/:id',fellows.getFellow); //5.14.2015, create new
 * fellowship by Admin app.post('/api/fellows',fellows.createFellow);
 * app.put('/api/fellows/:id',fellows.updateFellow);
 *
 * //4.30.2014 equalvilant to add, create route for handling user joining
 * fellowship app.post('/api/fellowUsers',fellowUsers.createFellowUser);
 *
 * app.get('/api/fellowUsers',fellowUsers.queryFellowUser);
 * app.get('/api/fellowUsers/:id',fellowUsers.getFellowUser);
 * app.delete('/api/fellowUsers/:id',fellowUsers.removeFellowUser);
 *
 * //equalvilant to update
 * app.put('/api/fellowUsers/:id',fellowUsers.updateFellowUser);
 *
 * //5.24.2014 create post api app.post('/api/posts',posts.createPost,
 * function(req, res, next){ io.sockets.emit('routesSocket',res.$_emitBody);
 * res.send(res.$_emitBody); }); app.get('/api/posts',posts.queryPost);
 *
 * app.get('/api/init',init.getInit);
 */
	// Define a new route for Jade
	app.get('/partials/*', function(req, res){
		res.render('../../public/app/'+req.params);
	});

	// middleware will authenticate user
	app.post('/signup',users.signup);

	app.post('/login',auth.authenticate);

	app.post('/logout',function(req,res){
		req.logout();
		res.end();
	});

	app.all('/api/',function(req,res){
		res.send(404);
	});

	app.get('*',function(req,res){
		res.render('index',{
			bootstrappedUser: req.user
		});
	});
};
