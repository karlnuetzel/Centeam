var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var vision = require('@google-cloud/vision')({
    projectId: 'picture-perfect-162617',
    keyFilename: 'picture perfect-571e4afd6e07.json'
});
var fs = require('fs');
var q = require('q');
mongoose.Promise = q;

var mongoDB = 'mongodb://127.0.0.1:27017/local';
mongoose.connect(mongoDB);
var collectionName = "perfectpicture";
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var schema = new mongoose.Schema({
    gameId: String,
    isJudge: Boolean,
    playerId: String,
    imageId: String,
    imageData: String,
    matches: Number,
    tagsArray: [],
    colorsArray: []
});

var model = mongoose.model(collectionName, schema);

var app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.set('port', process.env.PORT || 3000);

var gameStarted = true;
var gameSize;
var usersJudged = 0;
var players;
var round;
var gameId;
var password;

app.post('/initializeGame', function (req, red) {
    console.log("POST /initializeGame received.");

    gameSize = req.body.gameSize;
    round = 1;

    gameStarted = true;
});

app.post('/join', function (req, res) {
    let data = req.body;
    if (data.gameId == gameId && data.password == password){
        if (players.length < 4){
            players.push(data.username);
            res.status(200).send();
        } else {
            res.status(400).send("Too many players. Try next game!");
        }
    } else {
        res.status(400).send("Incorrect credentials.")
    }

});

app.post('/uploadPicture', function (req, res) {
    if (gameStarted) {
        console.log("POST /uploadPicture received.");
        usersJudged++;

        var base64Data = req.body.imageData.replace(/^data:image\/jpeg;base64,/, "");

        var filename = "out.png";

        fs.writeFile("out.png", base64Data, 'base64', function (err) {
        });

        var tags = [];
        var colors = [];
        vision.detectLabels(filename)
            .then((results) => {
                const labels = results[0];
                labels.forEach((label) => {

                    tags.push(label);

                });
                console.log(tags);
                vision.detectProperties(filename)
                    .then((results) => {
                        const properties = results[0];

                        console.log('Colors:');
                        properties.colors.forEach((color) => {

                            colors.push(color);

                        });
                        console.log(colors);
                        var modelInstance = new model({
                            isJudge: req.body.isJudge,
                            playerId: req.body.sourceId,
                            imageId: req.body.imageId,
                            imageData: req.body.imageData,
                            matches: Number,
                            tagsArray: tags,
                            colorsArray: colors
                        });

                        modelInstance.save(function (err) {
                            if (err) {
                                return handleError(err);
                            }
                        });

                        fs.unlinkSync(filename);
                        res.status(200).send("Image with id \"" + req.body.imageId + "\" from user with id \"" + req.body.sourceId + "\" saved to Mongo.");
                        console.log("/uploadPicture complete.");
                        if (gameSize == usersJudged){

                            determineWinner();

                        }
                    });
                //
            });
        //
    } else {
        console.error("{ERROR} - Attempted to upload a picture to a game which has not started!");
    }
});

function determineWinner() {

}

app.post('/determineWinner', function (req, res) {
    if (gameStarted) {
        for (var i = 0; i < gameSize; i++) {

        }
    } else {
        console.error("{ERROR} - Attempted to determine the winner of a game which has not started!");
    }
});

function compareUsers(imgTags1, imgTags2) {

    var amountOfMatches = 0;
    imgTags1.forEach((imgTag1) => {

        imgTags2.forEach((imgTag2) => {

            if (imgTag1 == imgTag2) {

                amountOfMatches++;

            }

        });
    });
}

app.listen(app.get('port'));
console.log("Listening on port " + app.get('port') + "...");

module.exports = app;