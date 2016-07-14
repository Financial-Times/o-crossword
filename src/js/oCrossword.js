/**
 * Initialises an o-crossword components inside the element passed as the first parameter
 *
 * @param {(HTMLElement|string)} [el=document.body] - Element where to search for the o-crossword component. You can pass an HTMLElement or a selector string
 * @returns {OCrossword} - A single OCrossword instance
 */

'use strict';

function prevAll(node) {
	const nodes = Array.from(node.parentNode.children);
	const pos = nodes.indexOf(node);
	return nodes.slice(0, pos);
};

const Hammer = require('hammerjs');
const HORIZ_PAN_SPRING = 0.2;

function buildGrid(
	rootEl,
{
	size,
	gridnums,
	grid,
	clues,
	answers
}) {
	const gridEl = rootEl.querySelector('table');
	const cluesEl = rootEl.querySelector('ul.o-crossword-clues');
	const {cols, rows} = size;
	let count = 0;
	for (let i=0; i<rows; i++) {
		const tr = document.createElement('tr');
		for (let j=0; j<cols; j++) {
			const td = document.createElement('td');
			tr.appendChild(td);
			if (gridnums[count]) {
				td.dataset.oCrosswordNumber = gridnums[count];
			}
			if (grid[count] === '.') {
				td.classList.add('empty');
			}
			count++;
		}
		gridEl.appendChild(tr);
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

		clues.across.forEach(function across(across, i) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			const answerLength = answers.across[i].length;
			tempSpan.textContent = across + ` (${answerLength}) [DEBUG: ${answers.across[i]}]`;
			tempLi.dataset.oCrosswordNumber = Number(across.match(/^(\d+)./)[1]);
			tempLi.dataset.oCrosswordAnswerLength = answerLength;
			tempLi.dataset.oCrosswordDirection = 'across';
			acrossEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		});

		clues.down.forEach(function down(down, i) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			const answerLength = answers.down[i].length;
			tempSpan.textContent = down + ` (${answerLength}) [DEBUG: ${answers.down[i]}]`;
			tempLi.dataset.oCrosswordNumber = Number(down.match(/^(\d+)./)[1]);
			tempLi.dataset.oCrosswordAnswerLength = answerLength;
			tempLi.dataset.oCrosswordDirection = 'down';
			downEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		});
	}
}

function getRelativeCenter(e, el) {
	const bb = el.getBoundingClientRect();
	e.relativeCenter = {
		x: e.center.x - bb.left,
		y: e.center.y - bb.top,
	};
}

