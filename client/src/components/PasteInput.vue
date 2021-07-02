<template>
	<div class="paste-input" @click="copy">
		<transition name="fade" mode="out-in">
			<i class="las la-check icon" v-if="state.copied"></i>
			<i class="las la-clipboard icon" v-else></i>
		</transition>
		<input class="input" ref="input" type="text" readonly :value="$props.displayText ?? $props.text">
	</div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';

export default defineComponent({
	props: {
		text: {
			type: String,
			required: true
		},
		displayText: {
			type: String,
			required: false
		}
	},
	setup(props) {
		let resetCopied: number;

		const state = reactive({
			copied: false
		});

		const input = ref<HTMLInputElement>();

		function altCopy(text: string) {
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

		function copy() {
			if (props.displayText !== undefined) {
				altCopy(props.text);
			} else {
				const inputValue = input.value!;

				inputValue.focus();
				inputValue.select();
				document.execCommand('copy');
				window.getSelection()?.removeAllRanges();
			}

			if (resetCopied) clearTimeout(resetCopied);
			state.copied = true;
			resetCopied = setTimeout(() => {
				state.copied = false;
			}, 3000);
		}

		return { state, copy, input };
	}
});
</script>

<style scoped>
.paste-input {
	background-color: rgba(255, 255, 255, 0.05);
    color: #fff;
    border: 0;
    padding: 0.5rem 1rem 0.5rem 0.75rem;
    font-size: 14px;
    border-radius: 3px;
	display: grid;
	grid-template-columns: 1rem 1fr;
	gap: 0.5rem;
	height: 2rem;
	cursor: pointer;
}

.icon {
	line-height: 1rem;
}

.input {
	background: transparent;
	padding: 0;
	height: 1rem;
	border-radius: 0;
	cursor: pointer;
	width: 100%;
}
</style>