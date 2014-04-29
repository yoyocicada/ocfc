//Bring in express module to start creating express app
var express=require('express');
//Set environment mode
var env=process.env.NODE_ENV=process.env.NODE_ENV || 'development';
//Create actual express app
var app=express();
var config=require('./server/config/config')[env];

require('./server/config/express')(app,config);
require('./server/config/mongoose')(config);
require('./server/config/passport')();
require('./server/config/routes')(app);

app.listen(config.port);
console.log('Listening on port' + config.port +'...');


