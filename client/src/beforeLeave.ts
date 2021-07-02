export function beforeLeave(element: HTMLElement) {
	const { marginLeft, marginTop, width, height } = window.getComputedStyle(element);

	element.style.left = `${element.offsetLeft - parseFloat(marginLeft)}px`;
	element.style.top = `${element.offsetTop - parseFloat(marginTop)}px`;
	element.style.width = width;
	element.style.height = height;
}