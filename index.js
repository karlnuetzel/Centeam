var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var vision = require('@google-cloud/vision')({
    projectId: 'picture-perfect-162617',
    keyFilename: 'picture perfect-571e4afd6e07.json'
});

var mongoDB = 'mongodb://127.0.0.1:27017/local';
mongoose.connect(mongoDB);
var collectionName = "perfectpicture";
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var schema = new mongoose.Schema({
    isJudge: Boolean,
    sourceId: String,
    imageId: String,
    imageData: String,
    tags: []
});
var model = mongoose.model(collectionName, schema);

var app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.set('port', process.env.PORT || 3000);

app.post('/uploadPicture', function (req, res) {
    console.log("POST /uploadPicture received.");

    var base64Data = req.body.imageData.replace(/^data:image\/jpeg;base64,/, "");

    require("fs").writeFile("out.png", base64Data, 'base64', function(err) {
        //console.log(err);
    });

    vision.detectLabels("out.png")
        .then((results) => {
            const labels = results[0];
            console.log('Labels:');
            labels.forEach((label) => {

                console.log(label);

            });
        });

    var modelInstance = new model({
        isJudge: req.body.isJudge,
        sourceId: req.body.sourceId,
        imageId: req.body.imageId,
        imageData: req.body.imageData,
        tags: req.body.tags
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

app.listen(app.get('port'));
console.log("Listening on port " + app.get('port') + "...");

module.exports = app;