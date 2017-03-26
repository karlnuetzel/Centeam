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
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

let Schema = mongoose.Schema;

let imageCollectionName = "perfectpictureimages";
let imageSchema = new Schema({
    gameID: String,
    round: String,
    username: String,
    imageID: String,
    imageData: String,
    tagsArray: [],
    colorsArray: []
});
let imageModel = mongoose.model("imageSchema", imageSchema, imageCollectionName);

let gameCollectionName = "perfectpicturegames";
let gameSchema = new Schema({
    status: String,
    gameID: String,
    gamePassword: String,
    round: Number,
    players: [],
    size: Number,
    currentJudge: String,
    usersJudged: Number,
    results: [],
});
let gameModel = mongoose.model("gameSchema", gameSchema, gameCollectionName);

let app = express();
app.use(bodyParser.json({limit: '50mb'}));
app.set('port', process.env.PORT || 3000);

app.post('/initializeGame', function (req, res) {
    console.log("POST /initializeGame received.");

    let data = req.body;

    let gameModelInstance = new gameModel({
        status: "Game Initialized",
        gameID: data.gameID,
        gamePassword: data.password,
        round: 0,
        players: [data.username],
        size: 1,
        currentJudge: data.username,
        usersJudged: 0,
        results: [],
    });

    gameModelInstance.save(function (err) {
        if (err) {
            console.log(err);
        }

        res.send({});
    });
});

app.post('/join', function (req, res) {
    console.log("POST /join received.");

    let data = req.body;

    let where = {
        gameID: data.gameID,
    };
    gameModel.findOne(where, function (err, ret) {
        if (ret != null) {
            if (ret.players.length < 4) {
                let players = ret.players;
                players.push(data.username);

                let size = ret.size;
                size++;

                let updatedGame = {
                    status: "Player \"" + data.username + "\" joining",
                    players: players,
                    size: size,
                };

                gameModel.update(where, updatedGame, {}, function (err, n) {
                    if (err) {
                        console.log(err);
                    }

                    res.json({status: "success", message: ""});
                });
            } else {
                res.json({status: "failure", message: "Too many players. Try next game!"});
            }
        } else {
            res.send({status: "failure", message: "Incorrect credentials."});
        }
    });
});

app.post('/newRound', function (req, res) {
    console.log("POST /newRound received.");

    let where = {
        gameID: data.gameID,
    };
    gameModel.findOne(where, function (err, ret) {
        if (ret.status = "All players ready for new round.") {
            let round = ret.round;
            round++;

            let judge = ret.currentJudge;
            ret.results[ret.round].forEach(function (roundResult) {
                if (roundResult.placement == 0) {
                    judge = roundResult.username;
                }
            });

            let updatedGame = {
                status: "Starting round " + round,
                round: round,
                currentJudge: judge,
                usersJudged: 0
            };

            gameModel.update(where, updatedGame, {}, function (err, n) {
                res.send({status: "success", message: "Next round started."});
            });
        } else {
            res.send({status: "standby", message: "Can't start next round until all users are ready."})
        }
    });
});

app.post('/uploadPicture', function (req, res) {
    console.log("POST /uploadPicture received.");

    let data = req.body;

    let where = {
        gameID: data.gameID,
    };

    console.log(JSON.stringify(data));

    gameModel.findOne(where, function (err, ret) {
        if (err) {
            console.log(err)
        }

        let base64Data = data.imageData.replace(/^data:image\/jpeg;base64,/, "");
        let filename = "out.png";
        fs.writeFile(filename, base64Data, 'base64', function (err) {
            let tags = [];
            let colors = [];

            vision.detectLabels(filename)
                .then((results) => {
                    results[0].forEach((tag, i) => {
                        tags.push({
                            tag: tag,
                            confidence: results[1].responses[0].labelAnnotations[i].score
                        });
                    });
                    console.log("Tags:\n" + JSON.stringify(tags));
                    vision.detectProperties(filename)
                        .then((results) => {
                            results[0].colors.forEach((color) => {
                                colors.push(color);
                            });
                            console.log("Colors:\n" + colors);

                            let imageModelInstance = new imageModel({
                                gameID: data.gameID,
                                round: data.round,
                                username: data.username,
                                imageID: data.imageID,
                                imageData: data.imageData,
                                tagsArray: tags,
                                colorsArray: colors
                            });

                            imageModelInstance.save(function (err) {
                                if (err) {
                                    console.log(err);
                                }

                                let usersJudged = ret.usersJudged++;
                                let updatedGame;
                                if (usersJudged == ret.size - 1) {
                                    calculateResults(data.gameID);

                                    updatedGame = {
                                        usersJudged: usersJudged,
                                        status: "All players ready for new round.",
                                    }
                                } else {
                                    updatedGame = {
                                        usersJudged: usersJudged,
                                        status: "" + usersJudged + " players ready for new round."
                                    }
                                }

                                gameModel.update(where, updatedGame, {}, function (err, n) {
                                    if (err) {
                                        console.log(err);
                                    }

                                    res.send({status: "success", message: "Image with id \"" + data.imageID + "\" from user with id \"" + data.playerID + "\" saved to Mongo."});
                                    console.log("/uploadPicture complete.");

                                    fs.unlinkSync(filename);
                                });
                            });
                        });
                });
        });
    });
});

