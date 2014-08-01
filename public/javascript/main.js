var socket = io.connect('http://localhost:3000');

$(document).ready(function() {
	// Generate game table 
	for(var row = 0; row < 3; row++) {
		for(var col = 0; col < 3; col++) {
			
		}
	}

	socket.on('message', function(data) {
		console.log('Server: ' + data.message);
	});
});

function send() {
	socket.emit('send', {message: 'This was sent by the server'});
}