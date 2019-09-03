# o-crossword

An experimental Origami component to implement a responsive crossword.

## To build this locally

* set up the Origami [Manual build process](http://origami.ft.com/docs/developer-guide/modules/building-modules/)
   * checkout clone of o-crossword repo
   * cd to repo code
   * check node and ruby are installed
   * $ `npm install -g gulp`
   * $ `npm install -g origami-build-tools`
   * $ `npm install -g bower`
   * As described in https://origami.ft.com/docs/tutorials/manual-build/#bower--the-origami-registry
      * ensure you have ~/.bowerrc configured with
```
{
	"registry": {
		"search": [
			"https://origami-bower-registry.ft.com",
			"https://registry.bower.io"
		]
	}
}
```
   * $ `obt install`
   * $ `obt build`
* deploy locally as described in the [Origami build tools doc](https://github.com/Financial-Times/origami-build-tools#developing-modules-locally)
   * $ `obt demo --runServer --watch`
   * see a demo of it running at http://localhost:8999/demos/local/basic.html
* [Bower linking a component](https://oncletom.io/2013/live-development-bower-component/)
* general Origami [Developer Guide](http://origami.ft.com/docs/developer-guide/)

## main code

* src/js/oCrossword.js

## Print view
Portrait mode has been favoured, and made to work across Chrome, Safari, and Firefox (Internet Explorer still needs to be tested), which means landscape mode doesn't fit the page as nicely as it could. Note: control over page margins isn't possible in Safari.


# Old notes

## Features it could do with:

* Toggle for changing side of preview bar
* Note pad for
* Touch/scroll functionality did not work on iPhone

## Testing Script

NB: The preview bar refers to the green and blue clues thumbnail on small screen.

1. Ensure the element responds correctly to available space, never overflowing the container/viewport
1. Ensure `data-o-crossword-force-compact` still works.
1. When on small screen ensure the preview bar is visible

1. When the preview bar is pressed a magnifying window is shown
1. When the preview bar is dragged vertically a magnifying window is shown
1. Ensure that the position in the preview bar matches what is shpwn in the window, check the beginning end and middle.
1. Ensure a clue is highlighted in green and is fully legible
1. Check that the Clue highlighted in green has the corresponding row highlighted.
1. The clue should also be written again in the clue display box below the table
1. swiping right on the preview box brings on the large window which can be scrolled
1. This box should be under the finger/cursor for the majority of the swipe
1. It should disappear if clicked on and the clicked on clue should be highlighted on the grid
1. tapping on the preview bar should also reveal this box to the tapped postion
1. tapping again again on the preview bar whilst the box is visible should scroll the box to that position

1. The grid should allow you to tap on a grid cell
1. This highlights it across (if available)
1. tapping on the same character again should highlight the other direction
1. tapping on another character in the highlighted word should select that character and keep the highlight the same
1. the grid you tapped on you can enter characters into
1. entering a character will replace the contents of the cell
1. the next cell will then be selected and ready for entering a character
1. clicking on the now selected cell should switch between across/row on that cell if available.
1. highlighted words can be navigated by pressing the arrow keys
1. pressing return exits the character entry

1. building from JSON
1. building from json with answers
