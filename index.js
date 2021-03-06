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
		// Send start game command
		global.onlinePlayers[newGame.player1].emit('startGame', {	gameID: newGame.gameID,
																	opponent: newGame.player2});
		global.onlinePlayers[newGame.player1].gameID = newGame.gameID;
		global.onlinePlayers[newGame.player2].emit('startGame', {	gameID: newGame.gameID,
																	opponent: newGame.player1});
		global.onlinePlayers[newGame.player2].gameID = newGame.gameID;
		// Give go to first player
		global.onlinePlayers[newGame.currentPlayer].emit('turn', {});
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
			global.onlinePlayers[game.player1].emit(
														'move', 
													{	move: data.move, 
														symbol: game.playerSymbols[game.currentPlayer]
													});
			global.onlinePlayers[game.player2].emit(
														'move', 
													{	move: data.move, 
														symbol: game.playerSymbols[game.currentPlayer]
													});
			global.onlinePlayers[game.currentPlayer].emit('turn', {});
		}
		else {
			console.log('Not valid!');
		}
		// check if the player has one
		if(game.checkGame(socket.username, data.move)) {
			onlinePlayers[global.games[socket.gameID].player1].emit('stopGame', {});
			onlinePlayers[global.games[socket.gameID].player2].emit('stopGame', {});
			global.games.splice(socket.gameID, 1);
		}

	});

	socket.on('disconnect', function() {
		// Check if the socket is registered
		if(socket.username == null) {
			console.log('An identified user disconnected! Socket info: ' + socket);
			return;
		}

		// Stop any game the user is currently in
		if(games[socket.gameID] != null) {
			onlinePlayers[global.games[socket.gameID].player1].emit('stopGame', {});
			onlinePlayers[global.games[socket.gameID].player2].emit('stopGame', {});
			global.games.splice(socket.gameID, 1);
		}
		
		// Remove player
		var playerIndex = global.onlinePlayers.indexOf(socket.username);
		global.onlinePlayers.splice(global.playerNames[playerIndex]);
		global.playerNames.splice(playerIndex, 1);
		console.log(socket.username + ' disconnected!');
	});
});

// GAME CLASSS
function Game(player1, player2) {
	this.gameID;
	this.roundCount = 0;
	this.player1 = player1;
	this.player2 = player2; 
	this.playerSymbols = new Array();
	this.playerSymbols[player1] = 'X';
	this.playerSymbols[player2] = 'O';
	this.currentPlayer = player1; // Initialize to player 1 to avoid possiblle initilization problems
	this.table = new Array();

	this.startGame = function(gameID)  {
		this.gameID = gameID;
		this.table = [
						[0 , 0, 0],
						[0 , 0, 0],
						[0 , 0, 0]];
	};

	this.setInitialPlayer = function(player) {
		this.currentPlayer = player;
	}

	this.getNextPlayer = function() {
		if(this.currentPlayer === player1) {
			this.currentPlayer = player2;
		}
		else {
			this.currentPlayer = player1;
		}
	}

	this.move = function(player, move) {
		if(this.table[move.row][move.col] === 0 && player === this.currentPlayer) {
			this.table[move.row][move.col] = player;
			this.getNextPlayer();
			this.roundCount++;
			return true;
		}
		else {
			return false;
		}
	}

	// Checks if the game is finished
	// 
	this.checkGame = function(player, move) {
		var playerWon = true;

		if(this.roundCount < 5 ) {
			console.log('Not finished');
			return false;
		}
		
		// check if player won vertically
		for(var i = 0; i < 3; i++) {
			if(this.table[i][move.col] != player) {
				playerWon = false;
				break;
			}
		}
		if(playerWon) return playerWon;
		else playerWon = true;
		// Check if player won horizontally
		for(var i = 0; i < 3; i++) {
			if(this.table[move.row][i] != player) {
				playerWon = false;
				break;
			}
		}
		if(playerWon) return playerWon;
		else playerWon = true;
		console.log('Gets here!');
		// Check if player one in one of the diagonals
		// Left-top to right-bottom
		var col = 0;
		var row = 0;
		for(var i = 0; i < 3; i++) {
			console.log(this.table[row][col]);
			if(this.table[row][col] != player) {
				playerWon = false;
				break;
			}
			col++;
			row++;
		}
		if(playerWon) console.log('Player ' + player + ' won!');//return playerWon;
		else playerWon = true;
		// Letf-bottom to right-bottom
		var col = 0;
		var row = 2;
		for(var i = 0; i < 3; i++) {
			console.log(this.table[row][col]);
			if(this.table[row][col] != player) {
				playerWon = false;
				break;
			}
			col++;
			row--;
		}

		if(playerWon) console.log('Player ' + player + ' won!');//return playerWon;
	}

	// Stop Game
	this.stopGame = function() {
		
	}
}