import express from 'express';
import http from 'http';
import path from 'path';
import socketio, { Socket } from 'socket.io';

const app = express();
const appHttp = new http.Server(app);
const io = new socketio.Server(appHttp, {
	pingInterval: 4000,
	pingTimeout: 10000
});

app.use(express.json());

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
	timeout?: NodeJS.Timeout;

	id: string;
	closing: boolean;

	hostSocket?: Socket;
	secret: string;
	spectatorSecret: string;

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

	spectators: Array<Socket>;
}

interface SelectionRoleHost {
	role: 'host';
}

interface SelectionRoleCaptain {
	role: 'captain';
	id: string;
}

interface SelectionRoleSpectator {
	role: 'spectator';
}

type SelectionRole = SelectionRoleHost | SelectionRoleCaptain | SelectionRoleSpectator;

const state = new Map<string, SelectionMatch>();

io.on('connection', async connection => {
	console.log('User connected');

	const matchPromise = new Promise<string | undefined>(res => connection.once('selectMatch', (inputtedMatch) => {
		// new promise doesn't care about the return, so i'm using return on the same line to save some space
		if (typeof inputtedMatch !== 'string') return res(undefined);
		if (!state.get(inputtedMatch)) return res(undefined);

		res(inputtedMatch);
	}));

	const selectedRolePromise = new Promise<SelectionRole | undefined>(res => connection.once('selectRole', async secret => {
		if (typeof secret !== 'string') return res(undefined);

		const match = await matchPromise;
		if (!match) return res(undefined);

		const selectedMatch = state.get(match);
		if (!selectedMatch) return res(undefined);

		// check which secret it is
		if (secret === selectedMatch.secret) return res({
			role: 'host'
		});

		if (secret === selectedMatch.spectatorSecret) return res({
			role: 'spectator'
		});

		for (const [captainId, captainData] of selectedMatch.captains.entries()) {
			if (secret === captainData.secret) return res({
				role: 'captain',
				id: captainId
			});
		}

		res(undefined);
	}));

	const match = await matchPromise;
	const selectedRole = await selectedRolePromise;

	if (!match || !selectedRole) {
		console.log('Match or selected role was undefined');
		connection.disconnect();
		return;
	}

	const selectedMatch = state.get(match)!;
	if (!selectedMatch) {
		console.log('Selected match not found');
		connection.disconnect();
		return;
	}

	function sendToAll(key: string, ...args: Array<unknown>) {
		selectedMatch.hostSocket?.emit(key, ...args);
		selectedMatch.captains.forEach(captain => {
			captain.socket?.emit(key, ...args);
		});
		selectedMatch.spectators.forEach(spectator => {
			spectator.emit(key, ...args);
		});
	}

	// this will be a pain to debug
	function cycleCaptain(aggressive: boolean) {
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

			if (!aggressive) return;

			const captainIds = Array.from(selectedMatch.captains.keys());
			let index = captainIds.findIndex(x => x === selectedMatch.turn);

			if (index === -1) throw new Error('Index not found');

			index += 1;
			if (index === captainIds.length) index = 0;

			selectedMatch.turn = captainIds[index];
		}

		sendToAll('picking', selectedMatch.turn);
	}

	function updateLists() {
		sendToAll('newList', Array.from(selectedMatch.players.entries()));
	}

	function generateConnectionObject() {
		const connectionObject: { host: boolean; captains: Record<string, boolean>, spectators: number } = {
			host: selectedMatch.hostSocket ? !selectedMatch.hostSocket.disconnected : false,
			captains: {},
			spectators: selectedMatch.spectators.length
		};

		for (const [captainId, captainData] of selectedMatch.captains.entries()) {
			connectionObject.captains[captainId] = captainData.socket ? !captainData.socket.disconnected : false;
		}

		return connectionObject;
	}

	function updateConnection() {
		sendToAll('connection', generateConnectionObject());
	}

	connection.emit('captainIds', Array.from(selectedMatch.captains.entries()).map(([captainId, captainData]) => ({ name: captainData.name, id: captainId, secret: selectedRole.role === 'host' ? captainData.secret : undefined })));
	connection.emit('newList', Array.from(selectedMatch.players.entries()));
	connection.emit('roleId', selectedRole.role === 'captain'
		? selectedRole.id
		: selectedRole.role);
	connection.emit('picking', selectedMatch.turn);
	connection.emit('permission', selectedRole.role);
	connection.emit('spectatorSecret', selectedMatch.spectatorSecret);

	// apply listeners
	switch(selectedRole.role) {
		case 'captain': {
			selectedMatch.captains.get(selectedRole.id)!.socket?.disconnect();
			selectedMatch.captains.get(selectedRole.id)!.socket = connection;

			connection.on('pick', playerId => {
				if (typeof playerId !== 'string') return;
				if (selectedMatch.turn !== selectedRole.id) return;
				if (!selectedMatch.players.has(playerId)) return;

				selectedMatch.players.set(playerId, selectedRole.id);

				updateLists();
				cycleCaptain(true);
			});

			connection.on('disconnect', () => {
				if (selectedMatch.closing) return;
				selectedMatch.captains.get(selectedRole.id)!.socket = undefined;
				updateConnection();
			});

			break;
		}

		case 'host': {
			selectedMatch.hostSocket?.disconnect();

			if (selectedMatch.timeout) clearTimeout(selectedMatch.timeout);
			selectedMatch.timeout = undefined;

			selectedMatch.hostSocket = connection;

			connection.on('disconnect', () => {
				updateConnection();
				selectedMatch.timeout = setTimeout(() => {
					if (!selectedMatch.hostSocket || selectedMatch.hostSocket.disconnected) {
						selectedMatch.closing = true;
						state.delete(selectedMatch.id);

						for (const { socket } of selectedMatch.captains.values()) {
							socket?.disconnect();
						}
					}
				}, 10000);
			});

			connection.on('editCaptainName', ({ id, name }) => {
				const currentCaptain = selectedMatch.captains.get(id)!

				currentCaptain.name = name;

				sendToAll('updateCaptainName', {
					name,
					id
				})
			});

			connection.on('add', (playerName) => {
				if (typeof playerName !== 'string') return;

				selectedMatch.players.set(playerName, UNSELECTED_ID);
				updateLists();
			});

			connection.on('remove', (playerName) => {
				if (typeof playerName !== 'string') return;

				selectedMatch.players.delete(playerName);

				cycleCaptain(false);
				updateLists();
			});

			connection.on('ping', captainId => {
				const captain = selectedMatch.captains.get(captainId);
				captain?.socket?.emit('ping');
			});

			connection.on('forcePick', captainId => {
				selectedMatch.turn = captainId;

				sendToAll('picking', selectedMatch.turn);
			});

			break;
		}

		case 'spectator': {
			selectedMatch.spectators.push(connection);

			connection.on('disconnect', () => {
				const index = selectedMatch.spectators.findIndex(value => value === connection);
				selectedMatch.spectators.splice(index, 1);
				updateConnection();
			});

			break;
		}
	}

	updateConnection();
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
		closing: false,
		captains: mappedCaptains,
		players: new Map(),
		secret: generateId(16),
		spectatorSecret: generateId(16),
		id: generateId(16),
		turn: Array.from(mappedCaptains.keys())[0],
		timeout: setTimeout(() => {
			if (!newMatch.hostSocket || newMatch.hostSocket.disconnected) {
				state.delete(newMatch.id);

				for (const { socket } of newMatch.captains.values()) {
					socket?.disconnect();
				}
			}
		}, 60000),
		spectators: []
	};

	console.log(`New match: ${process.env.ORIGIN ?? ''}/match/${newMatch.id}/${newMatch.spectatorSecret}`);

	state.set(newMatch.id, newMatch);

	res.status(200).end(JSON.stringify({
		id: newMatch.id,
		secret: newMatch.secret
	}));
});

app.use(express.static(path.join(__dirname, '..', 'client')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'index.html')));

appHttp.listen(process.env.PORT || 3000, () => {
	console.log('App started');
});
