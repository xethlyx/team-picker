<template>
	<div class="match" v-if="state.role">
		<div class="selection-container" v-for="[captainId, captainName] of state.captainIds" :key="captainId">
			<div class="selection-header">
				<span>{{ captainName }}<span class="picking" v-if="state.turn === captainId">Picking</span></span>
				<button span v-if="state.role === 'host'" @click="copy(`${origin}/match/${$route.params.id}/${state.captainSecrets.get(captainId)}`)">COPY</button>
				<span v-if="state.role === 'host'"><input type="text" readonly :value="`${origin}/match/${$route.params.id}/${state.captainSecrets.get(captainId)}`" /></span>
			</div>
			<PlayerComponent :name="playerName" v-for="playerName of playersOf(captainId)" :role="state.role" :key="playerName" @remove="removePlayer(playerName)" @pick="pickPlayer(playerName)" :turn="false" />
		</div>
		<div class="selection-container unselected">
			<div class="selection-header double-button">
				<span>Unselected</span>
				<button v-if="state.role === 'host'">Lua</button>
				<button v-if="state.role === 'host'">Discord</button></div>
			<PlayerComponent :name="playerName" v-for="playerName of playersOf('unselected')" :role="state.role" :key="playerName" @remove="removePlayer(playerName)" @pick="pickPlayer(playerName)" :turn="state.roleId === state.turn" />
			<form class="selection-node new-player" v-if="state.role === 'host'" @submit.prevent="addPlayer">
				<input v-model="state.newPlayer" type="text" />
				<button @click="addPlayer">ADD</button>
			</form>
		</div>
	</div>
	<div class="match" v-else>
		<span>Please wait...</span>
	</div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';
import { io } from 'socket.io-client';
import { useRoute } from 'vue-router';
import router from '@/router';
import PlayerComponent from '@/components/PlayerComponent.vue';

export default defineComponent({
	components: {
		PlayerComponent
	},
	setup() {
		const state = reactive({
			newPlayer: '',
			role: undefined as undefined | 'captain' | 'host',
			roleId: '',
			captainIds: new Map<string, string>(),
			captainSecrets: new Map<string, string>(),
			players: new Map<string, string>(),
			turn: ''
		});

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

			console.log(captainIds);
		});

		socket.once('permission', permission => state.role = permission);
		socket.once('roleId', roleId => state.roleId = roleId);
		socket.on('picking', turn => state.turn = turn);
		socket.on('newList', (players) => {
			state.players = new Map(players);

			console.log(players);
		});

		socket.emit('selectMatch', useRoute().params.id);
		socket.emit('selectRole', useRoute().params.secret);

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

		function copy(text: string) {
			const textArea = document.createElement('textarea');

			textArea.style.position = 'fixed';
			textArea.style.top = '0';
			textArea.style.left = '0';
			textArea.style.width = '2em';
			textArea.style.height = '2em';
			textArea.style.padding = '0';
			textArea.style.border = 'none';
			textArea.style.outline = 'none';
			textArea.style.boxShadow = 'none';
			textArea.style.background = 'transparent';
			textArea.value = text;

			document.body.appendChild(textArea);

			textArea.focus();
			textArea.select();
			document.execCommand('copy');

			textArea.remove();
		}

		return { state, addPlayer, removePlayer, pickPlayer, playersOf, origin, copy };
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
	grid-template-columns: 1fr 50px;
	gap: 0.4em;
}

.new-player button {
	height: 100%;
	background-color: rgba(255, 255, 255, 0.05);
	border: 0;
	border-radius: 3px;
	color: #fff;
}

.selection-header {
	display: grid;
	grid-template-columns: 1fr 80px 1fr;
	align-items: center;
	height: 35px;
	gap: 0.4em;
}

.selection-header.double-button {
	grid-template-columns: 1fr 80px 80px;
}

.selection-header button {
	height: 100%;
	background-color: rgba(255, 255, 255, 0.05);
	border: 0;
	border-radius: 3px;
	color: #fff;
}

.selection-header input {
	width: 100%;
}

.picking {
	background-color: rgba(255, 255, 255, 0.05);
	padding: 0.25em 0.5em;
	border-radius: 3px;
	margin-left: 0.5em;
}
</style>

<style>
.selection-node {
	background-color: rgba(255, 255, 255, 0.05);
	padding: 5px;
	border-radius: 3px;
}
</style>