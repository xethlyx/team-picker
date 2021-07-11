<template>
	<div class="match" v-if="state.role">
		<div class="host-disconnected" v-if="!state.connected.host">
			<span>Host disconnected! Auto-closing in 10 seconds..</span>
		</div>
		<div class="selection-container" v-for="[captainId, captainName] of state.captainIds" :key="captainId">
			<div class="selection-header">
				<span contenteditable="true" @input="editCaptainName($event.target.textContent, captainId)">
					{{ captainName }}
				</span>
				<span class="right-container">
					<transition-group name="list" @before-leave="beforeLeave">
						<span class="badge picking" v-if="state.turn === captainId" title="It is currently their turn to pick" key="picking">
							<i class="las la-check"></i>
						</span>
						<span class="badge disconnected" title="They are currently disconnected" v-if="!state.connected.captains[captainId]" key="disconnected">
							<i class="las la-plug"></i>
						</span>
						<button class="badge host-action" title="Click to ping (usually doesn't work until the user interacts)" v-else-if="isHost" key="notify" @click="pingCaptain(captainId)">
							<i class="las la-bell"></i>
						</button>
						<button class="badge host-action" title="Click to change turn" v-if="isHost" key="turn" @click="forcePick(captainId)">
							<i class="las la-play"></i>
						</button>
						<span v-if="isHost" class="join-link" key="input">
							<PasteInput :text="`${origin}/match/${$route.params.id}/${state.captainSecrets.get(captainId)}`" />
						</span>
					</transition-group>
				</span>
			</div>
			<transition-group name="list" @before-leave="beforeLeave">
				<PlayerComponent :name="playerName" v-for="playerName of playersOf(captainId)" :role="state.role" :key="playerName" @remove="removePlayer(playerName)" @pick="pickPlayer(playerName)" :turn="false" />
			</transition-group>
		</div>
		<div class="selection-container unselected">
			<div class="selection-header double-button">
				<span>Unselected</span>
				<div class="button-container">
					<transition name="fade">
						<div class="spectator" title="Spectators" v-if="state.connected.spectators !== 0"><span class="count">{{ state.connected.spectators }}</span><i class="las la-eye"></i></div>
					</transition>
					<PasteInput :text="generateLua()" displayText="Lua" v-if="isHost" />
					<PasteInput :text="generateDiscord()" displayText="Discord" v-if="isHost" />
					<PasteInput :text="`${origin}/match/${$route.params.id}/${state.spectatorSecret}`" displayText="Spectate" />
				</div>
			</div>
			<transition-group name="list" @before-leave="beforeLeave">
				<PlayerComponent :name="playerName" v-for="playerName of playersOf('unselected')" :role="state.role" :key="playerName" @remove="removePlayer(playerName)" @pick="pickPlayer(playerName)" :turn="state.roleId === state.turn" />
				<form class="selection-node new-player" v-if="isHost" @submit.prevent="addPlayer" key="__newplayer">
					<input v-model="state.newPlayer" type="text" placeholder="Add new player" />
					<button @click="addPlayer"><i class="las la-user-plus"></i></button>
				</form>
			</transition-group>
		</div>
	</div>
	<div class="match loading" v-else>
		<span>Please wait... (refresh if this doesn't load within a reasonable time)</span>
	</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from 'vue';
import { io } from 'socket.io-client';
import { useRoute } from 'vue-router';
import router from '@/router';
import PlayerComponent from '@/components/PlayerComponent.vue';
import PasteInput from '@/components/PasteInput.vue';
import { beforeLeave } from '@/beforeLeave';

export default defineComponent({
	components: {
		PlayerComponent,
		PasteInput
	},
	setup() {
		const state = reactive({
			newPlayer: '',
			role: undefined as undefined | 'captain' | 'host',
			roleId: '',
			captainIds: new Map<string, string>(),
			captainSecrets: new Map<string, string>(),
			players: new Map<string, string>(),
			turn: '',
			connected: { host: false, captains: {}, spectators: 0 } as { host: boolean, captains: Record<string, boolean>, spectators: number },
			spectatorSecret: ''
		});

		const isHost = computed(() => state.role === 'host');

		const origin = window.location.origin;

		const socket = io();

		socket.on('disconnect', () => {
			alert('Disconnected');
			router.push('/');
		});

		socket.once('captainIds', (captainIds: Array<{name: string, id: string, secret?: string}>) => {
			state.captainIds = captainIds.reduce((existing, current) => {
				existing.set(current.id, current.name);

				if (current.secret) state.captainSecrets.set(current.id, current.secret);

				return existing;
			}, new Map<string, string>());
		});

		socket.once('permission', permission => state.role = permission);
		socket.once('roleId', roleId => state.roleId = roleId);
		socket.once('spectatorSecret', secret => state.spectatorSecret = secret);
		socket.on('picking', turn => state.turn = turn);
		socket.on('newList', (players) => {
			state.players = new Map(players);
		});

		socket.on('updateCaptainName', ({ id, name }) => {
			state.captainIds.set(id, name);
		});

		socket.on('connection', connectionObject => {
			state.connected = connectionObject;
		});

		socket.on('ping', () => {
			const ping = new Audio('/notify.wav');
			ping.play();
		});

		socket.emit('selectMatch', useRoute().params.id);
		socket.emit('selectRole', useRoute().params.secret);

		function editCaptainName(name: string, id: string) {
			socket.emit('editCaptainName', {
				id,
				name
			});
		}

		function addPlayer() {
			if (state.newPlayer.length === 0) return;

			socket.emit('add', state.newPlayer);
			state.newPlayer = '';
		}

		function removePlayer(player: string) {
			socket.emit('remove', player);
		}

		function pickPlayer(player: string) {
			socket.emit('pick', player);
		}

		function playersOf(group: string) {
			return Array.from(state.players.entries()).filter(([, playerGroup]) => playerGroup === group).map(([playerName]) => playerName);
		}

		function pingCaptain(captain: string) {
			socket.emit('ping', captain);
		}

		function forcePick(captain: string) {
			socket.emit('forcePick', captain);
		}

		function generateDiscord() {
			const captains: Record<string, Array<string>> = Array.from(state.captainIds.keys()).reduce((existing, current) => ({...existing, [current]: []}), {});

			for (const [player, team] of state.players.entries()) {
				if (!(team in captains)) continue; // probs unselected
				captains[team].push(player);
			}

			const formattedCaptains: Record<string, Array<string>> = Object.entries(captains).reduce((existing, [captainId, players]) => ({
				...existing,
				[state.captainIds.get(captainId)!]: players
			}), {});

			const result: Array<string> = [];

			for (const [captainName, players] of Object.entries(formattedCaptains)) {
				result.push(`**${captainName}**\n${players.join(' ')}`);
			}

			return result.join('\n\n');
		}

		function generateLua() {
			const captains = Array.from(state.captainIds.keys());
			const outputTable: Array<string> = [];

			for (const [player, team] of state.players.entries()) {
				if (!captains.includes(team)) {
					captains.push(team);
				}

				outputTable.push(`["${player}"] = ${captains.findIndex(x => x === team)}`);
			}

			return `{ ${outputTable.join(', ')} }`;
		}

		return { state, isHost, editCaptainName, addPlayer, removePlayer, pickPlayer, playersOf, origin, pingCaptain, forcePick, generateLua, generateDiscord, beforeLeave };
	}
});
</script>

<style scoped>
.match {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: 1fr;
	grid-template-rows: 1fr;
	gap: 0.5em;
	padding: 0.5em;
	height: 100vh;
	width: 100vw;
	position: absolute;
}

.selection-container {
	gap: 0.4em;
	display: flex;
	flex-direction: column;
	background-color: rgba(255, 255, 255, 0.05);
	height: 100%;
	padding: 0.5em;
	border-radius: 3px;
}

.new-player {
	display: grid;
	grid-template-columns: 1fr 2rem;
	gap: 0.4em;
	height: auto;
	padding: 0.3125rem;
}

.new-player button {
	height: 100%;
	border: 0;
	border-radius: 3px;
	color: #fff;
	height: 2rem;
}

.new-player input {
	height: 2rem;
}

.selection-header {
	display: grid;
	grid-template-columns: 1fr 1fr;
	align-items: center;
	height: 35px;
	gap: 0.4em;
}

.selection-header.double-button {
	grid-template-columns: 1fr 1fr;
}

.selection-header button {
	height: 100%;
	border: 0;
	border-radius: 3px;
	color: #fff;
}

.selection-header input {
	width: 100%;
}

.badge {
	background-color: rgba(255, 255, 255, 0.05);
	width: 2rem;
	height: 2rem;
	display: inline-block;
	text-align: center;
	line-height: 2rem;
	border-radius: 3px;
	flex-shrink: 0;
	padding: 0;
}

.host-disconnected {
	z-index: 100;
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.7);
	color: #fff;
}

