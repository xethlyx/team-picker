<template>
	<div class="home">
		<h1>Team Selection</h1>
		<p>Live team selection - source code is available on <a href="https://github.com/xethlyx/team-picker">Github</a>.</p>
		<router-link to="/create">
			<button class="create">
				Create new match
			</button>
		</router-link>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'Home'
});
</script>

<style scoped>
.home {
	text-align: center;
}

.home a {
	color: #3498db;
	text-decoration: none;
}

.create {
	height: 100%;
	background-color: rgba(255, 255, 255, 0.05);
	border: 0;
	border-radius: 3px;
	color: #fff;
	padding: 0.5em 1em;
}
</style>