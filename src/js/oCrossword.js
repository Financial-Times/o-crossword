/**
 * Initialises an o-crossword components inside the element passed as the first parameter
 *
 * @param {(HTMLElement|string)} [el=document.body] - Element where to search for the o-crossword component. You can pass an HTMLElement or a selector string
 * @returns {OCrossword} - A single OCrossword instance
 */

'use strict';

const Hammer = require('hammerjs');

function buildGrid(
	rootEl,
{
	size,
	gridnums,
	grid,
	clues
}) {
	const tableEl = rootEl.querySelector('table');
	const cluesEl = rootEl.querySelector('ul.o-crossword-clues');
	const {cols, rows} = size;
	let count = 0;
	for (let i=0; i<rows; i++) {
		const tr = document.createElement('tr');
		for (let j=0; j<cols; j++) {
			const td = document.createElement('td');
			tr.appendChild(td);
			if (gridnums[count]) {
				const label = document.createElement('span');
				label.classList.add('o-crossword-gridnum');
				label.textContent = gridnums[count];
				td.appendChild(label);
			}
			if (grid[count] === '.') {
				td.classList.add('empty');
			}
			count++;
		}
		tableEl.appendChild(tr);
	}

	if (clues) {
		const acrossEl = document.createElement('ul');
		acrossEl.classList.add('o-crossword-clues-across');

		const downEl = document.createElement('ul');
		downEl.classList.add('o-crossword-clues-down');

		const acrossWrapper = document.createElement('li');
		const downWrapper = document.createElement('li');

		acrossWrapper.appendChild(acrossEl);
		cluesEl.appendChild(acrossWrapper);

		downWrapper.appendChild(downEl);
		cluesEl.appendChild(downWrapper);

		for (const across of clues.across) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			tempSpan.textContent = across;
			acrossEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		}
		for (const down of clues.down) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			tempSpan.textContent = down;
			downEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		}
	}
}

'use strict';
function OCrossword(rootEl) {
	if (!rootEl) {
		rootEl = document.body;
	} else if (!(rootEl instanceof HTMLElement)) {
		rootEl = document.querySelector(rootEl);
	}
	if (rootEl.getAttribute('data-o-component') === "o-crossword") {
		this.rootEl = rootEl;
	} else {
		this.rootEl = rootEl.querySelector('[data-o-component~="o-crossword"]');
	}

	if (this.rootEl !== undefined) {
		if (this.rootEl.dataset.oCrosswordData) {
			return fetch(this.rootEl.dataset.oCrosswordData)
			.then(res => res.json())
			.then(json => buildGrid(rootEl, json))
			.then(() => this.assemble());
		} else {
			this.assemble();
		}
	}
}

OCrossword.prototype.assemble = function assemble() {
	const tableEl = this.rootEl.querySelector('table');
	const cluesEl = this.rootEl.querySelector('ul.o-crossword-clues');
	if (cluesEl) {
		const cluesUlEls = Array.from(cluesEl.querySelectorAll('ul'));
		const wrapper = document.createElement('div');
		wrapper.classList.add('o-crossword-clues-wrapper');
		const previewEl = cluesEl.cloneNode(true);
		previewEl.classList.add('preview');

		this.rootEl.insertBefore(wrapper, cluesEl);
		wrapper.appendChild(previewEl);
		wrapper.appendChild(cluesEl);

		// TODO: DEBOUNCE!!!
		const onResize = (function onResize() {
			cluesEl.classList.remove('window');
			this.rootEl.classList.remove('collapsable-clues');
			cluesEl.style.opacity = '0';
			const height1 = cluesEl.clientHeight;
			const width1 = cluesEl.clientWidth;
			const height2 = tableEl.clientHeight;
			this._height = height2;
			this._cluesElHeight = height1;
			let scale = height2/height1;
			if (scale > 0.2) scale = 0.2;
			tableEl.style.marginLeft = `${width1 * scale}px`;
			previewEl.style.marginBottom = `${-height1 * (1-scale)}px`;
			previewEl.style.transform = `scale(${scale})`;
			wrapper.style.height = tableEl.height;
			this.rootEl.classList.add('collapsable-clues');
			cluesEl.classList.add('window');
			cluesEl.style.opacity = '';
		}).bind(this);

		this.onResize = onResize;

		this.previewMc = new Hammer.Manager(previewEl, {
			recognizers: [
				[Hammer.Pan, { direction: Hammer.DIRECTION_VERTICAL }],
				[Hammer.Press, { time: 250 }],
				[Hammer.Swipe, { direction: Hammer.DIRECTION_HORIZONTAL }]
			]
		});

		const onPanMove = function onPanMove(e) {
			const proportion = e.center.y/this._height;
			const offset = this._cluesElHeight * proportion;

			for (const li of cluesUlEls) {
				li.style.transform = `translateY(${-offset}px)`;
			}

			cluesEl.style.transform = `translateY(${e.center.y}px)`;
			if (cluesEl.className.indexOf('dragging') === -1) cluesEl.classList.add('dragging');
			if (cluesEl.className.indexOf('window') === -1) cluesEl.classList.add('window');
			if (cluesEl.className.indexOf('expanded') !== -1)cluesEl.classList.remove('expanded');
		}.bind(this);

		const onPanEnd = function onPanEnd() {
			cluesEl.classList.remove('dragging');
			cluesEl.classList.add('window');
			cluesEl.classList.remove('expanded');
			cluesEl.scrollTop = 0;
		}

		this.previewMc.on('press', onPanMove);
		this.previewMc.on('panmove', onPanMove);
		this.previewMc.on('panstart', onPanMove);
		this.previewMc.on('panend', onPanEnd);

		this.addEventListener(this.rootEl, 'click', onPanEnd);

		this.previewMc.on('swiperight', function () {
			cluesEl.classList.remove('dragging');
			cluesEl.classList.remove('window');
			cluesEl.classList.add('expanded');
			cluesEl.style.transform = '';
			for (const li of cluesUlEls) {
				li.style.transform = '';
			}
		});


		onResize.bind(this)();
		this.addEventListener(window, 'resize', onResize);
	}
};

OCrossword.prototype.addEventListener = function(el, type, callback) {
	if (this.listeners === undefined) this.listeners = [];
	this.listeners.push({el, type, callback});
	el.addEventListener(type, callback);
};

OCrossword.prototype.removeAllEventListeners = function() {
	this.listeners.forEach(function remove({el, type, callback}) {
		el.removeEventListener(type, callback);
	});
};

module.exports = OCrossword;
