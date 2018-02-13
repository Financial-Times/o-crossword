/**
 * Initialises an o-crossword components inside the element passed as the first parameter
 *
 * @param {(HTMLElement|string)} [el=document.body] - Element where to search for the o-crossword component. You can pass an HTMLElement or a selector string
 * @returns {OCrossword} - A single OCrossword instance
 */

const debounce = require('o-viewport/src/utils').debounce;
const crosswordParser = require('./crossword_parser');
const oTracking = require('o-tracking');

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

function buildGrid(
	rootEl,
{
	size,
	name,
	gridnums,
	grid,
	clues,
	answers
}) {
	const gridEl = rootEl.querySelector('table');
	const cluesEl = rootEl.querySelector('ul.o-crossword-clues');
	const {cols, rows} = size;
	const emptyCell = rootEl.querySelector('.empty-fallback');
	let answerStore, isStorage;
	const cookie = 'FT-crossword_' + name.split(/[ ,]+/).join('');

	expireStorage();

	if(!answers) {
		if(localStorage.getItem(cookie)) {
			answerStore = JSON.parse(localStorage.getItem(cookie));
			isStorage = true;
		} else {
			answerStore = {
				"across": [],
				"down": [],
				"timestamp": Date.now()
			}

			isStorage = false;
		}
	}

	for (let i=0; i<rows; i++) {
		const tr = document.createElement('tr');
		tr.setAttribute('data-tr-index', i);
		for (let j=0; j<cols; j++) {
			const td = document.createElement('td');
			tr.appendChild(td);
			if (gridnums[i][j]) {
				td.dataset.oCrosswordNumber = gridnums[i][j];
			}
			if (grid[i][j] === '.') {
				td.classList.add('empty');
				const emptyMarker = emptyCell.cloneNode(true);
				emptyMarker.classList.remove('hidden');
				emptyMarker.setAttribute('aria-hidden', true);
				td.appendChild(emptyMarker);
			}
		}
		gridEl.appendChild(tr);
	}

	rootEl.parentElement.setAttribute('data-o-crossword-title', name);
	rootEl.setAttribute('data-answer-version', !!answers);

	if (clues) {
		rootEl.parentElement.setAttribute('data-o-crossword-clue-length', clues.across.length + clues.down.length);

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

		clues.across.forEach(function acrossForEach(across, index) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			const tempPartial = document.createElement('div');
			tempLi.setAttribute('tabindex', 0);
			tempPartial.classList.add('o-crossword-user-answer');

			const answerLength = across[2].filter(isFinite).filter(isFinite).reduce((a,b)=>a+b,0);
			tempSpan.innerHTML = across[0] + '<span class="sr-direction" aria-hidden=false>across</span>' + '. ' + across[1] + ' <span class="sr-answer" aria-hidden=false></span> <span class="sr-instruction" aria-hidden=false>Press ENTER to complete your answer</span>';
			tempLi.dataset.oCrosswordNumber = across[0];
			tempLi.dataset.oCrosswordAnswerLength = answerLength;
			tempLi.dataset.oCrosswordDirection = 'across';
			tempLi.dataset.oCrosswordClueId = index;


			for(var i = 0; i < answerLength; ++i) {
				let tempInput = document.createElement('input');
				tempInput.setAttribute('maxlength', 1);
				tempInput.setAttribute('data-link-identifier', 'A' + across[0] + '-' + i);
				tempInput.setAttribute('tabindex', -1);
				if(answers) {
					let val = (answers.across[index][i] === '*')?'':answers.across[index][i];
					tempInput.value = val;
				}

				if(answerStore) {
					if(isStorage) {
						let val = (answerStore.across[index][i] === '*')?'':answerStore.across[index][i];
						tempInput.value = val;
					} else {
						if(answerStore.across[index] === undefined) {
							answerStore.across[index] = '';
						}
						answerStore.across[index] += '*';
					}
				}

				let count = 0;

				if(across[3].length > 1) {
					for(var j = 0; j < across[3].length; ++j) {
						if(j%2 === 1) {
							count += parseInt(across[3][j-1]);
							let separator = document.createElement('span');
							separator.classList.add('separator');

							if(across[3][j] === '-') {
								separator.innerHTML = '&mdash;';
							} else if(across[3][j] === ',') {
								separator.innerHTML = '&nbsp;';
							}
							
							if(i === count && separator.innerHTML !== '') {
								tempPartial.appendChild(separator);
							}
						}
					}
				}

				tempPartial.appendChild(tempInput);
			}

			if(answerStore && !(/^[*,\-]+$/).test(answerStore.across[index])) {
				let srAnswer = answerStore.across[index];
				srAnswer = srAnswer.split('*').join(' blank ');
				tempSpan.querySelector('.sr-answer').textContent = 'Your answer: ' + srAnswer + '.';	
			}

			acrossEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
			tempLi.appendChild(tempPartial);
		});

		clues.down.forEach(function acrossForEach(down, index) {
			const tempLi = document.createElement('li');
			const tempSpan = document.createElement('span');
			const tempPartial = document.createElement('div');
			tempLi.setAttribute('tabindex', 0);
			tempPartial.classList.add('o-crossword-user-answer');

			const answerLength = down[2].filter(isFinite).filter(isFinite).reduce((a,b)=>a+b,0);
			tempSpan.innerHTML = down[0] + '<span class="sr-direction" aria-hidden=false>down</span>' + '. ' + down[1] + ' <span class="sr-answer" aria-hidden=false></span> <span class="sr-instruction" aria-hidden=false>Press ENTER to complete your answer</span>';
			tempLi.dataset.oCrosswordNumber = down[0];
			tempLi.dataset.oCrosswordAnswerLength = answerLength;
			tempLi.dataset.oCrosswordDirection = 'down';
			tempLi.dataset.oCrosswordClueId = clues.across.length + index;

			for(var i = 0; i < answerLength; ++i) {
				let tempInput = document.createElement('input');
				tempInput.setAttribute('maxlength', 1);
				tempInput.setAttribute('data-link-identifier', 'D' + down[0] + '-' + i);
				tempInput.setAttribute('tabindex', -1);

				if(answers) {
					let val = (answers.down[index][i] === '*')?'':answers.down[index][i];
					tempInput.value = val;
				}

				if(answerStore) {
					if(isStorage) {
						let val = (answerStore.down[index][i] === '*')?'':answerStore.down[index][i];
						tempInput.value = val;
					} else {
						if(answerStore.down[index] === undefined) {
							answerStore.down[index] = '';
						}
						answerStore.down[index] += '*';
					}
				}

				let count = 0;

				if(down[3].length > 1) {
					for(var j = 0; j < down[3].length; ++j) {
						if(j%2 === 1) {
							count += parseInt(down[3][j-1]);
							let separator = document.createElement('span');
							separator.classList.add('separator');

							if(down[3][j] === '-') {
								separator.innerHTML = '&mdash;';
							} else if(down[3][j] === ',') {
								separator.innerHTML = '&nbsp;';
							}

							if(i === count && separator.innerHTML !== '') {
								tempPartial.appendChild(separator);
							}
						}
					}
				}

				tempPartial.appendChild(tempInput);
			}

			if(answerStore && !(/^[*,\-]+$/).test(answerStore.down[index])) {
				let srAnswer = answerStore.down[index];
				srAnswer = srAnswer.split('*').join(' blank ');
				tempSpan.querySelector('.sr-answer').textContent = 'Your answer: ' + srAnswer + '.';	
			}

			downEl.appendChild(tempLi);
			tempLi.appendChild(tempSpan);
			tempLi.appendChild(tempPartial);
		});
	}

	if (answers || answerStore) {
		let target = (answers)?answers:answerStore;
		clues.across.forEach(function acrossForEach(across, i) {
			const answer = target.across[i];
			const answerLength = answer.length;
			getGridCellsByNumber(gridEl, across[0], 'across', answerLength).forEach((td, i) => {
				let val = (answer[i] === '*')?'':answer[i];
				td.textContent = val;
			});
		});

		clues.down.forEach(function downForEach(down, i) {
			const answer = target.down[i];
			const answerLength = answer.length;
			getGridCellsByNumber(gridEl, down[0], 'down', answerLength).forEach((td, i) => {
				let val = (answer[i] === '*')?'':answer[i];
				td.textContent = val;
			});
		});
	}

	if(answerStore) {
		rootEl.setAttribute('data-storage', JSON.stringify(answerStore));
		rootEl.setAttribute('data-storage-id', cookie);
	}
}

