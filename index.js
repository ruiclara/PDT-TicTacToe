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
global.games = new Array(); // An array of the games currently being played

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
		if(data === '' || global.playerNames.indexOf(data.playerName) != -1) {
			console.log('Registration Unsuccessful');
			socket.emit('serverError', {message: 'Player already exists!'});
			return;
		}

		// Store the player name
		global.playerNames.push(data.playerName);

		// Setup socket variables and store it
		socket.username = data.playerName;
		socket.opponent = '';
		global.onlinePlayers[data.playerName] = socket;

		// Inform client it is registers
		socket.emit('successfulRegistration');
		// Send new list of players to all players
		io.sockets.emit('onlinePlayers', {onlinePlayers: global.playerNames});
	});

	socket.on('invite', function(data) {
		console.log(socket.username + ' is inviting ' + data.playerName + ' for a game!');

		if(data.playerName == '') {
			return;
		}

		// Check if the player is not in game already
		if(global.onlinePlayers[data.playerName].opponent !== '') {
			socket.emit('serverError', {message: 'Players ' + data.playerName + ' is in game!'});
			return;
		}

		global.onlinePlayers[data.playerName].emit('invite', {source: socket.username});
	});

	socket.on('acceptInvite', function(data) {
		// CHECK IF USER IS STILL CONNECTED AND AVAILABLE
		console.log(socket.username + ' accepted invite from ' + data.source);
		global.onlinePlayers[data.source].emit('inviteAccepted', {'target': socket.username}); 
		// VALIDATE IF BOTH PLAYERS ARE READY
		var newGame  = new Game(socket.username, data.source);
		var newLength = global.games.push(newGame);
		newGame.startGame(newLength-1);
		global.onlinePlayers[newGame.players[newGame.currentPlayerIndex]].emit('turn', {});
	});

	// Client sends request to make a move
	// It sends the game id it belongs to and the move
	socket.on('move', function(data) {
		// CHECK IF THIS SOCKET CAN PLAY THIS GAME
		console.log('MAKING A MOVE:')
		console.log('Game ID: ' + data.gameID); // INITIALIZE THESE
		console.log('Move: ' + '(' + data.move.row + ', ' + data.move.col + ')');
		console.log('Current State: ' + global.games[data.gameID].table[data.move.row][data.move.col]);

		var game = global.games[data.gameID];
		if(game.move(socket.username, data.move)) {
			for(var player = 0; player < global.games[data.gameID].players.length; player++) {
				global.onlinePlayers[game.players[player]].emit(
															'move', 
														{	move: data.move, 
															symbol: game.playerSymbols[game.currentPlayerIndex]
														});
			}
			global.onlinePlayers[game.players[game.currentPlayerIndex]].emit('turn', {});
		}
		else {
			console.log('Not valid!');
		}
		
	});

	socket.on('disconnect', function() {
		// Check if the socket is registered
		if(socket.username == null) {
			console.log('An identified user disconnected! Socket info: ' + socket);
			return;
		}
		var playerIndex = global.onlinePlayers.indexOf(socket.username);
		global.onlinePlayers.splice(global.playerNames[playerIndex]);
		global.playerNames.splice(playerIndex, 1);
		console.log(socket.username + ' disconnected!');
	});
});

// GAME CLASSS
function Game(player1, player2) {
	this.players = [player1, player2];
	this.playerSymbols = ['X', 'O']
	this.currentPlayerIndex = 0; // Initialize to player 1 to avoid possiblle initilization problems
	this.table = new Array();

	this.startGame = function(gameID)  {
		this.table = [
						[0 , 0, 0],
						[0 , 0, 0],
						[0 , 0, 0]];
		for(var player = 0; player < this.players.length; player++) {
			// This needs to get out of game - It's out of it's scope
			global.onlinePlayers[this.players[player]].emit('startGame', {gameID: gameID, opponent: this.players[player]});
		}
	};

	this.setInitialPlayer = function(player) {
		this.currentPlayer = player;
	}

	this.getNextPlayer = function() {
		this.currentPlayerIndex++;
		if(this.currentPlayerIndex >= this.players.length) {
			this.currentPlayerIndex = 0;
		}
	}

	// TODO: Check if player can play in this game
	this.move = function(player, move) {
		if(this.table[move.row][move.col] === 0 && player === this.players[this.currentPlayerIndex]) {
			this.table[move.row][move.col] = player;
			this.getNextPlayer();
			return true;
		}
		else {
			return false;
		}
	}
}