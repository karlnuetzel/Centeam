let express = require("express");
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let vision = require('@google-cloud/vision')({
    projectId: 'picture-perfect-162617',
    keyFilename: 'picture perfect-571e4afd6e07.json'
});
let fs = require('fs');
let q = require('q');
mongoose.Promise = q.Promise;

let mongoDB = 'mongodb://127.0.0.1:27017/local';
mongoose.connect(mongoDB);
let collectionName = "perfectpictures";
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Schema = mongoose.Schema;
let schema = new Schema({
    gameID: String,
    roundID: String,
    playerID: String,
    imageID: String,
    imageData: String,
    tagsArray: [],
    confidenceArray: [],
    colorsArray: []
});

let model = mongoose.model("schema", schema, collectionName);

let app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.set('port', process.env.PORT || 3000);

let gameStarted;
let gameSize;
let usersJudged = 0;
let players = [];
let round;
let gameID;
let password;
let roundFinished = false;
let totalScore = [];
let judgeID;
let results = [];

app.post('/initializeGame', function (req, res) {
    console.log("POST /initializeGame received.");

    gameStarted = true;
    gameSize = 1;
    gameID = new Date().getTime();
    usersJudged = 0;
    let data = req.body;
    password = data.password;
    gameID = data.gameID;
    players.push(data.username);
    round = 1;
    judgeID = 0;

    res.send({});
});

app.post('/join', function (req, res) {
    console.log("POST /join received.");

    let data = req.body;
    if (data.gameID == gameID && data.password == password) {
        if (players.length < 4) {
            players.push(data.username);
            totalScore.push(0);
            res.json({status: "success", message: ""});
        } else {
            res.json({status: "failure", message: "Too many players. Try next game!"});
        }
    } else {
        if (players.length == 0) {
            res.json({status: "failure", message: "No players in this game. Try starting your own!"});
        }
        res.send({status: "failure", message: "Incorrect credentials."});
    }

});

app.post('/newRound', function (req, res) {
    console.log("POST /newRound received.");

    // if (unassigned) {
    round++;

    results.forEach((result) => {
        if (result.placement == 0) {
            judgeID = result.playerID;
        }
    });
    // }
});

app.post('/uploadPicture', function (req, res) {
    console.log("POST /uploadPicture received.");
    if (gameStarted) {
        let base64Data = req.body.imageData.replace(/^data:image\/jpeg;base64,/, "");
        let filename = "out.png";
        fs.writeFile("out.png", base64Data, 'base64', function (err) {
        });

        let tags = [];
        let confidence = [];
        let colors = [];
        vision.detectLabels(filename)
            .then((results) => {
                const labels = results[0];
                var count = 0;
                labels.forEach((label) => {
                    tags.push(label);
                    confidence.push(results[1].responses[0].labelAnnotations[count++].score);
                });
                console.log(tags);
                console.log(confidence);
                vision.detectProperties(filename)
                    .then((results) => {
                        const properties = results[0];

                        console.log('Colors:');
                        properties.colors.forEach((color) => {

                            colors.push(color);

                        });
                        console.log(colors);

                        let modelInstance = new model({
                            gameID: req.body.gameID,
                            roundID: req.body.roundID,
                            playerID: req.body.playerID,
                            imageID: req.body.imageID,
                            imageData: req.body.imageData,
                            tagsArray: tags,
                            confidenceArray: confidence,
                            colorsArray: colors
                        });

                        modelInstance.save(function (err) {
                            if (err) {
                                console.log(err);
                            }

                            usersJudged++;
                            if (usersJudged == gameSize) {
                                roundFinished = true;
                                calculateResults();
                            }

                            res.send("Image with id \"" + req.body.imageID + "\" from user with id \"" + req.body.playerID + "\" saved to Mongo.");
                            console.log("/uploadPicture complete.");

                            let fs = require('fs');
                            fs.unlinkSync(filename);
                        });
                    });
            });
    } else {
        console.error("{ERROR} - Attempted to upload a picture to a game which has not started!");
    }
});

function calculateResults() {
    model.find({round: round, gameID: gameID, playerID: judgeID}, function (item) {
        var judgesTags = item.tagsArray;

        model.find({round: round, gameID: gameID}, function (items) {
            items.forEach(function (item) {
                if (item.playerID !== judgeID) {
                    var result = {
                        playerID: "",
                        username: "",
                        round: round,
                        score: 0,
                        matches: 0,
                        totalScore: totalScore[item.playerID],
                        placement: ""
                    };

                    judgesTags.forEach(function (judgeTag) {
                        item.tagsArray.forEach(function (playerTag, i) {
                            if (playerTag == judgeTag) {
                                result.matches += item.confidenceArray[i];
                            }
                        });
                    });

                    result.score = result.matches * 25;
                    result.totalScore += result.score;
                } else {
                    var result = {
                        playerID: "",
                        username: "",
                        round: round,
                        score: 0,
                        matches: 0,
                        totalScore: totalScore[item.playerID],
                        placement: -1
                    }
                }

                result.playerID = item.playerID;
                result.username = players[item.playerID];

                results.push(result);
            });

            var swapped = true;
            while (swapped) {
                swapped = false;
                for (let i = 1; i < results.length; i++) {
                    if (results[i].score < results[i - 1].score) {
                        var tmp = results[i];
                        results[i] = results[i - 1];
                        results[i - 1] = tmp;
                        swapped = true;
                    }
                }
            }

            results.forEach((result, i) => {
                result.placement = i;
            });
        });
    });
}

app.get('/results', function (req, res) {
    console.log("GET /results received.");

    if (gameStarted) {
        if (roundFinished) {
            res.json({results: results});
        } else {
            res.json({results: []});
        }
    } else {
        console.error("{ERROR} - Attempted to determine the winner of a game which has not started!");
        res.status(500).send();
    }
});

app.listen(app.get('port'));
console.log("Listening on port " + app.get('port') + "...");

module.exports = app;