'use strict';
function OCrossword(rootEl) {
	if (!rootEl) {
		rootEl = document.body;
	} else if (!(rootEl instanceof HTMLElement)) {
		rootEl = document.querySelector(rootEl);
	}
	if (rootEl.getAttribute('data-o-component') === 'o-crossword') {
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

function getGridCellsByNumber(gridEl, number, direction, length) {
	const out = [];
	let el = gridEl.querySelector(`td[data-o-crossword-number="${number}"]`);
	const els = Array.from(gridEl.querySelectorAll('td[data-o-crossword-highlighted]'));
	for (const o of els) {
		delete o.dataset.oCrosswordHighlighted;
	}
	if (el) {
		if (direction === 'across') {
			while (length--) {
				out.push(el);
				if (length === 0) break;
				el = el.nextElementSibling;
				if (!el) break;
			}
		}
		else if (direction === 'down') {
			const index = prevAll(el).length;
			while (length--) {
				out.push(el);
				if (length === 0) break;
				if (!el.parentNode.nextElementSibling) break;
				el = el.parentNode.nextElementSibling.children[index];
				if (!el) break;
			}
		}
	}
	return out;
}

OCrossword.prototype.assemble = function assemble() {
	const gridEl = this.rootEl.querySelector('table');
	const cluesEl = this.rootEl.querySelector('ul.o-crossword-clues');
	const gridMap = new Map();
	let currentlySelectedGridItem = null;
	for (const el of cluesEl.querySelectorAll('[data-o-crossword-number]')) {
		const els = getGridCellsByNumber(gridEl, el.dataset.oCrosswordNumber,el.dataset.oCrosswordDirection, el.dataset.oCrosswordAnswerLength);
		els.forEach(cell => {
			const arr = gridMap.get(cell) || [];
			arr.push({
				number: el.dataset.oCrosswordNumber,
				direction: el.dataset.oCrosswordDirection,
				answerLength: el.dataset.oCrosswordAnswerLength
			});
			gridMap.set(cell, arr);
		});
	}
	if (cluesEl) {
		const cluesUlEls = Array.from(cluesEl.querySelectorAll('ul'));

		const previewEl = cluesEl.cloneNode(true);
		previewEl.classList.add('preview');

		const gridWrapper = document.createElement('div');
		gridWrapper.classList.add('o-crossword-grid-wrapper');
		this.rootEl.insertBefore(gridWrapper, gridEl);
		gridWrapper.appendChild(gridEl);

		const clueDisplayer = document.createElement('div');
		clueDisplayer.classList.add('o-crossword-clue-displayer');
		gridWrapper.appendChild(clueDisplayer);

		const wrapper = document.createElement('div');
		wrapper.classList.add('o-crossword-clues-wrapper');
		this.rootEl.insertBefore(wrapper, cluesEl);
		wrapper.appendChild(previewEl);
		wrapper.appendChild(cluesEl);

		// TODO: DEBOUNCE!!!
		const onResize = (function onResize() {
			cluesEl.classList.remove('magnify');
			this.rootEl.classList.remove('collapsable-clues');
			cluesEl.style.opacity = '0';
			const d1 = cluesEl.getBoundingClientRect();
			const d2 = gridEl.getBoundingClientRect();
			const width1 = d2.width;
			const height1 = d1.height;
			const width2 = d2.width;
			const height2 = d2.height;
			let scale = height2/height1;
			if (scale > 0.2) scale = 0.2;
			this._cluesElHeight = height1;
			this._previewElWidth = width1 * scale;
			this._height = height1 * scale;
			this._cluesPanHorizTarget = this._cluesPanHoriz = this._cluesPanHorizStart = -(width1 + this._previewElWidth + 20);
			this._scale = scale;
			previewEl.style.marginBottom = `${-height1 * (1-scale)}px`;
			previewEl.style.transform = `scale(${scale})`;
			wrapper.style.height = gridEl.height;
			clueDisplayer.style.width = width2 + 'px';
			this.rootEl.classList.add('collapsable-clues');
			if (cluesEl.className.indexOf('magnify') === -1) cluesEl.classList.add('magnify');
			cluesEl.style.opacity = '';
			this._doFancyBehaviour = window.getComputedStyle(previewEl).display !== 'none';
			if (this._doFancyBehaviour) {
				clueDisplayer.style.marginLeft = cluesEl.style.marginLeft = gridEl.style.marginLeft = `${this._previewElWidth}px`;
			} else {
				clueDisplayer.style.marginLeft = cluesEl.style.marginLeft = gridEl.style.marginLeft = '';
			}
		}).bind(this);

		this.onResize = onResize;

		this._raf = requestAnimationFrame(function animate() {
			this._raf = requestAnimationFrame(animate.bind(this));
			if(!this._doFancyBehaviour) return;
			if (cluesEl.className.indexOf('expanded') !== -1 && !this._isGrabbed) {
				this._cluesPanHoriz = Math.round(this._cluesPanHoriz + (this._cluesPanHorizTarget - this._cluesPanHoriz) * HORIZ_PAN_SPRING);
				cluesEl.style.transform = `translateX(${this._cluesPanHoriz}px)`;
			}
		}.bind(this));

		const onPanVert = function onPanVert(e) {
			if(!this._doFancyBehaviour) return;
			getRelativeCenter(e, previewEl);
			if (e.isFirst || (e.type.indexOf('start') !== -1 && (e.additionalEvent === 'panup' || e.additionalEvent === 'pandown'))){
				if (e.relativeCenter.x < Number(gridEl.style.marginLeft.match(/([0-9.]+)px/)[1])) {
					if (cluesEl.className.indexOf('magnify-drag') === -1) cluesEl.classList.add('magnify-drag');
				}
			}
			if (cluesEl.className.indexOf('magnify-drag') !== -1) {

				if (cluesEl.className.indexOf('magnify') === -1) cluesEl.classList.add('magnify');
				if (cluesEl.className.indexOf('expanded') !== -1) cluesEl.classList.remove('expanded');
				if (cluesEl.scrollTop) cluesEl.scrollTop = 0;
				this._cluesPanHorizTarget = this._cluesPanHorizStart;
				this._isGrabbed = true;

				const hoverEl = document.elementsFromPoint(e.center.x, e.center.y).filter(el => !!el.dataset.oCrosswordNumber)[0];
				if (hoverEl) {
					const number = hoverEl.dataset.oCrosswordNumber;
					const direction = hoverEl.dataset.oCrosswordDirection;
					setClue(number, direction);
					highlightGridByCluesEl(hoverEl);
				}

				e.preventDefault();
				const proportion = (e.relativeCenter.y/this._height);
				const offset = this._cluesElHeight * proportion;

				for (const li of cluesUlEls) {
					li.style.transform = `translateY(${-offset}px)`;
				}

				cluesEl.style.transform = `translateY(${e.relativeCenter.y}px) translateY(-50%)`;
			}
		}.bind(this);

		const onPanHoriz = function onPanHoriz(e) {
			if(!this._doFancyBehaviour) return;
			getRelativeCenter(e, previewEl);
			if (
				cluesEl.contains(e.target) ||
				(e.relativeCenter.x < this._previewElWidth || this._isGrabbed) &&
				Math.abs(e.deltaX) > 20
			) {
				this._isGrabbed = true;
				e.preventDefault();
				if (cluesEl.className.indexOf('magnify-drag') !== -1) cluesEl.classList.remove('magnify-drag');
				if (cluesEl.className.indexOf('magnify') !== -1) cluesEl.classList.remove('magnify');
				if (cluesEl.className.indexOf('expanded') === -1) {
					cluesEl.classList.add('expanded');
					this._cluesElWidth = cluesEl.clientWidth;
				}
				for (const li of cluesUlEls) {
					li.style.transform = '';
				}
				let offset = this._cluesPanHoriz + e.deltaX;
				if (offset + this._cluesElWidth - 5 < e.relativeCenter.x) {
					this._cluesPanHoriz += 4;
					offset = this._cluesPanHoriz + e.deltaX;
				}
				cluesEl.style.transform = `translateX(${offset}px)`;
			}
		}.bind(this);

		const onPanEnd = function onPanEnd(e) {
			if(!this._doFancyBehaviour) return;
			if ( this._isGrabbed && cluesEl.className.indexOf('expanded') !== -1 ) {
				this._cluesPanHoriz = e.deltaX + this._cluesPanHoriz;
				this._isGrabbed = false;
				if (this._cluesPanHoriz > -this._previewElWidth/2) {
					this._cluesPanHorizTarget = 0;
				} else {
					this._cluesPanHorizTarget = this._cluesPanHorizStart;
				}
			} else if (
				this._isGrabbed && cluesEl.className.indexOf('magnify') !== -1
			) {
				this._isGrabbed = false;
				cluesEl.classList.remove('magnify-drag');
				cluesEl.classList.add('magnify');
				cluesEl.classList.remove('expanded');
			}
		}.bind(this);


		function highlightGridByCluesEl(el) {
			while(el.parentNode) {
				if (el.dataset.oCrosswordNumber) {
					highlightGridByNumber(Number(el.dataset.oCrosswordNumber), el.dataset.oCrosswordDirection, el.dataset.oCrosswordAnswerLength);
					return;
				} else {
					el = el.parentNode;
				}
			}
			return false;
		}

		function setClue(number, direction) {
			const el = cluesEl.querySelector(`li[data-o-crossword-number="${number}"][data-o-crossword-direction="${direction}"]`);
			if (el) {
				clueDisplayer.textContent = el.textContent;
				const els = Array.from(cluesEl.getElementsByClassName('has-hover'));
				els.filter(el2 => el2 !== el).forEach(el => el.classList.remove('has-hover'));
				el.classList.add('has-hover');
			}
		}

		function highlightGridByNumber(number, direction, length) {
			setClue(number, direction);
			const els = getGridCellsByNumber(gridEl, number, direction, length);
			els.forEach(el => el.dataset.oCrosswordHighlighted = direction);
		}

		const onTap = function onTap(e) {
			if (gridEl.contains(e.target)) {
				const cell = e.target;
				const clues = gridMap.get(cell);
				if (!clues) return;
				let index = clues.indexOf(currentlySelectedGridItem);
				if (index + 1 === clues.length) index = -1;
				currentlySelectedGridItem = clues[index + 1];
				highlightGridByNumber(
					currentlySelectedGridItem.number,
					currentlySelectedGridItem.direction,
					currentlySelectedGridItem.answerLength
				);
			}
			if(!this._doFancyBehaviour) return;
			const previewHit = previewEl.contains(e.target);
			if (previewHit || cluesEl.contains(e.target)) {
				getRelativeCenter(e, previewEl);
				if (cluesEl.className.indexOf('magnify-drag') !== -1) cluesEl.classList.remove('magnify-drag');
				if (cluesEl.className.indexOf('magnify') !== -1) cluesEl.classList.remove('magnify');
				if (cluesEl.className.indexOf('expanded') === -1) cluesEl.classList.add('expanded');
				for (const li of cluesUlEls) {
					li.style.transform = '';
				}
				this._cluesPanHorizTarget = !previewHit && this._cluesPanHorizTarget === 0 ? this._cluesPanHorizStart : 0 ;
				cluesEl.scrollTop = e.relativeCenter.y / this._scale;
			}
		}.bind(this);

		this.hammerMC = new Hammer.Manager(this.rootEl, {
			recognizers: [
				[Hammer.Tap],
				[Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
				[Hammer.Press, { time: 150 }],
				[Hammer.Swipe, { direction: Hammer.DIRECTION_ALL }]
			]
		});

		this.addEventListener(cluesEl, 'mousemove', e => highlightGridByCluesEl(e.target));
		this.addEventListener(cluesEl, 'click', e => highlightGridByCluesEl(e.target));

		this.hammerMC.on('panup pandown swipeup swipedown panstart press', onPanVert);
		this.hammerMC.on('panleft panright', onPanHoriz);
		this.hammerMC.on('panend pressup pancancel', onPanEnd);
		this.hammerMC.on('tap', onTap);

		this.addEventListener(this.rootEl, 'click', onPanEnd);

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

OCrossword.prototype.destroy = function destroy() {
	this.removeAllEventListeners();
	if (this.hammerMC) this.hammerMC.destroy();
	if (this._raf) cancelAnimationFrame(this._raf);
}

module.exports = OCrossword;
