import express from 'express';
import http from 'http';
import path from 'path';
import socketio, { Socket } from 'socket.io';

const app = express();
const appHttp = new http.Server(app);
const io = new socketio.Server(appHttp);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function generateId(length: number) {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;

	for (var i = 0; i < length; i++) {
	   result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}

	return result;
}

const UNSELECTED_ID = 'unselected';

interface Captain {
	name: string;
	socket?: Socket;
	secret: string;
}

type SelectionMatch = {
	id: string;

	hostSocket?: Socket;
	secret: string;

	/**
	 * Value: captain id
	 */
	turn: string;

	/**
	 * Index: player name, Value: captain id
	 */
	players: Map<string, string>;
	/**
	 * Index: id, Value: name
	 */
	captains: Map<string, Captain>;
}

interface SelectionRoleHost {
	role: 'host';
}

interface SelectionRoleCaptain {
	role: 'captain';
	id: string;
}

type SelectionRole = SelectionRoleHost | SelectionRoleCaptain;

const state = new Map<string, SelectionMatch>();

io.on('connection', async connection => {
	console.log('User connected');

	let match = await new Promise<string | undefined>(res => connection.once('selectMatch', (inputtedMatch) => {
		// new promise doesn't care about the return, so i'm using return on the same line to save some space
		if (typeof inputtedMatch !== 'string') return res(undefined);
		if (!state.get(inputtedMatch)) return res(undefined);

		res(inputtedMatch);
	}));

	if (!match) {
		connection.disconnect();
		return;
	}

	const selectedMatch = state.get(match)!;

	const selectedRole = await new Promise<SelectionRole | undefined>(res => connection.once('selectRole', (secret) => {
		if (typeof secret !== 'string') return res(undefined);

		// check which secret it is
		if (secret === selectedMatch.secret) return res({
			role: 'host'
		});

		for (const [captainId, captainData] of selectedMatch.captains.entries()) {
			if (secret === captainData.secret) return res({
				role: 'captain',
				id: captainId
			});
		}

		res(undefined);
	}));

	if (!selectedRole) {
		connection.disconnect();
		return;
	}

	// this will be a pain to debug
	function cycleCaptain() {
		// determine if any captain is at a disadvantage in terms of players
		const captainsToPlayers = new Map<string, number>();
		for (const captain of selectedMatch.captains.keys()) {
			captainsToPlayers.set(captain, 0);
		}

		for (const captain of selectedMatch.players.values()) {
			if (captain === UNSELECTED_ID) continue;

			captainsToPlayers.set(captain, (captainsToPlayers.get(captain) ?? 0) + 1);
		}

		// there has to be a better algorithm for this..
		const captainsAndPlayers = Array.from(captainsToPlayers.entries()).reduce((existing, [captainId, playerCount]) => [...existing, {
			captainId,
			playerCount
		}], [] as Array<{ captainId: string, playerCount: number }>);

		captainsAndPlayers.sort((a, b) => a.playerCount - b.playerCount);

		// always going to be size 2+
		if (captainsAndPlayers[0].playerCount < captainsAndPlayers[1].playerCount) {
			selectedMatch.turn = captainsAndPlayers[0].captainId;
		} else {
			// no one was at an advantage, cycle downwards
			const captainIds = Array.from(selectedMatch.captains.keys());
			let index = captainIds.findIndex(x => x === selectedMatch.turn);

			if (index === -1) throw new Error('Index not found');

			index += 1;
			if (index === captainIds.length) index = 0;

			selectedMatch.turn = captainIds[index];
		}

		selectedMatch.hostSocket?.emit('picking', selectedMatch.turn);
		selectedMatch.captains.forEach(captain => {
			captain.socket?.emit('picking', selectedMatch.turn);
		});
	}

	function updateLists() {
		selectedMatch.hostSocket?.emit('newList', Array.from(selectedMatch.players.entries()));
		selectedMatch.captains.forEach(captain => {
			captain.socket?.emit('newList', Array.from(selectedMatch.players.entries()));
		});
	}

	connection.emit('captainIds', Array.from(selectedMatch.captains.entries()).map(([captainId, captainData]) => ({ name: captainData.name, id: captainId, secret: selectedRole.role === 'host' ? captainData.secret : undefined })));
	connection.emit('newList', Array.from(selectedMatch.players.entries()));
	connection.emit('roleId', selectedRole.role === 'captain' ? selectedRole.id : 'host');
	connection.emit('picking', selectedMatch.turn);
	connection.emit('permission', selectedRole.role);

	// apply listeners
	switch(selectedRole.role) {
		case 'captain': {
			selectedMatch.captains.get(selectedRole.id)!.socket?.disconnect();
			selectedMatch.captains.get(selectedRole.id)!.socket = connection;

			connection.on('pick', (playerId) => {
				if (typeof playerId !== 'string') return;
				if (selectedMatch.turn !== selectedRole.id) return;
				if (!selectedMatch.players.has(playerId)) return;

				selectedMatch.players.set(playerId, selectedRole.id);

				updateLists();
				cycleCaptain();
			});

			break;
		}

		case 'host': {
			selectedMatch.hostSocket?.disconnect();
			selectedMatch.hostSocket = connection;

			connection.on('add', (playerName) => {
				if (typeof playerName !== 'string') return;

				selectedMatch.players.set(playerName, UNSELECTED_ID);
				updateLists();
			});

			connection.on('remove', (playerName) => {
				if (typeof playerName !== 'string') return;

				selectedMatch.players.delete(playerName);

				cycleCaptain();
				updateLists();
			});

			break;
		}
	}
});

app.post('/api/create', (req, res) => {
	const captainsRaw = req.body.captains;

	if (!Array.isArray(captainsRaw)) {
		res.status(400).end();
		return;
	}

	const mappedCaptains: Map<string, Captain> = captainsRaw.reduce((existing, current) => {
		existing.set(generateId(16), {
			name: `${current}`,
			socket: undefined,
			secret: generateId(16)
		});

		return existing;
	}, new Map<string, Captain>());

	const newMatch: SelectionMatch = {
		captains: mappedCaptains,
		players: new Map(),
		secret: generateId(16),
		id: generateId(16),
		turn: Array.from(mappedCaptains.keys())[0]
	};

	state.set(newMatch.id, newMatch);

	res.status(200).end(JSON.stringify({
		id: newMatch.id,
		secret: newMatch.secret
	}));
});

appHttp.listen(process.env.PORT || 3000, () => {
	console.log('App started');
});