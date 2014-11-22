/*************************************************************************************
 11.18.2014 re-create Folder model as per latest requirement
 ***************************************************************************************/

var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var folderSchema = mongoose.Schema({
	name:		{type: String, Required:'(name) is required!', index: true, unique: false,lowercase: true},
	createdOn:	{type: Date, Required:'(createdOn) is required!', index: true, unique: false,lowercase: true},
	fileIds:	[{type: ObjectId, ref:'File', Required:'(fileIds) is required!', index: true, unique: false,lowercase: true}],
	description: {type: String, index: true, unique: false,lowercase: true}
});

var Folder = mongoose.model('Folder', folderSchema);