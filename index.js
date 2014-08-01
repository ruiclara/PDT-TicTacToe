var express = require("express");
var app = express();
var port = 3000

// Set HTML template engine
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Set the views directory
app.set('views', __dirname + '/views');
// Set the static content directory
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
	res.render('index', {title: 'ejs'});
});

var io = require('socket.io').listen(app.listen(port));

console.log('Listening on Port ' + port);

io.sockets.on('connection', function(socket) {
	console.log('Connected');
	socket.emit('message', { message: 'welcome!'});
	socket.on('send', function(data) {
		io.sockets.emit('message', data)
	})
});