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

// Game variables
global.onlinePlayers = new Array(); // Keeps sockets in a dictionary with key username
global.playerNames = new Array(); // Keeps the usernames in a simple array

io.sockets.on('connection', function(socket) {
	socket.emit('message', { message: 'welcome!'});

	socket.on('send', function(data) {
		io.sockets.emit('message', data)
	});

	socket.on('startGame', function(data) {
		console.log('Game starting between ' + data.player1 + ' and ' + data.player2);
	});

	socket.on('register', function(data) {
		console.log('Registering player: ' + data.playerName);

		// Check if the player name is valis and doesn't exist
		if(data === '') {
			console.log('Registration Unsuccessful');
			return;
		}

		global.playerNames.push(data.playerName);
		socket.username = data.playerName;
		global.onlinePlayers[data.playerName] = socket;
		socket.emit('successfulRegistration', {onlinePlayers: global.playerNames});
	});

	socket.on('invite', function(data) {
		console.log(socket.username + ' is inviting ' + data.playerName + ' for a game!');
	});

	socket.on('disconnect', function() {
		var playerIndex = global.onlinePlayers.indexOf(socket.username);
		global.onlinePlayers.splice(global.playerNames[playerIndex]);
		global.playerNames.splice(playerIndex, 1);
		console.log(socket.username + ' disconnected!');
	});
});
