var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");

var mongoDB = 'mongodb://127.0.0.1:27017/local';
mongoose.connect(mongoDB);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Schema = mongoose.Schema;
var ImageSchema = new Schema({
    imageId: String,
    imageData: String
});
var ImageModel = mongoose.model('ImageModel', ImageSchema);

var app = express();
app.use(bodyParser.json({limit: '50mb'}));

app.set('port', process.env.PORT || 3000);

var theImage = null;

app.get('/', function (req, res) {
    console.log('GET received');

    res.send(theImage)
});

app.post('/upload', function (req, res) {
    console.log("POST /upload received");
    console.log(req.body.imageData);

    var instance = new ImageModel({imageId: req.body.imageId, imageData: req.body.imageData});

    instance.save(function (err) {
        if (err) return handleError(err);
    });

    res.send(req.body);
});

app.post('/getImage', function (req, res) {
    console.log("POST /getImage received");

    console.log("req.boasdifjlsdkafj: " + req.body.imageId);

    ImageModel.findOne({'imageId': req.body.imageId}, function (err, ret) {
        console.log(ret);

        var img = decodeImage(ret.imageData);


    });
});

function decodeImage(imageData) {
    var image = new Image();
    image.src = imageData;
    return image;
}

app.listen(app.get('port'));

module.exports = app;