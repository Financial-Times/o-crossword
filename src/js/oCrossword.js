/**
 * Initialises an o-crossword components inside the element passed as the first parameter
 *
 * @param {(HTMLElement|string)} [el=document.body] - Element where to search for the o-crossword component. You can pass an HTMLElement or a selector string
 * @returns {OCrossword} - A single OCrossword instance
 */

const debounce = require('o-viewport/src/utils').debounce;

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
	const cluesEl = rootEl.querySelector('ul.o-crossword-clues')
	const {cols, rows} = size;
	for (let i=0; i<rows; i++) {
		const tr = document.createElement('tr');
		for (let j=0; j<cols; j++) {
			const td = document.createElement('td');
			tr.appendChild(td);
			if (gridnums[i][j]) {
				td.dataset.oCrosswordNumber = gridnums[i][j];
			}
			if (grid[i][j] === '.') {
				td.classList.add('empty');
			}
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

		clues.across.forEach(function acrossForEach(across) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			const answerLength = across[2].filter(isFinite).filter(isFinite).reduce((a,b)=>a+b,0);
			tempSpan.textContent = across[0] + '. ' + across[1] + ` (${across[2].filter(isFinite).join(', ')})`;
			tempLi.dataset.oCrosswordNumber = across[0];
			tempLi.dataset.oCrosswordAnswerLength = answerLength;
			tempLi.dataset.oCrosswordDirection = 'across';
			acrossEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		});

		clues.down.forEach(function acrossForEach(down) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			const answerLength = down[2].filter(isFinite).filter(isFinite).reduce((a,b)=>a+b,0);
			tempSpan.textContent = down[0] + '. ' + down[1] + ` (${down[2].filter(isFinite).join(', ')})`;
			tempLi.dataset.oCrosswordNumber = down[0];
			tempLi.dataset.oCrosswordAnswerLength = answerLength;
			tempLi.dataset.oCrosswordDirection = 'down';
			downEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
		});
	}

	if (answers) {
		clues.across.forEach(function acrossForEach(across, i) {
			const answer = answers.across[i];
			const answerLength = answer.length;
			getGridCellsByNumber(gridEl, across[0], 'across', answerLength);
			getGridCellsByNumber(gridEl, across[0], 'across', answerLength).forEach((td, i) => {
				td.textContent = answer[i];
			});
		});

		clues.down.forEach(function downForEach(down, i) {
			const answer = answers.down[i];
			const answerLength = answer.length;
			getGridCellsByNumber(gridEl, down[0], 'down', answerLength).forEach((td, i) => {
				td.textContent = answer[i];
			});
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
			if (this.rootEl.dataset.oCrosswordData.startsWith('http')) {
				return fetch(this.rootEl.dataset.oCrosswordData)
				.then(res	=> res.json())
				.then(json => buildGrid(rootEl, json))
				.then(()	 => this.assemble());
			} else { // assume this is json text
				return new Promise((resolve) => resolve( JSON.parse(this.rootEl.dataset.oCrosswordData) ) )
				.then(json => buildGrid(rootEl, json))
				.then(()	 => this.assemble() );
			}
		}
	}
}

