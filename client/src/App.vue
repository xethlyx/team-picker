<template>
	<router-view v-slot="{ Component }">
		<transition name="fade" mode="out-in">
			<component :is="Component" />
		</transition>
	</router-view>
</template>

<style>
* {
	box-sizing: border-box;
	font-family: 'Open Sans', sans-serif;
}

*:focus {
	outline: transparent;
}

body, html {
	margin: 0;
	background-color: #171717;
	color: #fff;
	cursor: default;
}

input[type=text] {
	background-color: rgba(255, 255, 255, 0.05);
	color: #fff;
	border: 0;
	padding: 0.5em 1em;
	font-size: 14px;
	border-radius: 3px;
}

button {
	background-color: rgba(255, 255, 255, 0.05);
	font-size: 14px;
	cursor: pointer;
	transition: background-color 0.1s ease-in-out;
}

button:hover {
	background-color: rgba(255, 255, 255, 0.1);
}

button:active {
	background-color: rgba(255, 255, 255, 0.025);
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.list-enter-active,
.list-leave-active {
	transition: all 0.25s ease;
}
.list-leave-active {
	position: absolute;
}
.list-move {
	transition: all 0.25s ease;
}
.list-enter-from,
.list-leave-to {
	opacity: 0;
}
</style>