function expireStorage() {
	const ts = Date.now();

	for (let i = 0; i < localStorage.length; i++){
	    if (localStorage.key(i).substring(0,12) == 'FT-crossword') {
	    	let storedItem = JSON.parse(localStorage.getItem(localStorage.key(i)));
	    	let difference = ts - storedItem.timestamp;

	    	let daysCreated = difference/1000/60/60/24;

	    	if(daysCreated > 28) {
	    		localStorage.removeItem(localStorage.key(i));
	    	}
	    }
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
						.then(res => resolve(res.text()));
				} else { // assume this is yaml text
					resolve( this.rootEl.dataset.oCrosswordData );
				}
			})
			.then(text => crosswordParser.intoSpecJson(text))
			.then(specText => JSON.parse(specText) )
			.then( json => {
				if (json.errors){
					console.log(`Found Errors after invoking crosswordParser.intoSpecJson:\n${json.errors.join("\n")}` );
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

function getLetterIndex(gridEl, cell, number, direction) {
	let el = gridEl.querySelector(`td[data-o-crossword-number="${number}"]`);

	if(direction === 'across') {
		return cell.cellIndex - el.cellIndex;
	} else if (direction === 'down'){
		return parseInt(cell.parentNode.getAttribute('data-tr-index')) - parseInt(el.parentNode.getAttribute('data-tr-index'));
	}

	return;
}

OCrossword.prototype.assemble = function assemble() {
	const gridEl = this.rootEl.querySelector('table');
	const cluesEl = this.rootEl.querySelector('ul.o-crossword-clues');
	const gridMap = new Map();
	for (const el of cluesEl.querySelectorAll('[data-o-crossword-number]')) {
		const els = getGridCellsByNumber(gridEl, el.dataset.oCrosswordNumber,el.dataset.oCrosswordDirection, el.dataset.oCrosswordAnswerLength);
		Array.from(els).forEach(cell => {
			const arr = gridMap.get(cell) || [];
			arr.push({
				number: el.dataset.oCrosswordNumber,
				direction: el.dataset.oCrosswordDirection,
				answerLength: el.dataset.oCrosswordAnswerLength,
				answerPos: getLetterIndex(gridEl, cell, el.dataset.oCrosswordNumber, el.dataset.oCrosswordDirection)
			});

			gridMap.set(cell, arr);
		});
	}

	let currentlySelectedGridItem = null;	
	let answerStore = JSON.parse(this.rootEl.getAttribute('data-storage'));
	const isAnswerVersion = JSON.parse(this.rootEl.getAttribute('data-answer-version'));


	if (cluesEl) {
		let currentClue = -1;
		const cluesTotal = parseInt(this.rootEl.parentElement.getAttribute('data-o-crossword-clue-length')) - 1;

		const cluesUlEls = Array.from(cluesEl.querySelectorAll('ul'));

		const gridWrapper = document.createElement('div');
		gridWrapper.classList.add('o-crossword-grid-wrapper');
		this.rootEl.insertBefore(gridWrapper, gridEl);

		const gridScaleWrapper = document.createElement('div');
		gridScaleWrapper.classList.add('o-crossword-grid-scale-wrapper');
		gridWrapper.appendChild(gridScaleWrapper);
		gridScaleWrapper.appendChild(gridEl);

		const clueDisplayer = document.createElement('div');
		clueDisplayer.classList.add('o-crossword-clue-displayer');
		cluesEl.appendChild(clueDisplayer);

		const clueDisplayerText = document.createElement('span');
		clueDisplayer.appendChild(clueDisplayerText);

		const clueNavigation = document.createElement('nav');
		clueNavigation.classList.add('o-crossword-clue-navigation');

		const clueNavigationPrev = document.createElement('a');
		clueNavigationPrev.classList.add('o-crossword-clue-nav-prev');
		clueNavigationPrev.setAttribute('href', '#');
		clueNavigationPrev.setAttribute('aria-hidden', false);
		clueNavigationPrev.textContent = 'Previous';
		clueNavigation.appendChild(clueNavigationPrev);

		const clueNavigationNext = document.createElement('a');
		clueNavigationNext.classList.add('o-crossword-clue-nav-next');
		clueNavigationNext.setAttribute('href', '#');
		clueNavigationNext.setAttribute('aria-hidden', true);
		clueNavigationNext.textContent = 'Next';
		clueNavigation.appendChild(clueNavigationNext);

		clueDisplayer.appendChild(clueNavigation);

		const wrapper = document.createElement('div');
		wrapper.classList.add('o-crossword-clues-wrapper');
		this.rootEl.insertBefore(wrapper, cluesEl);
		wrapper.appendChild(cluesEl);

		const magicInput = document.createElement('input');
		gridScaleWrapper.appendChild(magicInput);
		magicInput.classList.add('o-crossword-magic-input');
		let magicInputTargetEl = null;
		let magicInputNextEls = null;
		magicInput.type = 'text';
		magicInput.style.display = 'none';

		let blockHighlight = false;
		let previousClueSelection = null;
		let isTab = false;
		let isMobile = false;
		let isGridView = true;
		let isSingleColumnView = true;

		if(localStorage.getItem('FT-crossword_view')) {
			isGridView = JSON.parse(localStorage.getItem('FT-crossword_view'));
		}

		if(localStorage.getItem('FT-crossword_columns')) {
			isSingleColumnView = JSON.parse(localStorage.getItem('FT-crossword_columns'));
		}

		initTracking(this.rootEl.parentElement.getAttribute('data-o-crossword-title'), isGridView, isSingleColumnView);

		const buttonRow = document.createElement('div');
		buttonRow.classList.add('o-crossword-button-row');
		this.rootEl.insertBefore(buttonRow, wrapper);			

		const resetButton = document.createElement('button');
		resetButton.classList.add('o-crossword-reset', 'o-buttons', 'o-buttons--mono');
		if(answersEmpty() || isAnswerVersion) {
			resetButton.classList.add('hidden');
		}
		resetButton.textContent = 'Clear all';

		this.addEventListener(resetButton, 'click', clearAnswers);
		buttonRow.appendChild(resetButton);

		const toggleViewButtonAboveGrid = document.createElement('button');
		toggleViewButtonAboveGrid.classList.add('o-crossword-mobile-toggle', 'o-buttons', 'o-buttons--mono');
		toggleViewButtonAboveGrid.textContent = isGridView?'List view':'Grid view';

		this.addEventListener(toggleViewButtonAboveGrid, 'click', toggleMobileViews);
		this.rootEl.insertBefore(toggleViewButtonAboveGrid, gridWrapper);

		const toggleViewButtonTop = document.createElement('button');
		toggleViewButtonTop.classList.add('o-crossword-mobile-toggle', 'o-buttons', 'o-buttons--mono');
		toggleViewButtonTop.textContent = isGridView?'List view':'Grid view';

		this.addEventListener(toggleViewButtonTop, 'click', toggleMobileViews);
		buttonRow.appendChild(toggleViewButtonTop);	
		
		const toggleColumnsButton = document.createElement('button');
		toggleColumnsButton.classList.add('o-crossword-mobile-toggle', 'o-buttons', 'o-buttons--mono');
		toggleColumnsButton.textContent = isSingleColumnView?'2 col':'1 col';

		this.addEventListener(toggleColumnsButton, 'click', toggleColumnView);
		buttonRow.appendChild(toggleColumnsButton);	

		const toggleViewButtonBottom = document.createElement('button');
		toggleViewButtonBottom.classList.add('o-crossword-mobile-toggle', 'o-buttons', 'o-buttons--mono');
		toggleViewButtonBottom.textContent = isGridView?'List view':'Grid view';

		this.addEventListener(toggleViewButtonBottom, 'click', toggleMobileViews);
		this.rootEl.appendChild(toggleViewButtonBottom, wrapper);

		function constructInputIdentifier(data, direction) {
			let identifier;

			for(let i = 0; i < data.length; ++i) {
				if(data[i].direction !== direction) {
					identifier = data[i].direction.slice(0,1).toUpperCase();
					identifier += data[i].number;
					identifier += '-';
					identifier += data[i].answerPos;
				}
			}

			return identifier;
		}


		this.addEventListener(magicInput, 'keydown', function (e) {
			if (!isAndroid()) {
				e.preventDefault();
			}

			if(e.shiftKey && e.keyCode === 9) {
				isTab = true;
				return clueNavigationPrev.click();
			}

			if (e.keyCode === 13) { //enter
				magicInputNextEls = null;
				return progress();
			}

			if (e.keyCode === 9) { //tab
				isTab = true;
				return clueNavigationNext.click();
			}

			if (
				e.keyCode === 40 ||//down
				e.keyCode === 39 ||//right
				e.keyCode === 32 //space
			) {
				return progress();
			}
			if (
				e.keyCode === 37 || //left
				e.keyCode === 38 //up
			) {
				return progress(-1);
			}

			if (
				e.keyCode === 8 //backspace
			) {
				magicInput.value = '';
				return progress(-1);
			}

			if( e.keyCode === 16 || //shift
				e.keyCode === 20 || //caps lock
				e.keyCode === 91 	//Command
			) {
				return;
			}

			if((e.keyCode >= 65 && e.keyCode <= 90) || isAndroid()) {
				if(!isAndroid()) {
					magicInput.value = String.fromCharCode(e.keyCode);

					let last = gridMap.get(magicInputTargetEl);
					Array.from(last).forEach(cell => {
						if(parseInt(cell.answerLength) - cell.answerPos === 1) {
							e.target.select();
						}
					}); //a11y fix for screen reader
				}

				const clueId = currentlySelectedGridItem.direction[0].toUpperCase() + currentlySelectedGridItem.number;
				trackEvent({action: 'gridInput', clueId: clueId, letterId: currentlySelectedGridItem.answerPos});

				progress();
			} else {
				return;
			}
		});

		this.addEventListener(cluesEl, 'keydown', function(e){
			let timer = 0;

			if (!isAndroid()) {
				e.preventDefault();

				if(!isTouch()) {
					timer = 10;
				}
			}

			if(e.target.nodeName !== 'INPUT') {
				if(e.keyCode === 9) {
					if(e.shiftKey) {
						--currentClue;
						if(currentClue < 0) {
							currentClue = cluesTotal;
						}
					} else {
						++currentClue;
						if(currentClue > cluesTotal) {
							currentClue = 0;
						}
					}

					let nextFocus = cluesEl.querySelector('li[data-o-crossword-clue-id="'+ currentClue +'"]');
					nextFocus.focus();
				}

				if(e.keyCode === 13) {
					let inputs = e.target.querySelectorAll('input');
					Array.from(inputs).forEach(input => {
						input.setAttribute('tabindex', 1);
					});

					inputs[0].focus();
				}

				return;
			}
			
			if(e.shiftKey && e.keyCode === 9) {
				return nextInput(e.target, -1);
			}

			if (e.keyCode === 13) { //enter
				return;
			}

			if (
				e.keyCode === 9 || //tab
				e.keyCode === 40 ||//down
				e.keyCode === 39 ||//right
				e.keyCode === 32 //space
			) {
				return nextInput(e.target, 1);
			}
			if (
				e.keyCode === 37 || //left
				e.keyCode === 38 //up
			) {
				return nextInput(e.target, -1);
			}

			if (
				e.keyCode === 8 //backspace
			) {
				setTimeout(function(){
					e.target.value = '';
					nextInput(e.target, -1);
					updateInBackground(e);
				}, timer);
				
				return;
			}

			if( e.keyCode === 16 || //shift
				e.keyCode === 20 || //caps lock
				e.keyCode === 91 	//Command
			) {
				return;
			}

			if((e.keyCode >= 65 && e.keyCode <= 90) || isAndroid()) {

				if(!isAndroid()) {
					e.target.value = String.fromCharCode(e.keyCode);
				}

				e.target.select();
				
				const identifier = e.target.getAttribute('data-link-identifier').split('-');
				trackEvent({action: 'clueInput', clueId: identifier[0], letterId: identifier[1]});

				setTimeout(function(){
					nextInput(e.target, 1);
					updateInBackground(e);
				}, timer);

				
			} else {
				return;
			}
		});

		function updateInBackground(e) {
			getCellFromClue(e.target, gridSync => {
				gridSync.grid.textContent = e.target.value;

				if(!!gridSync.defSync) {
					let defSync = cluesEl.querySelector('input[data-link-identifier="' + gridSync.defSyncInput +'"]');
					defSync.value = e.target.value;
				}

				updateScreenReaderAnswer(e.target, gridSync);
			});	
		}

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
				syncPartialClue(magicInput.value, magicInputNextEls, index);
				if (magicInputNextEls[index + direction]) {
					return takeInput(magicInputNextEls[index + direction], magicInputNextEls);
				}
			}

			unsetClue(magicInputNextEls.length, direction);
			magicInputNextEls = null;
			magicInput.value = '';
			blockHighlight = false;
		}, 16);

		this.addEventListener(magicInput, 'focus', magicInput.select());

		const clueInputs = cluesEl.querySelectorAll('input');
		this.addEventListener(clueInputs, 'focus', function(e){
			magicInput.value ='';
			magicInput.style.display = 'none';

			let def = e.target.parentElement.parentElement;
			let targetClue = {
				'number': def.getAttribute('data-o-crossword-number'),
				'direction': def.getAttribute('data-o-crossword-direction'),
				'answerLength': def.getAttribute('data-o-crossword-answer-length')

			};

			previousClueSelection = targetClue;

			if(!def.classList.contains('has-hover')) {
				highlightGridByNumber(targetClue.number, targetClue.direction, targetClue.answerLength);
			}
		});

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

		function nextInput(source, direction) {
			let inputID = source.getAttribute('data-link-identifier');
			let inputGroup = document.querySelectorAll('input[data-link-identifier^="' + inputID.split('-')[0] +'-"]');
			let currentInput = inputID.split('-')[1];
			let newInput = (direction === 1)?++currentInput:--currentInput;

			if(newInput >= 0 && newInput < inputGroup.length) {
				let next = cluesEl.querySelector('input[data-link-identifier="' + inputID.split('-')[0] +'-'+ newInput+'"]');
				next.focus();
				next.select();
			} else {
				source.blur();
				let def = source.parentElement.parentElement;
				let inputs = cluesEl.querySelectorAll('input');
				Array.from(inputs).forEach(input => {
					input.setAttribute('tabindex', -1);
				});

				if(!isMobile) {
					def.click();
					if(direction === 1) {
						++currentClue;
						if(currentClue > cluesTotal) {
							currentClue = 0;
						}
					}

					let nextFocus = cluesEl.querySelector('li[data-o-crossword-clue-id="'+ currentClue +'"]');
					nextFocus.focus();

				} else {
					isTab = false;
				}
			}
		}

		function highlightGridByCluesEl(el) {
			if (blockHighlight) {
				return;
			}

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

		function getCellFromClue(clue, callback) {
			const inputIdentifier = clue.getAttribute('data-link-identifier');
			const defDirection = (inputIdentifier.slice(0,1) === 'A')?'across':'down';
			const defNum = inputIdentifier.slice(1,inputIdentifier.length).split('-')[0];
			const defIndex = parseInt(inputIdentifier.split('-')[1]);

			let selectedCell = {};

			for(const entry of gridMap) {
				let cellData = entry[1];
				for(let i = 0; i < cellData.length; ++i) {
					if(
						cellData[i].direction === defDirection &&
						parseInt(cellData[i].number) === parseInt(defNum) &&
						parseInt(cellData[i].answerPos) === parseInt(defIndex)
					) {
						selectedCell.grid = entry[0];
						if(cellData.length > 1) {
							selectedCell.defSyncInput = constructInputIdentifier(cellData, defDirection);
							selectedCell.defSync = (selectedCell.defSyncInput !== undefined);
						}
					}
				}
			}

			callback(selectedCell);
		}

		function setClue(number, direction) {
			const el = cluesEl.querySelector(`li[data-o-crossword-number="${number}"][data-o-crossword-direction="${direction}"]`);
			if (el) {
				el.classList.add('featured');
				clueDisplayerText.innerHTML = el.querySelector('span').innerHTML;
				clueDisplayer.style.height = clueDisplayerText.clientHeight + 50 +'px';
				const els = Array.from(cluesEl.getElementsByClassName('has-hover'));
				els.filter(el2 => el2 !== el).forEach(el => {
					el.classList.remove('has-hover');
					el.classList.remove('featured');
					el.style.height = 'auto';
				});
				el.classList.add('has-hover');
				el.querySelector('.o-crossword-user-answer').style.top = clueDisplayerText.clientHeight + 'px';
				currentClue = parseInt(el.getAttribute('data-o-crossword-clue-id'));

				if(isCSSMobile(clueDisplayer)) {
					onResize(false);
				}
			}
		}

		function unsetClue(number, direction) {
			const el = cluesEl.querySelector(`li[data-o-crossword-number="${number}"][data-o-crossword-direction="${direction}"]`);
			const els = Array.from(gridEl.querySelectorAll('td[data-o-crossword-highlighted]'));

			for (const o of els) {
				delete o.dataset.oCrosswordHighlighted;
			}

			if (el) {
				clueDisplayerText.innerHTML = '';
				const els = Array.from(cluesEl.getElementsByClassName('has-hover'));
				els.forEach(el => {
					el.classList.remove('has-hover');
					el.classList.remove('featured');
				});
				el.classList.remove('has-hover');
			}

			magicInput.blur();
			magicInput.style.display = 'none';
		}

		function toggleClueSelection(clue) {
			if (previousClueSelection !== null && isEquivalent(previousClueSelection, clue)) {
				unsetClue(clue.number, clue.direction);
				blockHighlight = false;
				previousClueSelection = null;
				return false;
			}

			blockHighlight = true;
			previousClueSelection = clue;

			return true;
		}

		function updateScreenReaderAnswer(target, dataGrid) {
			const targetData = target.parentNode.parentNode;
			const answerLength = parseInt(targetData.getAttribute('data-o-crossword-answer-length'));
			const inputs = targetData.querySelectorAll('input');
			const screenReaderAnswer = targetData.querySelector('.sr-answer');
			let answerValue = [];
			let filledCount = 0;

			Array.from(inputs).forEach(input => {
				if(input.value !== '') {
					++filledCount;
					answerValue.push(input.value);
				} else {
					answerValue.push("*");
				}
			});

			if(answerStore) {
				const dir = targetData.getAttribute('data-o-crossword-direction');
				const offset = (dir === 'down')?cluesEl.querySelector('.o-crossword-clues-across').childElementCount:0;
				const targetIndex = parseInt(targetData.getAttribute('data-o-crossword-clue-id')) - offset;
				answerStore[dir][targetIndex] = answerValue.join('');

				saveLocal();

				if(answersEmpty() || isAnswerVersion) {
					resetButton.classList.add('hidden');
				} else {
					resetButton.classList.remove('hidden');
				}
			}

			let combineCount = 0;
			let combinedValue = [];

			for(let i = 0; i < answerValue.length; ++i) {
				if(answerValue[i] === '*') {
					++combineCount;
					if((i < answerValue.length - 1 && answerValue[i + 1] !== '*') || i === answerValue.length - 1) {
						if(combineCount > 1) {
							combinedValue.push(" " + combineCount + " blanks ");
						} else {
							combinedValue.push(" blank ");
						}
					}
				} else {	
					combineCount = 0;
					combinedValue.push(answerValue[i]);
				}
			}

			if(filledCount > 0) {
				screenReaderAnswer.textContent = 'Your Answer: ' + combinedValue.join('') + '.';
			} else {
				screenReaderAnswer.textContent = '';
			}

			if(dataGrid && dataGrid.defSync) {
				let syncTarget = cluesEl.querySelector('input[data-link-identifier=' + dataGrid.defSyncInput + ']');
				updateScreenReaderAnswer(syncTarget);
			}
		}

		function syncPartialClue(letter, src, index) {
			const gridItems = gridMap.get(src[index]);
			let targets = [];
			for(let i = 0; i < gridItems.length; ++i) {
				let linkName = gridItems[i].direction[0].toUpperCase() + gridItems[i].number + '-' + gridItems[i].answerPos;
				targets.push(cluesEl.querySelector('input[data-link-identifier="'+linkName+'"]'));
			}

			Array.from(targets).forEach((target) => {
				target.value = letter.substr(0,1);
				updateScreenReaderAnswer(target);
			});
		}

		const saveLocal = function saveLocal() {
			try {
				let answerStoreID = this.rootEl.getAttribute('data-storage-id');
				localStorage.setItem(answerStoreID, JSON.stringify( answerStore ) );
			} catch(err){
				console.log('Error trying to save state', err);
			}
		}.bind(this);

		function clearAnswers(e) {
			trackEvent({action: 'clearAnswers'});

			resetButton.classList.add('hidden');
			let inputs = cluesEl.querySelectorAll('input');
			let cells = gridEl.querySelectorAll('td:not(.empty)');

			Array.from(inputs).forEach(input => {
				input.value = '';
			});

			Array.from(cells).forEach(cell => {
				cell.textContent = '';
			});

			try {
				let answerStoreID = this.parentElement.parentElement.getAttribute('data-storage-id');
				localStorage.removeItem(answerStoreID);
			} catch(err){
				console.log('Error trying to save state', err);
			}
		}

		function toggleMobileViews(e) {
			isGridView = !isGridView;

			trackEvent({action: 'viewToggle', view: isGridView?'grid':'list'});

			let buttonText = isGridView?'List view':'Grid view';
			toggleViewButtonAboveGrid.textContent = buttonText;			
			toggleViewButtonTop.textContent = buttonText;
			toggleViewButtonBottom.textContent = buttonText;

			if (isGridView) {
				toggleColumnsButton.classList.add('visually_hidden');
				toggleViewButtonBottom.classList.add('visually_hidden');						
			} else {
				toggleColumnsButton.classList.remove('visually_hidden');				
				toggleViewButtonBottom.classList.remove('visually_hidden');									
			}

			onResize(false);

			try {
				localStorage.setItem('FT-crossword_view', isGridView );
			} catch(err){
				console.log('Error trying to save state', err);
			}
		}

		function toggleColumnView(e) {
			isSingleColumnView = !isSingleColumnView;

			trackEvent({action: 'columnToggle', column: isSingleColumnView?'single':'double'})

			let buttonText = isSingleColumnView?'2 col':'1 col';
			toggleColumnsButton.textContent = buttonText;

			if (isSingleColumnView) {
				cluesEl.classList.add('o-crossword-clues-single-column');
				cluesEl.classList.remove('o-crossword-clues-two-columns');				
				// o-crossword-clues-single-column
			} else {
				cluesEl.classList.remove('o-crossword-clues-single-column');	
				cluesEl.classList.add('o-crossword-clues-two-columns');								
			}
			
			try {
				localStorage.setItem('FT-crossword_columns',  isSingleColumnView);
			} catch(err){
				console.log('Error trying to save state', err);
			}
		}

		function answersEmpty() {
			return answerStore && (/^[*,\-]+$/).test(answerStore.across) && (/^[*,\-]+$/).test(answerStore.down);
		}

		const onResize = function onResize(init) {
			const cellSizeMax = 40;
			
			if (window.innerWidth <= 739) {
				isMobile = true;
			} else if (window.innerWidth > window.innerHeight && window.innerWidth <=739 ) { //rotated phones and small devices, but not iOS
				isMobile = true;
			}

			if(isMobile && !!init) {
				clueNavigationNext.click();
			}

			const d1 = cluesEl.getBoundingClientRect();
			let d2 = gridEl.getBoundingClientRect();
			const width1 = d1.width;
			const height1 = d1.height;
			let width2 = d2.width;
			const height2 = d2.height;

			let scale = height2/height1;
			if (scale > 0.2) scale = 0.2;

			this._cluesElHeight = height1;
			this._cluesElWidth = width1 * scale;
			this._height = height1 * scale;
			this._scale = scale;

			magicInput.style.display = 'none';

			//update grid size to fill 100% on mobile view
			let fullWidth;
			if (isAndroid()) {
				fullWidth = Math.min(window.screen.height, window.screen.width);			
			} else {
				fullWidth = Math.min(window.innerHeight, window.innerWidth);				
			}
			
			this.rootEl.width = fullWidth + 'px !important';
			const gridTDs = gridEl.querySelectorAll('td');
			const gridSize = gridEl.querySelectorAll('tr').length;
			const newTdWidth = parseInt(fullWidth / (gridSize + 1) );
			const inputEl = document.querySelector('.o-crossword-magic-input');

			if(isMobile) {
				for (let i = 0; i < gridTDs.length; i++) {
					let td = gridTDs[i];
					td.style.width = Math.min(newTdWidth, cellSizeMax) + "px";
					td.style.height = Math.min(newTdWidth, cellSizeMax) + "px";			
					td.style.maxWidth = "initial";
					td.style.minWidth = "initial";
				}

				inputEl.style.width = Math.min(newTdWidth, cellSizeMax) + "px";
				inputEl.style.height = Math.min(newTdWidth, cellSizeMax) + "px";
				inputEl.style.maxWidth = "initial";

				if(isGridView) {
					cluesEl.classList.add('visually_hidden');
					toggleViewButtonBottom.classList.add('visually_hidden');	
					toggleColumnsButton.classList.add('visually_hidden');					
					gridWrapper.classList.remove('visually_hidden');
					clueDisplayer.classList.remove('visually_hidden');
					toggleViewButtonAboveGrid.classList.remove('visually_removed');
				} else {
					gridWrapper.classList.add('visually_hidden');
					clueDisplayer.classList.add('visually_hidden');
					toggleViewButtonAboveGrid.classList.add('visually_removed');
					cluesEl.classList.remove('visually_hidden');
					toggleViewButtonBottom.classList.remove('visually_hidden');
					toggleColumnsButton.classList.remove('visually_hidden');									
				}

				if (isSingleColumnView) {
					cluesEl.classList.add('o-crossword-clues-single-column');
					cluesEl.classList.remove('o-crossword-clues-two-columns');					
				} else {
					cluesEl.classList.remove('o-crossword-clues-single-column');
					cluesEl.classList.add('o-crossword-clues-two-columns');										
				}

				let el = cluesEl.querySelector('.has-hover');
				if(el) {
					if(clueDisplayer.classList.contains('visually_hidden')) {
						clueDisplayer.style.height = '';
					} else {
						clueDisplayer.style.height = clueDisplayerText.clientHeight + 50 +'px';
						el.querySelector('.o-crossword-user-answer').style.top = clueDisplayerText.clientHeight + 'px';
					}
					
					toggleViewButtonAboveGrid.style.marginTop = clueDisplayer.style.height;
				}

			} else {
				for (let i = 0; i < gridTDs.length; i++) {
					let td = gridTDs[i];
					td.style.removeProperty('width');
					td.style.removeProperty('height');
					td.style.removeProperty('max-width');
					td.style.removeProperty('min-width');
				}

				let desktopSize = gridTDs[0].getBoundingClientRect().width;
				inputEl.style.width = desktopSize + "px";
				inputEl.style.height = desktopSize + "px";

				cluesEl.classList.add('o-crossword-clues-two-columns');
			}
			
			if(!isCSSMobile(clueDisplayer)){
				gridEl.style.marginTop = "initial";
				clueDisplayer.classList.remove('visually_hidden');
				gridWrapper.classList.remove('visually_hidden');
				cluesEl.classList.remove('visually_hidden');
			}

			d2 = gridEl.getBoundingClientRect();

		}.bind(this);

		if(!isAndroid()) {
			this.onResize = debounce(onResize, 100);
		}

		const onTap = function onTap(e) {
			let target;
			let clueDetails;
			let isNavigation = false;
			blockHighlight = false;

			if (e.target.nodeName === 'TD' || e.target.nodeName === 'INPUT') {
				target = e.target;
				blockHighlight = true;
			} else {
				let defEl;

				if(e.target.nodeName === 'A') {
					defEl = navigateClues(e);
					isNavigation = true;
				} else {
					defEl = (e.target.nodeName === 'SPAN')?e.target.parentElement:e.target;
				}

				clueDetails = {};
				clueDetails.number = defEl.getAttribute('data-o-crossword-number');
				clueDetails.direction = defEl.getAttribute('data-o-crossword-direction');
				clueDetails.answerLength = defEl.getAttribute('data-o-crossword-answer-length');

				if (!toggleClueSelection(clueDetails)) {
					return;
				}

				if(!isMobile) {
					defEl.focus();
				}
				
				target = gridEl.querySelector(`td[data-o-crossword-number="${clueDetails.number}"]`);
			}


			if (target === magicInput) {
				target = magicInputTargetEl;
			}

			if (gridEl.contains(target)) {
				let cell = target;
				while(cell.parentNode) {
					if (cell.tagName === 'TD') {
						break;
					} else {
						cell = cell.parentNode;
					}
				}

				const clues = gridMap.get(cell);
				if (!clues) {
					return;
				}

				// cell.scrollIntoView(); //TODO: this works OK-ish for vertical oriented phones, could be explored

				// iterate through list of answers associated with that cell
				let index = clues.indexOf(currentlySelectedGridItem);

				// if a new item is selected find what ever matches the current selection
				if (index === -1 && currentlySelectedGridItem) {
					const oldClue = currentlySelectedGridItem;

					if(clueDetails !== undefined) {
						currentlySelectedGridItem = clues.find(item => (
							item.direction === clueDetails.direction &&
							item.number === clueDetails.number &&
							item.answerLength === clueDetails.answerLength
						));
					} else {
						currentlySelectedGridItem = clues.find(item => (
							item.direction === oldClue.direction &&
							item.number === oldClue.number &&
							item.answerLength === oldClue.answerLength
						));
					}
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

				if(!isNavigation || isTab) {
					takeInput(cell, getGridCellsByNumber(
						gridEl,
						currentlySelectedGridItem.number,
						currentlySelectedGridItem.direction,
						currentlySelectedGridItem.answerLength
					));

					isTab = false;
				}
			}

			if(target!== null) {
				if(target.getAttribute('data-link-identifier')) {
					const focus = target.getAttribute('data-link-identifier').split('-');
					trackEvent({action: 'focusClueInput', clueId: focus[0], letterId: focus[1]})
				} else{
					const identifier = currentlySelectedGridItem.direction[0].toUpperCase() + currentlySelectedGridItem.number;
					trackEvent({action: 'focusCell', clueId: identifier, letterId: currentlySelectedGridItem.answerPos});
				}
			}
		}.bind(this);

		const navigateClues = function navigateClues (e) {
			e.preventDefault();

			if (e.target === clueNavigationNext) {
				++currentClue;

				if(currentClue > cluesTotal) {
					currentClue = 0;
				}
			} else {
				--currentClue;
				if(currentClue < 0) {
					currentClue = cluesTotal;
				}
			}

			return cluesEl.querySelector(`li[data-o-crossword-clue-id="${currentClue}"]`);
		}.bind(this);

		this.addEventListener(cluesEl, 'mousemove', e => highlightGridByCluesEl(e.target));

		this.rootEl.addEventListener('click', onTap, false);

		onResize(true);
		this.addEventListener(window, 'resize', this.onResize);
	}

	if(isiOS()) {
		document.getElementsByTagName('body')[0].className += " iOS";
	}
};

OCrossword.prototype.addEventListener = function(el, type, callback) {
	if (this.listeners === undefined) {
		this.listeners = [];
	}

	this.listeners.push({el, type, callback});

	if(Object.prototype.toString.call(el) === '[object NodeList]') {
		Array.from(el).forEach(function(element) {
			element.addEventListener(type, callback);
		});
	} else {
		el.addEventListener(type, callback);
	}
};

OCrossword.prototype.removeAllEventListeners = function() {
	this.listeners.forEach(function remove({el, type, callback}) {
		el.removeEventListener(type, callback);
	});
};

OCrossword.prototype.destroy = function destroy() {
	this.removeAllEventListeners();

	if (this._raf) {
		cancelAnimationFrame(this._raf);
	}
};

module.exports = OCrossword;

function isiOS() {
	var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	return iOS;
}

function isAndroid() {
	var android = navigator.userAgent.toLowerCase().indexOf("android") > -1;
	return android;
}

function isTouch() {
	return 'ontouchstart' in window || 'onmsgesturechange' in window;
}

function isCSSMobile(clueDisplayer) {
	return window.getComputedStyle(clueDisplayer).getPropertyValue('display') !== 'none';
}

function isEquivalent(a, b) {
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    if (aProps.length != bProps.length) {
        return false;
    }

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];
        if (a[propName] !== b[propName]) {
            return false;
        }
    }

    return true;
}

function initTracking(id, view, column) {
	const config_data = {
        server: 'https://spoor-api.ft.com/px.gif',
        context: {
            product: 'o-crossword',
            crosswordNumber: id
        },
        user: {
            ft_session: oTracking.utils.getValueFromCookie(/FTSession=([^;]+)/)
        }
    }

	oTracking.init(config_data);
	oTracking.page({
		preferredView: `${view?'grid':'list'}`,
		preferredColumn: `${column?'single':'double'}`
	});
}

function trackEvent(action) {
	document.body.dispatchEvent(new CustomEvent('oTracking.event', {
		detail: {
			action: action.action,
			view: action.view,
			column: action.column,
			clueId: action.clueId,
			letterId: action.letterId,
			category: 'o-crossword'
		},
		bubbles: true
	}));
}