.loading {
	z-index: 100;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 90%;
	height: 90%;
	max-width: 400px;
	max-height: 100px;
	padding: 10px 20px;
	border-radius: 3px;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgba(255, 255, 255, 0.05);
	color: #fff;
}

.right-container {
	justify-content: flex-end;
	display: flex;
	gap: 0.4rem;
}

.disconnected {
	color: #e74c3c;
}

.picking {
	color: #2ecc71;
}

.host-action:hover {
	background-color: #e67e22;
}

.join-link .paste-input {
	width: 10rem;
	flex-shrink: 0;
}

.button-container {
	display: flex;
	flex-direction: row;
	gap: 0.4rem;
	justify-content: flex-end;
}

.button-container > div {
	width: 6.8rem;
	flex-shrink: 0;
}

div.spectator {
	background-color: rgba(255, 255, 255, 0.05);
	width: auto;
	line-height: 2rem;
	height: 2rem;
	border-radius: 3px;
	padding: 0 0.4rem;
}

div.spectator .count {
	margin-right: 0.4rem;
}
</style>

<style>
.selection-node {
	display: block;
	background-color: rgba(255, 255, 255, 0.05);
	padding: 0.3125rem 0.3125rem 0.3125rem 0.5rem;
	border-radius: 3px;
	height: 2rem;
	line-height: 1.375rem;
}
</style>