function getGridCellsByNumber(gridEl, number, direction, length) {
	const out = [];
	let el = gridEl.querySelector(`td[data-o-crossword-number="${number}"]`);
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

		const gridScaleWrapper = document.createElement('div');
		gridScaleWrapper.classList.add('o-crossword-grid-scale-wrapper');
		gridWrapper.appendChild(gridScaleWrapper);
		gridScaleWrapper.appendChild(gridEl);

		const clueDisplayer = document.createElement('div');
		clueDisplayer.classList.add('o-crossword-clue-displayer');
		gridScaleWrapper.appendChild(clueDisplayer);

		const wrapper = document.createElement('div');
		wrapper.classList.add('o-crossword-clues-wrapper');
		this.rootEl.insertBefore(wrapper, cluesEl);
		wrapper.appendChild(previewEl);
		wrapper.appendChild(cluesEl);

		const magicInput = document.createElement('input');
		gridScaleWrapper.appendChild(magicInput);
		magicInput.classList.add('o-crossword-magic-input');
		let magicInputTargetEl = null;
		let magicInputNextEls = null;
		magicInput.type = 'text';
		magicInput.style.display = 'none';

		this.addEventListener(magicInput, 'keyup', function (e) {
			if (e.keyCode === 13) {
				e.preventDefault();
				magicInputNextEls = null;
				return progress();
			}
			if (
				e.keyCode === 9 ||
				e.keyCode === 40 ||
				e.keyCode === 39 ||
				e.keyCode === 32
			) {
				e.preventDefault();
				return progress();
			}
			if (
				e.keyCode === 37 ||
				e.keyCode === 38
			) {
				e.preventDefault();
				return progress(-1);
			}
			if (
				e.keyCode === 8
			) {
				e.preventDefault();
				return magicInput.value = '';
			}
			progress();
		});

		const progress = debounce(function progress(direction) {
			direction = direction === -1 ? -1 : 1;
			const oldMagicInputEl = magicInputTargetEl;
			if (
				magicInputTargetEl &&
				magicInput.value.match(/^[^\s]/)
			) {
				magicInputTargetEl.textContent = magicInput.value[0];
			}
			magicInputTargetEl = null;
			if (magicInputNextEls) {
				const index = magicInputNextEls.indexOf(oldMagicInputEl);
				if (magicInputNextEls[index + direction]) {
					return takeInput(magicInputNextEls[index + direction], magicInputNextEls);
				}
			}
			magicInputTargetEl = null;
			magicInputNextEls = null;
			magicInput.value = '';
			magicInput.blur();
		}, 16);
		this.addEventListener(magicInput, 'focus', magicInput.select());

		function takeInput(el, nextEls) {

			if (
				magicInputTargetEl &&
				magicInput.value.match(/^[^\s]/)
			) {
				magicInputTargetEl.textContent = magicInput.value[0];
			}

			magicInput.style.display = '';

			const oldClue = currentlySelectedGridItem;
			const clues = gridMap.get(el);
			if (!clues) return;
			currentlySelectedGridItem = clues.find(item => (
				item.direction === oldClue.direction &&
				item.number === oldClue.number &&
				item.answerLength === oldClue.answerLength
			)) || currentlySelectedGridItem;

			Array.from(gridEl.getElementsByClassName('receiving-input')).forEach(el => el.classList.remove('receiving-input'));
			el.classList.add('receiving-input');
			magicInput.value = el.textContent;
			el.textContent = '';
			magicInputTargetEl = el;
			magicInputNextEls = nextEls;
			magicInput.style.left = magicInputTargetEl.offsetLeft + 'px';
			magicInput.style.top = magicInputTargetEl.offsetTop + 'px';
			magicInput.focus();
			magicInput.select();
		}

		const onResize = function onResize() {
			var isMobile = false;
			if (window.innerWidth <= 400) {
				isMobile = true;
			} else if (window.innerWidth > window.innerHeight && window.innerHeight <=400 ) { //rotated phones and small devices, but not iOS
				isMobile = true;
			}

			cluesEl.classList.remove('magnify');
			this.rootEl.classList.remove('collapsable-clues');
			cluesEl.style.opacity = '0';
			const d1 = cluesEl.getBoundingClientRect();
			const d2 = gridEl.getBoundingClientRect();
			const d3 = gridWrapper.getBoundingClientRect();
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

			if(isMobile) {
				previewEl.style.removeProperty('marginBottom');
				previewEl.style.removeProperty('transform');
			} else {
				previewEl.style.marginBottom = `${-height1 * (1-scale)}px`;
				previewEl.style.transform = `scale(${scale})`;
			}

			wrapper.style.height = gridEl.height;
			clueDisplayer.style.width = width2 + 'px';
			this.rootEl.classList.add('collapsable-clues');
			if (cluesEl.className.indexOf('magnify') === -1) cluesEl.classList.add('magnify');
			cluesEl.style.opacity = '';
			this._doFancyBehaviour = window.getComputedStyle(previewEl).display !== 'none' && !isMobile;

			if (this._doFancyBehaviour) {
				cluesEl.style.marginLeft = gridWrapper.style.marginLeft = `${this._previewElWidth}px`;
			} else {
				cluesEl.style.marginLeft = gridWrapper.style.marginLeft = '';
			}


			//update grid size to fill 100% on mobile view
			const fullWidth = Math.min(window.innerHeight, window.innerWidth);
			document.getElementById('main-container').width = fullWidth + 'px !important';
			const gridTDs = gridEl.querySelectorAll('td');
			const gridSize = gridEl.querySelectorAll('tr').length;
			const newTdWidth = parseInt(fullWidth / gridSize);
			const inputEl = document.querySelector('.o-crossword-magic-input');

			console.log(isMobile);
			console.log(fullWidth);
			if(isMobile) {
				for (let i = 0; i < gridTDs.length; i++) {
					let td = gridTDs[i];
					td.style.width = newTdWidth + "px";
					td.style.height = newTdWidth + "px";
					td.style.maxWidth = "initial";
					td.style.minWidth = "initial";
				}
				previewEl.style.width = fullWidth + "px";
				previewEl.style.maxWidth = "initial";
				clueDisplayer.style.width = fullWidth + "px";
				inputEl.style.width = newTdWidth + "px";
				inputEl.style.height = newTdWidth + "px";
				inputEl.style.maxWidth = "initial";
			} else {
				for (let i = 0; i < gridTDs.length; i++) {
					let td = gridTDs[i];
					td.style.removeProperty('width');
					td.style.removeProperty('height');
					td.style.removeProperty('maxWidth');
					td.style.removeProperty('minWidth');
				}
				previewEl.style.removeProperty('width');
				previewEl.style.removeProperty('maxWidth');
				clueDisplayer.style.removeProperty('width');
				inputEl.style.removeProperty('width');
				inputEl.style.removeProperty('height');
				inputEl.style.removeProperty('maxWidth');
			}
			//END update grid size to fill 100% on mobile view

		}.bind(this);

		this.onResize = debounce(onResize, 100);

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
				if (e.relativeCenter.x < this._previewElWidth) {
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
					this._cluesPanHoriz += 8;
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
			magicInput.style.display = 'none';
			setClue(number, direction);
			const els = Array.from(gridEl.querySelectorAll('td[data-o-crossword-highlighted]'));
			for (const o of els) {
				delete o.dataset.oCrosswordHighlighted;
			}
			const gridElsToHighlight = getGridCellsByNumber(gridEl, number, direction, length);
			gridElsToHighlight.forEach(el => el.dataset.oCrosswordHighlighted = direction);
		}

		const onTap = function onTap(e) {
			if (e.target === magicInput) {
				e.target = magicInputTargetEl;
			}
			if (gridEl.contains(e.target)) {
				let cell = e.target;
				while(cell.parentNode) {
					if (cell.tagName === 'TD') {
						break;
					} else {
						cell = cell.parentNode;
					}
				}
				const clues = gridMap.get(cell);
				if (!clues) return;

				// cell.scrollIntoView();

				// iterate through list of answers associated with that cell
				let index = clues.indexOf(currentlySelectedGridItem);

				// if a new item is selected find what ever matches the current selection
				if (index === -1 && currentlySelectedGridItem) {
					const oldClue = currentlySelectedGridItem;
					currentlySelectedGridItem = clues.find(item => (
						item.direction === oldClue.direction &&
						item.number === oldClue.number &&
						item.answerLength === oldClue.answerLength
					));
				}
				if (index !== -1 || !currentlySelectedGridItem) {

					// the same cell has been clicked on again so
					if (index + 1 === clues.length) index = -1;
					currentlySelectedGridItem = clues[index + 1];
				}

				highlightGridByNumber(
					currentlySelectedGridItem.number,
					currentlySelectedGridItem.direction,
					currentlySelectedGridItem.answerLength
				);
				takeInput(cell, getGridCellsByNumber(
					gridEl,
					currentlySelectedGridItem.number,
					currentlySelectedGridItem.direction,
					currentlySelectedGridItem.answerLength
				));
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

				// if the preview is clicked on open it and bring to that point
				// if the box is clicked on highlight that row and close it
				if (previewHit) {
					cluesEl.scrollTop = e.relativeCenter.y / this._scale;
					this._cluesPanHorizTarget = 0;
				} else {
					this._cluesPanHorizTarget = this._cluesPanHorizTarget === 0 ? this._cluesPanHorizStart : 0;
					highlightGridByCluesEl(e.target);
				}
			}
		}.bind(this);

		this.hammerMC = new Hammer.Manager(this.rootEl, {
			recognizers: [
				[Hammer.Tap]//,
		// 		[Hammer.Pan, { direction: Hammer.DIRECTION_ALL }],
		// 		[Hammer.Press, { time: 150 }],
		// 		[Hammer.Swipe, { direction: Hammer.DIRECTION_ALL }]
			]
		});

		this.addEventListener(cluesEl, 'mousemove', e => highlightGridByCluesEl(e.target));

		// this.hammerMC.on('panup pandown swipeup swipedown panstart press', onPanVert);
		// this.hammerMC.on('panleft panright', onPanHoriz);
		// this.hammerMC.on('panend pressup pancancel', onPanEnd);
		this.hammerMC.on('tap', onTap);
		// this.hammerMC.on('hammer.input', function (e) {
		// 	if (!cluesEl.contains(e.target) && !gridWrapper.contains(e.target)) {
		// 		e.preventDefault();
		// 	}
		// });

		this.addEventListener(this.rootEl, 'click', onPanEnd);

		onResize();
		this.addEventListener(window, 'resize', this.onResize);
	}

	if(isiOS()) {
		document.getElementsByTagName('body')[0].className += " iOS";
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
};

module.exports = OCrossword;

function isiOS() {
	var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	return iOS;
}