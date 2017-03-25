var express = require('express');

var app = express();

app.get('/picture', function(req, res) {
    res.json({notes: "This is your picture. Please analyze me."})
});

app.get('/stats', function(req, res) {
    res.json({notes: "These are your stats. Brandon Faulkner is winning as usual."})
});

app.listen(3000);