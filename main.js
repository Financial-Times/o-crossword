/*global require, module*/
const OCrossword = module.exports = require('./src/js/oCrossword');

const constructAll = function() {
	if (OCrossword.disableAutoInit) {
		return;
	}
	[].slice.call(document.querySelectorAll('[data-o-component~="o-crossword"]')).forEach(function (el) {
		new OCrossword(el);
	});

	document.removeEventListener('o.DOMContentLoaded', constructAll);
};
document.addEventListener('o.DOMContentLoaded', constructAll);
document.addEventListener('o.CrosswordDataUpdated', constructAll);