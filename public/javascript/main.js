var socket = io.connect('http://localhost:3000');

$(document).ready(function() {
	// Generate game table 
	var rowContent, cellContent;
	cellContent = '<a href="#" onclick="play(this)""></a>'
	for(var row = 0; row < 3; row++) {
		rowContent = '<tr>'; 
		for(var col = 0; col < 3; col++) {
			rowContent += '<td id="cell-'+ row + '-' + col 
						+ '">' + cellContent + '</td>';
		}
		rowContent += '</tr>';
		$('#gameTable').append(rowContent);
	}
});


// Socket.io events
socket.on('message', function(data) {
	console.log('Server: ' + data.message);
});

// Server Acknowledges the client has been registered
// Data contains an array of online users
socket.on('successfulRegistration', function(data) {
	$('#startForm').hide();
	$('#onlinePlayers').show();
});

// Server warns something went wrong and the action was not carried
// Data contains error message {message}
socket.on('serverError', function(data) {
	window.alert(data.message);
});

// Server sends an updated list of players
// Data contains an array with all the online players {onlinePlayers}
socket.on('onlinePlayers', function(data) {
	$('#opponentSelect').empty();
	for(player in data.onlinePlayers) {
		if(data.onlinePlayers[player] != socket.username) {
			$('#opponentSelect').append('<option>' + data.onlinePlayers[player] + '</option>');
		}
	}
});

// Server warns the client someeone invited it to a game
// Data contains the plaer username {source}
socket.on('invite', function(data) {
	var accept = window.confirm('Player ' + data.source + ' Just invited you to a game!'
				+ ' \nDo you wish to accept?');

	if(accept) {
		socket.emit('acceptInvite', {source: data.source});
	}
	else {
		console.log('decline');
	}
});

// Server requests the server to start the game
// Returns the game id {gameID} and the name of the opponent {opponent}
socket.on('startGame', function(data) {
	$('#mainInfo').show();
	$('#playerName').text(socket.username);
	$('#opponentName').text(data.opponent);

	$('#onlinePlayers').hide();
	$('#gameTable').show();

	socket.gameID = data.gameID;
	socket.opponent = data.opponent;
});

// Server warns the client that its inviation was successful
// Data contains the name of the player {target} for the client to confirm
socket.on('inviteAccepted', function(data) {
	console.log(data.target + 'Accepted');
});

// Server authorizes the client to make a move
// Data containers the move {move: {col, row}}
socket.on('move', function(data) {
	$('#status').text('Waiting for opponent\'s move');
	$('#cell-' + data.move.row + '-' + data.move.col + ' a').text(data.symbol);
});


// Server warns the client that it is its turn
socket.on('turn', function(data) {
	$('#status').text('Your turn!');
});

socket.on('stopGame', function(data) {
	window.alert('Game has stopped!');
});

// Store this a in a player management file
function send() {
	socket.emit('send', {message: 'This was sent by the server'});
}

function register()  {
	if (startForm.nameInput.value === '') {
		window.alert('Please input a user name!');
		// Stop execution -- NOT DONE FOR TESTING PURPOSES
	}
	socket.username = startForm.nameInput.value;
	socket.emit('register', {playerName: socket.username})
	return false;
}

function refreshOnlinePlayers() {
	window.alert('Not implemented!');
}

function invitePlayer() {
	var opponent = $('#opponentSelect').find(':selected').text();
	socket.emit('invite', {playerName: opponent});
}

function play(link) {
	var idSplit; // Array
	idSplit = link.parentNode.id.split('-');
	socket.emit('move', {	gameID: socket.gameID,
							move: {	row: idSplit[1], 
									col: idSplit[2]
								}
							});
}