<template>
	<div class="create">
		<div class="captain-container">
			<div class="captain-node" v-for="(captain, index) in state.captains" :key="captain">
				<span>{{ captain }}</span>
				<button class="remove-button" @click="state.captains.splice(index, 1)">Remove</button>
			</div>
		</div>

		<form class="add-captain" @submit.prevent="addCaptain">
			<input type="text" v-model="state.captainName" placeholder="Captain name">
			<button @click="addCaptain">ADD</button>
		</form>

		<button class="create-button" @click="create">CREATE</button>
	</div>
</template>

<script lang="ts">
import router from '@/router';
import { defineComponent, reactive } from 'vue';

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

		return { state, create, addCaptain };
	}
});
</script>

<style scoped>
.create {
	text-align: center;
}

.create button {
	height: 100%;
	background-color: rgba(255, 255, 255, 0.05);
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
}

.captain-node {
	background-color: rgba(255, 255, 255, 0.05);
	display: grid;
	grid-template-columns: 1fr 80px;
	padding: 0.25em 0.5em;
	height: 2.25em;
	align-items: center;
	text-align: left;
}

.captain-node button {
	height: 100%;
}

.add-captain {
	background-color: rgba(255, 255, 255, 0.05);
	max-width: 30em;
	margin: 0.4em auto;
	display: grid;
	grid-template-columns: 1fr 80px;
	padding: 0.4em;
	gap: 0.4em;
	align-items: center;
	height: 3em;
}

.add-captain input {
	height: 100%;
}

.add-captain button {
	width: 100%;
}

.create-button {
	width: 20em;
	padding: 0.5em 1em;
	margin-top: 1em;
}
</style>