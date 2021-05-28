<template>
	<router-view/>
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
	font-size: 14px;
	cursor: pointer;
}

button:active {
	opacity: 0.5;
}
</style>
