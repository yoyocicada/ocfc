/*******************************************************************************
 * This file creates a new Controller called mvJoinFellowCtrl. The code stores
 * all records into mvJoinFellowCtrl controller. The controller checks zipcode
 * input text of no more than 5 length chars creates a objects called:
 * updateFellowList: once the condition is met, $http directive will retrieve
 * the data from mongodb of fellowships collection associatedFellowships: get or
 * read all the associated fellowships for the current user. selectedFellowship:
 * set as null joinFellowship: add userId and fellowId onto fellowMems
 * collection fellowMemResource: Takes rest /api/fellowMems/:id using GET method
 * to grab records for specific user
 ******************************************************************************/
angular.module('app').controller('mvJoinFellowCtrl', function($scope, $http, mvIdentity, mvFellowMem) {
    // function()() is a self triggered function
    // no calling required

    $scope.associatedFellowships;
    $scope.fellowships;
    $scope.zipcode = '';

    // this function will set the associatedFellowships array,
    // which is the list of fellowships associated with the current user.
    $scope.getAssociatedFellowships = (function() {
        // check if the current user is authenticated
        if (mvIdentity.isAuthenticated() === true) {
            $scope.associatedFellowships = mvFellowMem.query({
                userId: mvIdentity.currentUser._id
            }, function() {
                console.log("the result is here");
                $scope.loadFellows();
            });
        }
    }());

    // this function will update the fellowships array,binded to our view,
    // by checking the zipcode string user typed in.
    $scope.updateFellowListByZip = function() {
        if ($scope.zipcode.length == 5) {
            $scope.loadFellows({
                params: {
                    zip: $scope.zipcode
                }
            });
        }
    };

    // this function will interact with the server to let user join the
    // selectedFellowship.
    $scope.joinFellowship = function(id) {
        var fellowMemData = {
            "userId": mvIdentity.currentUser._id,
            "fellowId": id
        };
        var newFellowMem = new mvFellowMem(fellowMemData);
        newFellowMem.$save().then(function(response) {
            console.log(response);
        });
    };

    // 4.30.2014
    // this function interacts with server to approve the user for the
    // fellowship.
    $scope.approveFellowship = function(id, fellowMemId) {
        var fellowMemData = {
            "userId": mvIdentity.currentUser._id,
            "fellowId": id
        };
        console.log("approveFellowship");
        console.log(fellowMemId);
        // we need to get the fellowMem document that we want to update.
        var fellowMem = mvFellowMem.get({
            _id: fellowMemId
        }, function() {
            fellowMem.status = 'Approved';
            mvFellowMem.update({
                _id: fellowMem._id
            }, fellowMem);
        });
    };

    // this function interact with server to load all the fellowships,
    // and add a status field to each fellowship by checking against the
    // associatedFellowship array.
    $scope.loadFellows = function(params) {
        var params = $.extend({
            url: '/api/fellows',
            method: 'GET'
        }, params);
        $http(params).success(function(data) {
            angular.forEach(data, function(fellowObj, key) {
                var norun = false;
                if ($scope.associatedFellowships.length !== 0) {
                    angular.forEach($scope.associatedFellowships, function(fellowMemObj, key) {
                        if (norun == false) {
                            if (fellowObj._id == fellowMemObj.fellowship) {
                                fellowObj.status = fellowMemObj.status;
                                fellowObj.fellowMemId = fellowMemObj._id;
                                norun = true;
                            } else {
                                fellowObj.status = 'None';
                            }
                        }
                    });
                } else {
                    fellowObj.status = 'None';
                }
            });
            $scope.fellowships = data;
        });
    };
});