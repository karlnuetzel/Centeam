var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

var mongoDB = 'mongodb://127.0.0.1:27017/local';
mongoose.connect(mongoDB);
var collectionName = "perfectpicture";
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var schema = new mongoose.Schema({
    isJudge: Boolean,
    sourceId: String,
    imageId: String,
    imageData: String
});
var model = mongoose.model(collectionName, schema);

var app = express();

app.post('/uploadPicture', function (req, res) {
    console.log("POST /uploadPicture received.");

    console.log("REQ BODY: " + req.body);

    var modelInstance = new model({
        isJudge: req.body.isJudge,
        sourceId: req.body.sourceId,
        imageId: req.body.imageId,
        imageData: req.body.imageData
    });

    modelInstance.save(function (err) {
        if (err) {
            return handleError(err);
        }
    });

    res.send("Image with id \"" + req.body.imageId + "\" from user with id \"" + req.body.sourceId + "\" saved to Mongo.");
});

app.post('/callGoogle', function (req, res) {
    console.log("POST /callGoogle received.");

    var where = {'imageId': req.body.imageId};
    model.findOne(where, function (err, ret) {
        if (err) {
            return handleError(err);
        } else {
            if (ret !== null) {
                //ret contains the details of the image we want to send to google.
            } else {
                console.log("No image associated with imageId \"" + req.body.imageId + "\", could not send any image to Google API.");
            }
        }
    });
});

app.use(bodyParser.json({limit: '50mb'}));
app.set('port', process.env.PORT || 3000);
app.listen(app.get('port'));
console.log("Listening on port " + app.get('port') + "...");

module.exports = app;