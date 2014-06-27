/*************************************************************************************
 This file creates a new Directive called ProfileCtrl
 which injects $scope, AuthSvc.js,IdentitySvc.js,NotifierSvc.js

 Includes 4 fields: email, fname, lname and password (optional)

 Script will update email, fname & lname, if password is entered then save the new info.

 Calls AuthSvc.updateCurrentUser with the new data stored in object, newUserData.
 ***************************************************************************************/

//6.22.2014, create directive for profile-form
angular.module('app').directive('ocfcProfileForm',function(){
	return{
		restrict:'E',
		templateUrl:'/partials/account/ocfc-profile-form',
		controller: function($scope, AuthSvc,IdentitySvc,NotifierSvc){
			$scope.email=IdentitySvc.currentUser.userName;
			$scope.fname=IdentitySvc.currentUser.firstName;
			$scope.lname=IdentitySvc.currentUser.lastName;

			$scope.update=function(){
				var newUserData={
					userName: $scope.email,
					firstName: $scope.fname,
					lastName: $scope.lname
				}
				if($scope.password && $scope.password.length>0){
					newUserData.password=$scope.password;
				}

				AuthSvc.updateCurrentUser(newUserData).then(function(){
						NotifierSvc.notify('Your user account has been updated');}
					,function(reason){
						NotifierSvc.error(reason);
					});
			};
		}
	};
});