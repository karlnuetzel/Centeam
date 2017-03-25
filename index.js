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

app.set('port', process.env.PORT || 3000);

var theImage = null;

app.get('/', function (req, res) {
    console.log('GET received');

    res.send(theImage)
});

app.post('/upload', function (req, res) {
    console.log("POST received");
    console.log("---Request Body: '" + JSON.stringify(req.body) + "'");

    res.send(JSON.stringify(req.body));
});

app.listen(app.get('port'));

module.exports = app;