/* eslint-disable no-undef */
const clipboard = new ClipboardJS('.far');
clipboard.on('success', function(e) {
	console.info('Text:', e.text);
	e.clearSelection();
});
const div = document.getElementById('output');
div.addEventListener('click', copy);

function copy() {
	if (!document.getElementById('p')) {
		const p = document.createElement('p');
		div.appendChild(p);
		p.id = 'p';
		p.innerText = 'URL copied successfully!';
	}
}