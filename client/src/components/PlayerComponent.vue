<template>
	<div class="player selection-node">
		{{ $props.name }}
		<button class="remove" @click="$emit('remove')" v-if="$props.role === 'host'">X</button>
		<button class="remove" @click="$emit('pick')" v-if="$props.role === 'captain' && $props.turn">+</button>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		name: {
			type: String,
			required: true
		},
		role: {
			type: String,
			required: true
		},
		turn: {
			type: Boolean,
			required: true
		}
	},
	emits: ['remove', 'pick']
});
</script>

<style scoped>
.player {
	display: grid;
	grid-template-columns: 1fr 30px;
	height: 30px;
	grid-template-rows: 1fr;
	font-size: 14px;
}

.player button {
	background-color: rgba(255, 255, 255, 0.05);
	border: 0;
	border-radius: 3px;
	color: #fff;
	height: 100%;
}
</style>