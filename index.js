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
    tagsArray: []
});
var model = mongoose.model(collectionName, schema);

var app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.set('port', process.env.PORT || 3000);

app.post('/uploadPicture', function (req, res) {
    console.log("POST /uploadPicture received.");

    var base64Data = req.body.imageData.replace(/^data:image\/jpeg;base64,/, "");

    require("fs").writeFile("out.png", base64Data, 'base64', function (err) {
        //console.log(err);
    });

    var tags = [];
    vision.detectLabels("out.png")
        .then((results) => {
            const labels = results[0];
            labels.forEach((label) => {

                tags.push(label);

            });
            var modelInstance = new model({
                isJudge: req.body.isJudge,
                sourceId: req.body.sourceId,
                imageId: req.body.imageId,
                imageData: req.body.imageData,
                tagsArray: tags
            });

            modelInstance.save(function (err) {
                if (err) {
                    return handleError(err);
                }
            });
            res.send("Image with id \"" + req.body.imageId + "\" from user with id \"" + req.body.sourceId + "\" saved to Mongo.");
        });
    //
});

app.listen(app.get('port'));
console.log("Listening on port " + app.get('port') + "...");

module.exports = app;