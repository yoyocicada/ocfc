/*******************************************************************************
 * This file creates a new Controller called FellowMemSvc creates a resource
 * called fellowMemResource fellowMemResource: Takes rest /api/fellowMems/:id
 * using GET method to grab records for specific user
 ******************************************************************************/

// factory, is a singleton, that contains data or function that can be used
// across controllers
angular.module('app').service('FellowshipDataSvc', function(FellowshipUserSvc) {
	// rest api standard, for GET, if id is specified, it will grab specific
	// user by id
	this.users=[];
	var that=this;
	this.initialize=function(fellowId){
		console.log("this.initialize");
		console.log(fellowId);
		that.users = FellowshipUserSvc.getAllMembers(
			{
				fellowship_id:fellowId
			}
			, function () {
				console.log('chk this.users');
				console.log(that.users);
			}
		);

	};
	this.get = function() {

	};
	this.query = function(){

	};
	this.create = function(){

	};
	this.update = function(){

	};

	this.delete = function(){

	};

});