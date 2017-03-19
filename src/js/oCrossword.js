/**
 * Initialises an o-crossword components inside the element passed as the first parameter
 *
 * @param {(HTMLElement|string)} [el=document.body] - Element where to search for the o-crossword component. You can pass an HTMLElement or a selector string
 * @returns {OCrossword} - A single OCrossword instance
 */

const debounce = require('o-viewport/src/utils').debounce;
const crosswordParser = require('./crossword_parser');

function prevAll(node) {
	const nodes = Array.from(node.parentNode.children);
	const pos = nodes.indexOf(node);
	return nodes.slice(0, pos);
};

function writeErrorsAsClues(rootEl, json) {
	const cluesEl = rootEl.querySelector('ul.o-crossword-clues');

	const explain = document.createElement('li');
	explain.textContent = "Sorry, we failed to understand the details of this crossword for the following reason(s):";

	const errorsList = document.createElement('ul');
	json.errors.forEach(e => {
		const eLine = document.createElement('li');
		eLine.textContent = e;
		errorsList.appendChild(eLine);
	});

	const textLine = document.createElement('li');
	textLine.textContent = "Based on the following spec:";

	const textList = document.createElement('ul');
	json.text.split("\n").forEach( line => {
		const eLine = document.createElement('li');
		eLine.textContent = line;
		textList.appendChild(eLine);
	});

	cluesEl.appendChild(explain);
	cluesEl.appendChild(errorsList);
	cluesEl.appendChild(textLine);
	cluesEl.appendChild(textList);
}

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
			tempSpan.textContent = across[0] + '. ' + across[1];
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
			tempSpan.textContent = down[0] + '. ' + down[1];
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
			/*
				get and parse the crossword data
				- fetch data via url or get from attribute
				- parse, generate data struct
				- render
			*/
			let p = new Promise( (resolve) => {
				if (this.rootEl.dataset.oCrosswordData.startsWith('http')) {
					return fetch(this.rootEl.dataset.oCrosswordData)
								 .then(res => res.text())
								 ;
				} else { // assume this is json text
					resolve( this.rootEl.dataset.oCrosswordData );
				}
			})
			.then(text => crosswordParser(text) )
			.then(specText => JSON.parse(specText) )
			.then( json => {
				if (json.errors){
					console.log(`Found Errors after invoking crosswordParser:\n${json.errors.join("\n")}` );
					writeErrorsAsClues(rootEl, json);
					return Promise.reject("Failed to parse crossword data, so cannot generate crossword display");
				} else {
					return json;
				}
			})
			.then(json => buildGrid(rootEl, json))
			.then(()	 => this.assemble() )
			.catch( reason => console.log("Error caught in OCrossword: ", reason ) )
			;
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
			if (window.innerWidth <= 739) {
				isMobile = true;
			} else if (window.innerWidth > window.innerHeight && window.innerHeight <=739 ) { //rotated phones and small devices, but not iOS
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

			magicInput.style.display = 'none';

			if(isMobile) {
				previewEl.style.removeProperty('margin-bottom');
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
			this.rootEl.width = fullWidth + 'px !important';
			const gridTDs = gridEl.querySelectorAll('td');
			const gridSize = gridEl.querySelectorAll('tr').length;
			const newTdWidth = parseInt(fullWidth / (gridSize + 1) );
			const inputEl = document.querySelector('.o-crossword-magic-input');

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
				clueDisplayer.style.width = (newTdWidth * (gridSize) +1) + "px";
				clueDisplayer.style.marginLeft = "auto";
				clueDisplayer.style.marginRight = "auto";
				gridEl.style.marginLeft = "auto";
				gridEl.style.marginRight = "auto";
				inputEl.style.width = newTdWidth + "px";
				inputEl.style.height = newTdWidth + "px";
				inputEl.style.maxWidth = "initial";
			} else {
				for (let i = 0; i < gridTDs.length; i++) {
					let td = gridTDs[i];
					td.style.removeProperty('width');
					td.style.removeProperty('height');
					td.style.removeProperty('max-width');
					td.style.removeProperty('min-width');
				}
				previewEl.style.removeProperty('width');
				previewEl.style.removeProperty('max-width');
				// clueDisplayer.style.removeProperty('width');
				inputEl.style.removeProperty('width');
				inputEl.style.removeProperty('height');
				inputEl.style.removeProperty('max-width');
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

				// cell.scrollIntoView(); //TODO: this works OK-ish for vertical oriented phones, could be explored

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
		}.bind(this);

		this.hammerMC = new Hammer.Manager(this.rootEl, {
			recognizers: [
				[Hammer.Tap]
			]
		});

		this.addEventListener(cluesEl, 'mousemove', e => highlightGridByCluesEl(e.target));

		this.hammerMC.on('tap', onTap);

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
