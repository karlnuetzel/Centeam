var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

var mongoDB = 'mongodb://127.0.0.1:27017/local';
mongoose.connect(mongoDB);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


//Define a schema
var Schema = mongoose.Schema;

var SomeModelSchema = new Schema({
    picString : String,
    gameID : String
});

var SomeModel = mongoose.model('SomeModel', SomeModelSchema );

var awesome_instance = new SomeModel({ gameID : 'fjk3l2rl'});

awesome_instance.save(function(err){
    if (err) return handleError(err);
});

// mongoose.connect("mongodb://127.0.0.1:27017/local");

// var db = mongoose.connection;

var app = express();
app.use(bodyParser.json({ type: 'application/json' }));



// var photoRouter = express.Router();
// photoRouter.get("/", function(req, res) { });
// photoRouter.post("/", postPhoto, function(req, res) { });
// photoRouter.get("/:id", lookupPhoto, function(req, res) {
//     res.json(req.photo);
// });
// photoRouter.patch("/:id", lookupPhoto, function(req, res) { });
// photoRouter.delete("/:id", lookupPhoto, function(req, res) { });
// app.use("/photo", photoRouter);
//

// function lookupPhoto(req, res, next) {
//
// }
//
// function postPhoto(req, res, next){
//     //analyze photo with google API
//     //save photo and analysis data in Mongo.
//     //call function to send photo to other users
//     //
// }

module.exports = app;