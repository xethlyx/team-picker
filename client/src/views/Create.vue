<template>
	<div class="create">
		<div class="captain-container">
			<transition-group name="list" @before-leave="beforeLeave">
				<div class="no-captain" v-if="state.captains.length === 0" :key="noCaptainSymbol">
					<p>No captains - you must add at least 2 team captains to continue.</p>
				</div>
				<div class="captain-node" v-for="(captain, index) in state.captains" :key="captain">
					<span>{{ captain }}</span>
					<button class="remove-button" @click="state.captains.splice(index, 1)"><i class="las la-user-minus"></i></button>
				</div>
				<form class="add-captain" @submit.prevent="addCaptain" :key="addCaptainSymbol">
					<input type="text" v-model="state.captainName" placeholder="Captain name">
					<button @click="addCaptain"><i class="las la-user-plus"></i></button>
				</form>
				<button class="create-button" @click="create">CREATE</button>
			</transition-group>
		</div>

	</div>
</template>

<script lang="ts">
import router from '@/router';
import { defineComponent, reactive } from 'vue';
import { beforeLeave } from '@/beforeLeave';

export default defineComponent({
	setup() {
		const state = reactive({
			captainName: '',
			captains: [] as Array<string>
		});

		async function create() {
			if (state.captains.length < 2) {
				alert('Not enough captains');
				return;
			}

			const serverResponse = await fetch('/api/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					captains: state.captains
				})
			});

			if (serverResponse.status !== 200) {
				alert('Error');
				return;
			}

			const data: { id: string, secret: string } = await serverResponse.json();
			router.push(`/match/${data.id}/${data.secret}`);
		}

		function addCaptain() {
			if (state.captainName.length === 0) return;

			state.captains.push(state.captainName);
			state.captainName = '';
		}

		const noCaptainSymbol = Symbol();
		const addCaptainSymbol = Symbol();

		return { state, create, addCaptain, beforeLeave, noCaptainSymbol, addCaptainSymbol };
	}
});
</script>

<style scoped>
.create {
	text-align: center;
}

.create button {
	height: 100%;
	border: 0;
	border-radius: 3px;
	color: #fff;
}

.captain-container {
	display: flex;
	flex-direction: column;
	max-width: 30em;
	gap: 0.4em;
	margin: 0.4em auto;
	margin-top: 2rem;
}

.captain-node {
	background-color: rgba(255, 255, 255, 0.05);
	display: grid;
	grid-template-columns: 1fr 2rem;
	padding: 0.25em 0.5em;
	height: 2rem;
	align-items: center;
	text-align: left;
	font-size: 14px;
	border-radius: 3px;
}

.captain-node button {
	height: 100%;
}

.add-captain {
	background-color: rgba(255, 255, 255, 0.05);
	width: 100%;
	margin: 0.4em auto;
	display: grid;
	grid-template-columns: 1fr 2rem;
	padding: 0.4em;
	gap: 0.4em;
	align-items: center;
	height: 3em;
	border-radius: 3px;
}

.add-captain input {
	height: 100%;
	height: 2rem;
}

.add-captain button {
	width: 100%;
	height: 2rem;
	line-height: 2rem;
}

.create-button {
	width: 100%;
	padding: 0.5em 1em;
	margin-top: 1em;
}

.no-captain {
	max-width: 30em;
	gap: 0.4em;
	margin: 1.5em auto;
	font-size: 14px;
}
</style>