function calculateResults(gameID) {
    let where1 = {
        gameID: gameID,
    };
    gameModel.findOne(where1, function (err, ret) {
        if (err) {
            console.log(err)
        }

        let results = ret.results;

        let where2 = {
            gameID: ret.gameID,
            // round: ret.round,
            username: ret.currentJudge
        };
        imageModel.findOne(where2, function (err, judge) {
            let where3 = {
                gameID: ret.gameID,
                // round: ret.round
            };
            imageModel.find(where3, function (err, players) {
                console.log(players.length);

                players.forEach(function (player) {
                    let result = {
                        username: "",
                        round: ret.round,
                        score: 0,
                        totalScore: 0,
                        placement: 4
                    };

                    if (player.username != judge.username) {
                        judge.tagsArray.forEach(function (judgeTag) {
                            player.tagsArray.forEach(function (playerTag, i) {
                                if (playerTag.tag == judgeTag.tag) {
                                    result.score += 25 * player.tagsArray[i].confidence;
                                }
                            });
                        });
                    } else {
                        result.totalScore = ret.round != 0 ? ret.results[ret.round - 1] : 0;
                        result.placement = -1;
                    }

                    if (ret.round != 0) {
                        ret.results[ret.round - 1].forEach(function (previousRoundResult, i) {
                            if (previousRoundResult.username == player.username) {
                                result.totalScore = ret.results[ret.round - 1][i] + result.score;
                            }
                        });
                    } else {
                        result.totalScore = result.score;
                    }

                    result.username = player.username;
                    results.push(result);
                });

                let swapped = true;
                while (swapped) {
                    swapped = false;
                    for (let i = 1; i < results[ret.round].length; i++) {
                        if (results[ret.round][i].score < results[ret.round][i - 1].score) {
                            let tmp = results[ret.round][i];
                            results[ret.round][i] = results[ret.round][i - 1];
                            results[ret.round][i - 1] = tmp;
                            swapped = true;
                        }
                    }
                }

                console.log(JSON.stringify(results[ret.round]));

                // if (results[ret.round]) {
                //     results[ret.round].forEach((result, i) => {
                //         result.placement = i;
                //     });
                // }

                let updatedGame = {
                    results: results,
                    status: "Results Calculated."
                };

                gameModel.update(where1, updatedGame, {}, function (err, n) {
                    if (err) {
                        console.log(err);
                    }

                    //Otherwise the data is saved in mongo successfully and this marks the end of the function.
                });
            });
        })
    });
}

app.post('/results', function (req, res) {
    console.log("GET /results received.");

    let data = req.body;

    let where = {
        gameID: data.gameID,
    };

    gameModel.findOne(where, function (err, ret) {
        if (err) {
            console.log(err)
        }

        if (ret != null && ret.status == "Results Calculated.") {
            console.log(JSON.stringify(ret.results));
            res.json({results: ret.results});
        } else {
            res.json({results: []});
        }
    });
});

app.post('/judgesImage', function (req, res) {
    console.log("GET /judgesImage received.");

    let data = req.body;

    let where = {
        gameID: data.gameID,
    };
    gameModel.findOne(where, function (err, ret) {
        if (err) {
            console.log(err)
        }

        let where = {
            username: ret.currentJudge,
            round: ret.round,
            gameID: data.gameID
        };
        imageModel.findOne(where, function (err, judgeData) {
            if (judgeData != null) {
                res.json({base64string: judgeData.imageData});
            } else {
                res.json({base64string: ""});
            }
        });
    });
});

app.get('/test', function (req, res) {
    let c = "a";
    let s = new Schema({
        a: String
    });
    let model = mongoose.model("s", s, c);

    model.update({}, {a: "b"}, {}, function () {

    });
});

app.listen(app.get('port'));
console.log("Listening on port " + app.get('port') + "...");

module.exports = app;