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


function loadOnlinePlayers(playersList) {
	for(player in playersList) {
		$('#opponentSelect').append('<option>' + playersList[player] + '</option>');
	}
	$('#onlinePlayers').show();
}
// Server Acknowledges the client has been registered
// Data contains an array of online users
socket.on('successfulRegistration', function(data) {
	$('#startForm').hide();
	loadOnlinePlayers(data.onlinePlayers);
	console.log(data);
});


function send() {
	socket.emit('send', {message: 'This was sent by the server'});
}

function register()  {
	if (startForm.nameInput.value === '') {
		window.alert('Please input a user name!');
	}
	socket.emit('register', {playerName: startForm.nameInput.value})
	return false;
}

function refreshOnlinePlayers() {
	window.alert('Not implemented!');
}

function invitePlayer() {
	
	//socket.emit('invite', {playerName: })
}
