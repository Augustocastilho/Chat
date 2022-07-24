var app = require('http').createServer(answer); // Criando o servidor
var fs = require('fs'); // Sistema de arquivos
var io = require('socket.io')(app); // Socket.IO
var users = []; // Lista de usuários
var lastMessages = []; // Lista com ultimas messages enviadas no chat

app.listen(3000);

console.log("Aplicação está em execução...");

// Função principal de resposta as requisições do servidor
function answer (req, res) {
	var file = "";
	if(req.url == "/"){
		file = __dirname + '/index.html';
	}else{
		file = __dirname + req.url;
	}
	fs.readFile(file,
		function (err, data) {
			if (err) {
				res.writeHead(404);
				return res.end('Página ou arquivo não encontrados');
			}

			res.writeHead(200);
			res.end(data);
		}
	);
}

io.on("connection", function(socket){
	// Método de resposta ao evento de entrar
	socket.on("login", function(name, callback){
		if(!(name in users)){
			socket.name = name;
			users[name] = socket; // Adicionando o nome de usuário a lista armazenada no servidor

			// Enviar para o usuário ingressante as ultimas mensagens armazenadas.
			for(index in lastMessages){
				socket.emit("update messages", lastMessages[index]);
			}


			var message = name + " acabou de entrar na sala";
			var objMessage = {msg: message, type: 'system'};

			io.sockets.emit("update users", Object.keys(users)); // Enviando a nova lista de usuários
			io.sockets.emit("update messages", objMessage); // Enviando 1 anunciando entrada do novo usuário

			stockMessage(objMessage); // Guardando a mensagem na lista de histórico

			callback(true);
		}else{
			callback(false);
		}
	});


	socket.on("send message", function(datas, callback){

		var sentMessage = datas.msg;
		var user = datas.usu;
		if(user == null)
			user = ''; // Caso não tenha um usuário, a mensagem será enviada para todos da sala

		sentMessage = socket.name + " diz: " + sentMessage;
		var objMessage = {msg: sentMessage, type: ''};

		if(user == ''){
			io.sockets.emit("update messages", objMessage);
			stockMessage(objMessage); // Armazenando a mensagem
		}else{
			objMessage.type = 'private';
			socket.emit("update messages", objMessage); // Emitindo a mensagem para o usuário que a enviou
			users[user].emit("update messages", objMessage); // Emitindo a mensagem para o usuário escolhido
		}
		
		callback();
	});

	socket.on("disconnect", function(){
		delete users[socket.name];
		var message = socket.name + " saiu da sala";
		var objMessage = {msg: message, type: 'system'};

		// No caso da saída de um usuário, a lista de usuários é atualizada
		// junto de um aviso em mensagem para os participantes da sala		
		io.sockets.emit("update users", Object.keys(users));
		io.sockets.emit("update messages", objMessage);

		stockMessage(objMessage);
	});

});


// Função para guardar as messages e seu tipo na variável de ultimas messages
function stockMessage(message){
	if(lastMessages.length > 5){
		lastMessages.shift();
	}

	lastMessages.push(message);
}