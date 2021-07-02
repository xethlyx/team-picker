<template>
	<div class="player selection-node">
		<span>{{ $props.name }}</span>
		<button class="remove" @click="$emit('remove')" v-if="$props.role === 'host'"><i class="las la-user-minus"></i></button>
		<button class="pick" @click="$emit('pick')" v-if="$props.role === 'captain' && $props.turn"><i class="las la-user-friends"></i></button>
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
	grid-template-columns: 1fr 2rem;
	grid-template-rows: 1fr;
	font-size: 14px;
}

.player button {
	border: 0;
	border-radius: 3px;
	color: #fff;
	height: 100%;
}

.remove:active, .remove:hover {
	background-color: #e74c3c;
}

.pick:active, .pick:hover {
	background-color: #2ecc71;
}
</style>