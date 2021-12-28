
/* 
	Copyright 2021 Joseph Mason

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

		http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License. 
*/

//Variable to store the nested full screen instance when loaded
let Glass_fullScreenGlass = {}
	
	
function Glass(id, useroptions) {
	//Store info on the molecule/rxn. Called the state.
	this.id = id
	this.options = {
		mode: "sketcher",
		height: 1000,
		width: 1000,
		buttonSize: 34,
		//l is the length of all the bonds, locus is locus of highlighting a bond or atom/distance of double bond
		//from its single parent.
		l: 30,
		locus: 5,
		whitespace: 9,
		pointsAsIndexed: false,
		fontsize: 18, //measured in px
		click: "true",
		arrowHead: 5,
		allowDiagonalArrows: false,
		isFullScreenMode: false,
		colourScheme: "default",
	}
	
	//to store the context of the prototype, so that it can be accessed inside the event handlers below
	let that = this
	
	$.each(useroptions, function(index, value) {
		that.options[index] = value
	})
	
	//If the set canvas size is too small to render correctly,
	//the mode will automatically switch to "viewer", and editing
	//can only take place via the full screen mode. 
	if((this.options.width < 350 || this.options.height < 350) && this.options.isFullScreenMode === false && this.options.mode !== "nocanvas") {
		this.options.mode = "viewer"
	}
	

	if(this.options.mode === "sketcher") {
		this.canvasWidth = this.options.width - (this.options.buttonSize*2 + 24)
		this.canvasHeight = this.options.height - (this.options.buttonSize + 22)
	}
	else if(this.options.mode === "viewer") {
		this.canvasWidth = this.options.width
		this.canvasHeight = this.options.height
	}
	
	this.points = []
    this.bonds = []
	this.shapes = []
	
	this.selection = []
	this.shapeSelection = []
	this.futurepoint = []
	this.nextAtom = "C"
	
	//Store previous states to allow access for undoing actions
	
	this.oldstates = []
	
	//Set behaviour for what should happen when mouseup event occurs i.e. add a point, deal with what 
	//has been selected, add the point in direction the user chose.
	this.selector = false
	this.futuredir = false
	this.molmove = false
	
	//Global variable for the main canvas context, and the additonal context for highlighting atoms and bonds
	//and selected items and animations. Data gets assigned to these variables at the end of initialisation (see end)
	this.canvas = ""
	this.ctx = ""
	
	
	//keep track of where the mouse is, in readiness for changing the atom type e.g. from carbon to oxygen
    this.curx;
    this.cury;
	
	//stores what should happen when user next clicks
    this.nextClick = ""
	
	//stores which template should be drawn
	this.nextTemplate = []
	
	//A set of preset colour schemes from which the user can choose to use!
	this.presetColourSchemes = {
		"dark": {
			"--background-colour": "#172A3A",
			"--onhover-colour": "#508991",
			"--highlight-colour1": "#004346",
			"--highlight-colour2": "#09BC8A",
			"--canvas-colour": "#345A66",
			"--text-colour": "white",
			"--bond-colour": "white",
		},
		"warm": {
			"--background-colour": "#7B5731",
			"--onhover-colour": "#533E2D",
			"--highlight-colour1": "#DDCA7D",
			"--highlight-colour2": "#D6CBC1",
			"--canvas-colour": "#B88B4A",
			"--text-colour": "black",
			"--bond-colour": "black",
		},
		
			
		
		
	}
	
	//stores the colour of the canvas, to make sure the atom background matches. 
	//populate once parent element is loaded, so we can read from the css styling. 
	this.canvasColour = "white"
	that.strokeStyle = "black"
	
	//global variable is readiness for a user holding a click, to activate an alternative mode
	this.clickholdTimeout = 0
	
	//tracks if the canvas was recently redrawn, and the contents haven't changed since
	//i.e. if the mouse is just over blank space
	this.recentrefresh=false
	
	//for the copy/paste features
	this.atomsToBeCopied = []
	this.bondsToBeCopied = []
	this.shapesToBeCopied = []
	
	//Keep track of all the current rings in the state, and update this only after the mouse has been clicked, 
	//not just moved. This allows us to get away from running the costly "findRings" function every time the 
	//mouse is moved. 
	this.currentRings = []
	
	// Will store more info in future, such as atomic weight.
	//["official form for mol files", ["number of attached hydrogens with 1 bond, with two bonds, with three... with 7"]]
	this.atomdict = {
		//The first set of atoms are indexed by which e.which (keydown) data with the corresponds with that atom. 
		
		72:["H", [], 1.01, "center"],
		
        79:["O", [1, 0], 16.00, "center"],
		
        80:["P", [2, 1, 0, 1, 0], 30.97, "center"],
        83:["S", [1, 0, 1, 0, 1, 0], 32.06, "center"],
		70:["F", [0], 19.00, "center"],
        76:["Cl", [0, 1, 0, 1, 0, 1, 0], 35.45, "center"],
        66:["Br", [0, 1, 0, 1, 0, 1, 0], 79.90, "center"],
		73:["I", [0, 1, 0, 1, 0, 1, 0], 126.90, "center"],
		67:["C", [3, 2, 1, 0], 12.01, "center"],
		78:["N", [2, 1, 0, 0, 0], 14.01, "center"],
		
		//the following are generic atom groups 
		
		501: ["X", [], 100.01, "center"],
		502: ["P", [], 100.02, "center"],
		503: ["Y", [], 100.03, "center"],
		
		//The following is a dummy atom to represent a lone pair
		//of electrons, and is required for determination of the chiral label
		//for a chiral sulfoxide or similar when generating a SMILES. 
		601: ["LP", [], 100.04, "centre"],
		
		//the following atoms are complex atom groups. This is the other reason for storing 
		//atoms in the points array as a number, so that we don't need to worry about non-standard characters 
		//being used as an index in certain arrays. 
		1001: ["B(OH)2", [], 44.83, "left"],
		1002: ["BF3K", [], 106.81, "left"],
		1003: ["COOH", [], 45.02, "left"],
		1004: ["SMe", [], 47.1, "left"],
		
		//the following are atoms that don't require a keyboard shortcut because they are too niche, but require a number to keep consistency 
		//with the rest and to prevent the redraw function from throwing an error. 
		1: ["He", [], 4.00],
		2: ["Li", [], 6.94],
		3: ["Be", [], 9.01],
		4: ["B", [2, 1, 0], 10.81, "center"],
		5: ["Ne", [], 20.18],
		6: ["Na", [], 23],
		7: ["Mg", [], 24],
		8: ["Al", [], 27],
		9: ["Si", [], 28.09],
		10: ["Ar", [], 39.95],
		11: ["K", [], 39.098],
		12: ["Ca", [], 40.08],
		13: ["Sc", [], 44.96],
		14: ["Ti", [], 47.87],
		15: ["V", [], 50.94],
		16: ["Cr", [], 52.00],
		17: ["Mn", [], 54.94],
		18: ["Fe", [], 55.85],
		19: ["Co", [], 58.93],
		20: ["Ni", [], 58.69],
		21: ["Cu", [], 63.55],
		22: ["Zn", [], 65.39],
		23: ["Ga", [], 69.72],
		24: ["Ge", [], 72.64],
		25: ["As", [], 74.92],
		26: ["Se", [], 78.96],
		27: ["Kr", [], 83.80],
		28: ["Rb", [], 85.47],
		29: ["Sr", [], 87.62],
		30: ["Y", [], 88.90],
		31: ["Zr", [], 91.22],
		32: ["Nb", [], 92.90],
		33: ["Mo", [], 95.94],
		34: ["Tc", [], 98.00],
		35: ["Ru", [], 101.07],
		36: ["Rh", [], 102.91],
		37: ["Pd", [], 106.42],
		38: ["Ag", [], 107.87],
		39: ["Cd", [], 112.41],
		40: ["In", [], 114.82],
		41: ["Sn", [], 118.71],
		42: ["Sb", [], 121.76],
		43: ["Te", [], 127.60],
		44: ["Xe", [], 131.29],
		45: ["Cs", [], 132.91],
		46: ["Ba", [], 137.33],
		47: ["La", [], 138.91],
		48: ["Ce", [], 140.12],
		49: ["Pr", [], 140.91],
		50: ["Nd", [], 144.24],
		51: ["Pm", [], 145.00],
		52: ["Sm", [], 150.36],
		53: ["Eu", [], 151.96],
		54: ["Gd", [], 157.25],
		55: ["Tb", [], 158.93],
		56: ["Dy", [], 162.50],
		57: ["Ho", [], 164.93],
		58: ["Er", [], 167.26],
		59: ["Tm", [], 168.93],
		100: ["Yb", [], 173.04],
		101: ["Lu", [], 174.97],
		102: ["Hf", [], 178.49],
		103: ["Ta", [], 180.95],
		104: ["W", [], 183.84],
		105: ["Re", [], 186.21],
		106: ["Os", [], 190.23],
		107: ["Ir", [], 192.22],
		108: ["Pt", [], 195.08],
		109: ["Au", [], 196.97],
		110: ["Hg", [], 200.59],
		111: ["Tl", [], 204.38],
		112: ["Pb", [], 207.20],
		113: ["Bi", [], 208.98],
		114: ["Po", [], 209],
		115: ["At", [], 210],
		116: ["Rn", [], 222],
		117: ["Fr", [], 223],
		118: ["Ra", [], 226],
		119: ["Ac", [], 227],
		120: ["Th", [], 232.04],
		121: ["Pa", [], 231.04],
		122: ["U", [], 238.03],
		123: ["Np", [], 237],
		124: ["Pu", [], 244],
		125: ["Am", [], 243],
		126: ["Cm", [], 247],
		127: ["Bk", [], 247.01],
		128: ["Cf", [], 251],
		129: ["Es", [], 252],
		130: ["Fm", [], 257],
		131: ["Md", [], 258],
		132: ["No", [], 259],
		133: ["Lr", [], 262],
		134: ["Rf", [], 261],
		135: ["Db", [], 262.01],
		136: ["Sg", [], 266],
		137: ["Bh", [], 264],
		138: ["Hs", [], 277],
		139: ["Mt", [], 268],
		140: ["Ds", [], 110], //The remaining atomic weights are unavailable, so the atomic weight was used instead to ensure a valid SMILES output. 
		141: ["Rg", [], 272],
		142: ["Cn", [], 112],
		143: ["Nh", [], 113],
		144: ["Fl", [], 114],
		145: ["Mc", [], 115],
		146: ["Lv", [], 116],
		147: ["Ts", [], 117],
		148: ["Og", [], 118]
    }
    
	this.normalKeyFunction = function() {
		$(document).on("keyup", function(e) {
			if(that.nextClick !== "canvas-disable") {
				e.preventDefault()
				
				
				if(e.ctrlKey) {
					if(e.which === 90) {
						that.undoAction()
					}
					else {
						
						switch(e.which) {
							case 67: that.copySelection(); break;
							case 65: that.selectAll(); break;
							case 86: 
								that.saveState()
								that.pasteSelection(); 
							break;
						}
					}
				}
				else { //Don't allow key function if nring popup open
					
					
					//Find out whether a bond was hovered over when the key was pressed. 
					let bondClicked = that.getBondClicked(e, [that.curx, that.cury])
					let pointClicked = that.getPointClicked(e, [that.curx, that.cury])
					switch(e.which) {
						
						case 46: 
							that.saveState()
							that.deleteSelection(); 
						break;
						case 49: 
							that.nextClick = ""
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-1bond').addClass("highlight-svg")
							
							if(bondClicked !== -1) {
								that.saveState()
								that.bonds[bondClicked][2] = 1
								that.bonds[bondClicked][3] = 0
								that.refreshCanvas()
							}
							
						break;
						case 50:
							that.nextClick = ""
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-1bond').addClass("highlight-svg")
							
							if(bondClicked !== -1) {
								that.saveState()
								that.bonds[bondClicked][2] = 2
								that.bonds[bondClicked][3] = 0
								that.refreshCanvas()
							}
							
						break;
						case 51: 
							that.nextClick = 3
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-3ring').addClass("highlight-svg")
						break;
						case 52: 
							that.nextClick = 4
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-4ring').addClass("highlight-svg")
						break;
						case 53: 
							that.nextClick = 5
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-5ring').addClass("highlight-svg")
						break;
						case 54: 
							that.nextClick = 6
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-6ring').addClass("highlight-svg")
						break;
						case 55: 
							that.nextClick = 7
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-7ring').addClass("highlight-svg")
						break;
						case 56: 
							that.nextClick = 8
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-8ring').addClass("highlight-svg")
						break;
						case 57: 
							that.nextClick = 9
							$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
							$('#'+id+' .glass-left-buttons-9ring').addClass("highlight-svg")
						break;
						case 87: 
							if(bondClicked !== -1) {
								if(that.bonds[bondClicked][2] === 1) {
									that.saveState()
									that.bonds[bondClicked][3] = (that.bonds[bondClicked][3] !== 1) ? 1 : 3
									that.refreshCanvas()
								}
							}
						break;
						case 72: 
							if(pointClicked !== -1) {
								that.changeAtomOnKeyPress(e.which, that.curx, that.cury); 
							}
							if(bondClicked !== -1) {
								if(that.bonds[bondClicked][2] === 1) {
									that.saveState()
									that.bonds[bondClicked][3] = (that.bonds[bondClicked][3] !== 2) ? 2 : 4
									that.refreshCanvas()
								}
							}
							
						break;
						case 61:
							if(pointClicked !== -1) {
								that.saveState()
								that.increaseCharge(pointClicked)
							}
						break;
						case 173: 
							if(pointClicked !== -1) {
								that.saveState()
								that.decreaseCharge(pointClicked)
							}
						break;
						case 90: break; //Don't allow Ctrl-Z action to insert a Mn atom!
						case 17: break; //on Ctrl keyup after a Ctrl-Z action will trigger insertion of a Mn atom, so prevent this too. 
						default: 
							that.saveState()
							that.changeAtomOnKeyPress(e.which, that.curx, that.cury); 
						break;
					}
				}
				that.currentRings = that.findRings()
			}
		})
		
		//Attach on mouse wheel event to trigger zoom in and zoom out 
		$( '#'+that.id+'-canvas').on("wheel", function(e) {
			e.preventDefault()
			
			if(e.originalEvent.deltaY > 0) {
				that.zoomOut()
			}
			if(e.originalEvent.deltaY < 0) {
				that.zoomIn()
			}
		})
	}
	
	this.restoreNormalClickFunction = function() {
		$(' #'+that.id+'-canvas').off("mousedown")
		$(' #'+that.id+'-canvas').off("mouseup")

		$(' #'+that.id+'-canvas').on("mousedown", function(e) {
			e.preventDefault()
			that.saveState()
			$('#'+id+' .glass-popup').css("display", "none")
			$(`#${id} .glass-textarea`).val("")
			that.clickholdTimeout = setTimeout(that.chooseClickandHold, 150, e)
		})
		
		$(' #'+that.id+'-canvas').on("mouseup", function(e) {
			clearTimeout(that.clickholdTimeout)
			that.restoreNormalFunction() 
			that.recentrefresh=false
			if(e.which === 1) {
				
				if(that.selector === false && that.futuredir === false && that.molmove === false) {
					if(that.selection.length>0 || that.shapeSelection.length>0) {
						that.selection = []
						that.shapeSelection = []
					}
					else {
						let bondclick = that.getBondClicked(e)
						let pointclick = that.getPointClicked(e)
						switch(true) {
							case (that.nextClick === "arrow"): 
								that.commitArrow(e, 60);
							break;
							case (that.nextClick === "wedgebond" || that.nextClick === "hashbond"):
								that.changeBondStereo(e, that.nextClick)
							break;

							case (that.nextClick === "benzene"):
								that.buildRing(e, "benzene")
							break;
							case (that.nextClick === "erase"):
								that.deleteSelection()
							break;
							case (that.nextClick === "changeAtom"):
								that.changeAtom(e)
							break;
							case (that.nextClick === "positive"):
								that.increaseCharge(pointclick)
							break;
							case (that.nextClick === "negative"):
								that.decreaseCharge(pointclick)
							break;
							case (Number.isInteger(that.nextClick)):
								that.buildRing(e, that.nextClick)
							break;
							case (that.nextClick === "canvas-disable"):
								that.nextClick = ""
							break;
							default:
								
								
								if(pointclick !== -1) {
									let coords = that.getNewPointCoords(pointclick)
									that.addpoint(coords[0], coords[1], pointclick, false)
									
								}
								else if(bondclick !== -1) {
									that.changeBondType(bondclick)
								}
								else {
									let xy = that.getCurrentCoords(e)
									that.addpoint(xy[0], xy[1], "none", false)
								}
							break;	
						}
						//Refresh the list of rings currently in the state. 
						that.currentRings = that.findRings()
					}
					
				}
				else if(that.selector === true) {
					//Prior to onmouseup event, we were in drag selector mode. The restorenormalclickfn 
					//brought us out of that mode, but now we need to refresh the canvas so the the selector 
					//box is removed from view, and we update the relevant "selector" variable. 
					that.refreshCanvas()
					that.selector = false   
				}
				else if(that.futuredir === true) {
					that.addpoint(that.futurepoint[2], that.futurepoint[3], that.futurepoint[4], false)
					that.futurepoint = []
					that.futuredir = false
				}
				else if(that.molmove === true) {
					that.molmove = false
				}
			}
			else if(e.which === 3) {
				let bondclick = that.getBondClicked(e)
				
				if(bondclick !== -1) {
					if(that.bonds[bondclick][2] === 1) {
						that.changeBondStereo(e, "")
					}
					else if(that.bonds[bondclick][2] === 2) {
						that.switchBondDirection(bondclick)
					}
				}
				else {
					//loadContextMenu(e)
				}
			}
			
		that.refreshCanvas()
		})
	}
	
	this.chooseClickandHold = function(e){
		let pointclick = that.getPointClicked(e)
		let [x, y] = that.getCurrentCoords(e)

		let minx = 1000000
		let miny = 1000000
		let maxx = -1000000
		let maxy = -1000000
			
		$.each(that.selection, function(index, value) {
			let point = that.points[value]

			minx = Math.min(point[0], minx)
			maxx = Math.max(point[0], maxx)
			miny = Math.min(point[1], miny)
			maxy = Math.max(point[1], maxy)
		})

		$.each(that.shapeSelection, function(index, value) {
			let x = that.shapes[value][1][0], y = that.shapes[value][1][1], angle = that.shapes[value][1][2], length = that.shapes[value][1][3]
			let x1 = x + Math.cos(angle)*(length-5)
			let y1 = y - Math.sin(angle)*(length-5)
			
			minx = Math.min(x, x1, minx)
			maxx = Math.max(x, x1, maxx)
			miny = Math.min(y, y1, miny)
			maxy = Math.max(y, y1, maxy)
		})

		if(minx < x+10 && x-10 < maxx && miny < y+10 && y-10 < maxy) {
			that.moveSelection(minx, miny, e)
		}
		else if(that.selection.length === 1) {
			if(that.selection[0][4] === pointclick) {
				that.moveSelection(minx, miny, e)
			}
		}
		else if(that.nextClick === "arrow") {
			that.drawArrow(e)
		}
		else if(pointclick === -1) {
			that.selectItems(e) //Load function to begin selecting atoms my dragging the mouse will still onmousedown. 
		}
		
		else {
			that.setBondDirection(pointclick)
		}
	}
	
	//returns mouseover function to normal state, invoked after a mousedown/mouseup event sequence has been processed.
	this.restoreNormalFunction = function() {
		$(' #'+that.id+'-canvas').off("mousemove")
		$(' #'+that.id+'-canvas').on("mousemove", function(e) {
			that.curx = e.pageX - $(' #'+that.id+'-canvas').offset().left
			that.cury = e.pageY - $(' #'+that.id+'-canvas').offset().top
			
			let pointclick = that.getPointClicked(e)
			let bondclick = that.getBondClicked(e)

			if(pointclick === -1 && bondclick === -1) {
				//Look for shapes which are currently hovered over, 
				//and highlight them if so. 
				let shapeFound = false
				$.each(that.shapes, function(index, value) {
					if(value[0] === "arrow") {
						let x1 = value[1][0], y1 = value[1][1]
						let x2 = x1 + Math.cos(value[1][2]) * value[1][3]
						let y2 = y1 - Math.sin(value[1][2]) * value[1][3]
						
						let d1 = Math.pow(that.curx - x1, 2) + Math.pow(that.cury - y1, 2)
						let d2 = Math.pow(that.curx - x2, 2) + Math.pow(that.cury - y2, 2)
						
						let normdist = d1 - Math.pow((value[1][3]**2 + d1 - d2)/(2*value[1][3]), 2)

						if(normdist < 17 && d1 < Math.pow(value[1][3], 2) && d2 < Math.pow(value[1][3], 2)) {
							that.refreshCanvas()
							that.highlightShape(index)
							shapeFound = true
							that.recentrefresh = false
							
						}
					}
				})
				
				//If there is no shape currently hovered over, nor a point, nor a bond
				//refresh the canvas one last time, then prevent any more refreshing of the canvas
				//to avoid unnecessary code running, until a point, bond or shape is once again hovered over,
				//or this instance is clicked on. 
				if(!shapeFound && !that.recentrefresh) {
					that.refreshCanvas()
					that.recentrefresh = true
				}
				
			}
			else if(pointclick === -1 && bondclick !== -1){
				that.refreshCanvas()
				that.highlightBond(bondclick)
				that.recentrefresh=false

			}
			else {
				that.refreshCanvas()
				if(pointclick !== -1) {
					that.highlightAtom(pointclick)
					that.recentrefresh=false
				}
			}
		})
		
	}	
	
	//This function takes the size of the buttons, and adjust the size of all other elements so that
	//the glass instance renders correctly. 
	this.setLayout = function() {
					
			let newvalues = {
				buttonSize: this.options.buttonSize + "px",
				leftpanesize: this.options.buttonSize*2 + 4 + "px",
				atomsPopupWidth: this.options.buttonSize*2 + "px",
				pTableWidth: this.options.buttonSize*18 + 12 + "px",
				pTableSBlockWidth: this.options.buttonSize*2 + "px",
				pTableDBlockWidth: this.options.buttonSize*10 + "px",
				pTablePBlockWidth: this.options.buttonSize*6 + "px",
				pTableFBlockWidth: this.options.buttonSize*14 + "px",
				pTableFBlockAlignment: this.options.buttonSize*2 + 4 + "px",
				
			}
			
			$('.glass-parent').css("--button-size", newvalues.buttonSize)
			$('.glass-parent').css("--leftpane-size", newvalues.leftpanesize)
			$('.glass-parent').css("--atoms-popup-width", newvalues.atomsPopupWidth)
			$('.glass-parent').css("--pTable-width", newvalues.pTableWidth)
			$('.glass-parent').css("--pTable-sblock-width", newvalues.pTableSBlockWidth)
			$('.glass-parent').css("--pTable-dblock-width", newvalues.pTableDBlockWidth)
			$('.glass-parent').css("--pTable-pblock-width", newvalues.pTablePBlockWidth)
			$('.glass-parent').css("--pTable-fblock-width", newvalues.pTableFBlockWidth)
			$('.glass-parent').css("--pTable-fblock-alignment", newvalues.pTableFBlockAlignment)
		//}
	}
	
	this.setPresetColourScheme = function() {
		let scheme = this.presetColourSchemes[this.options.colourScheme]
		if(scheme !== undefined) {
			$.each(scheme, function(index, value) {
				$('.glass-parent').css(index, value)
				if(index == "--canvas-colour") {
					that.canvasColour = value
				}
				if(index === "--bond-colour") {
					that.strokeStyle = value
					that.ctx.strokeStyle = value
					that.ctx.fillStyle = value
				}
			})
		}
	}
	
	//This function loads full screen mode
	this.fullScreenMode = function() {
		
		//Load a semi-transparent element to block all user input on the parent canvas.
		//If this is clicked on, the full screen mode view will close. 
		
		$('body').append("<div class='glass-parent-shield'></div>")
		$('.glass-parent-shield').css("width", this.options.width)
		$('.glass-parent-shield').css("height", this.options.height)
		
		let positionTop = $(`#${id}`).position().top
		let positionLeft = $(`#${id}`).position().left
		$('.glass-parent-shield').css("top", positionTop)
		$('.glass-parent-shield').css("left", positionLeft)
		
		
		let instanceWidth = window.innerWidth - 200 
		let instanceHeight = window.innerHeight - 200
		
		$('#'+id+'-fullScreenDiv').css("display", "block")
		
		let fullScreenOptions = JSON.parse(JSON.stringify(this.options))
		
		fullScreenOptions.height = instanceHeight
		fullScreenOptions.width = instanceWidth
		fullScreenOptions.isFullScreenMode = true
		fullScreenOptions.originator = id
		fullScreenOptions.mode = "sketcher"
		//Load a new instance of glass to contain the Full Screen Mode
		Glass_fullScreenGlass = new Glass(id + '-fullScreenDiv', fullScreenOptions)
		Glass_fullScreenGlass.oldstates = this.oldstates
		
		let newexport = this.exportGlass()
		//Join the key data pieces for the new Full Screen  instance with the current "normal" one. Changes in one lead to changes in the other, as desired
		Glass_fullScreenGlass.importGlass(newexport)
		Glass_fullScreenGlass.centreandRedraw()
		
		//When the user clicks on the button in the full screen instance to close that instance and return to the normal view, 
		//refresh this canvas to reflect changes made whilst in full screen mode. 
		$('#'+id+'-fullScreenDiv .glass_closefullScreenModeSVG').click(function() {
			let returnExport = Glass_fullScreenGlass.exportGlass()
			that.importGlass(returnExport)
			that.centreandRedraw()
			this.oldstates = Glass_fullScreenGlass.oldstates
			
			Glass_fullScreenGlass = []
			$('#'+id+"-fullScreenInstance").empty()
			$('#'+id+"-fullScreenDiv").css("display", "none")
			$('.glass-parent-shield').remove()
		})
		
		$('.glass-parent-shield').click(function() {
			let returnExport = Glass_fullScreenGlass.exportGlass()
			that.importGlass(returnExport)
			that.centreandRedraw()
			this.oldstates = Glass_fullScreenGlass.oldstates
			
			Glass_fullScreenGlass = []
			$('#'+id+"-fullScreenInstance").empty()
			$('#'+id+"-fullScreenDiv").css("display", "none")
			$('.glass-parent-shield').remove()
		})
		
	}
	
	//Load all of the DOM elements required from the correct directory. On successful load, append the canvas
	//get the canvas context, and attach event handlers for all of the svg based buttons. 
	if(that.options.mode !== "nocanvas" ) {
		
		if(that.options.mode === "sketcher" && Glass_innerHTML) {
			$('#'+id).html(Glass_innerHTML)
			$("#"+id+" .glass-sketch-window").append('<canvas class="'+id+'" id="'+id+'-canvas"  width="'+that.canvasWidth+'px" height="'+that.canvasHeight+'px" oncontextmenu="return false;" >Contact Administrator</canvas>')
			$("#"+id).css("width", that.options.width+"px")
			$("#"+id).css("height", that.options.height+"px")
			//Automatically adjust css values based on the size of the buttons, defined in this.options, and potentially overridden on init. 
			this.setLayout()
			$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
			$('#'+id+' .glass-left-buttons-1bond').addClass("highlight-svg")
			
			if(!this.options.isFullScreenMode) {
				//Append the DOM elements required for the full screen mode, unless we are already in "full screen mode"
				$('body').append('<div id="'+id+'-fullScreenDiv" class="glass-fullScreenDiv">')
				$('#'+id+" .glass_closefullScreenModeSVG").css("display", "none")
			}
			else {
				//If we're in full screen mode, show the "closefullScreenMode" SVG, and hide the "openFullScreenSVG"
				$('#'+id+" .glass_fullScreenModeSVG").css("display", "none")
			}
			
			$('#'+id+' svg').mouseover(function() {
				$(this).addClass("glass-hover-svg")
			})
		
			$('#'+id+' svg').mouseleave(function() {
				$(this).removeClass("glass-hover-svg")
			})
			
			$('#'+id+' .glass-button').mouseover(function() {
				$(this).addClass("glass-hover-button")
			})
		
			$('#'+id+' .glass-button').mouseleave(function() {
				$(this).removeClass("glass-hover-button")
			})

		
			//that.canvasColour = $("#"+id+"-canvas").css("background-color")

			$('#'+id+' svg').click(function() {
				//Change styling if one of the buttons on the left is clicked. 
				if($(this).parent().attr("class").split(" ").includes("glass-left-buttons")) {
					
					$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
					$(this).addClass("highlight-svg")
						
				}
				//If one of the top buttons is clicked, highlight the 1 bond.
				else if($(this).parent().attr("class").split(" ").includes("glass-top-buttons")){  
					$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
					$('#'+id+' .glass-left-buttons-1bond').addClass("highlight-svg")
					
				}
				
				//Close all open popups
				$('#'+id+' .glass-popup').css("display", "none")
				
				let value = $(this).data("value")
				let newvalue = ""
				if(value === "new") {
					that.points = []
					that.bonds = []
					that.selection = []
					that.shapeSelection = []
					that.shapes = []
					that.futurepoint = []
					that.refreshCanvas()
					
					
				}
				else if(value === "copy") {
					that.copySelection()
				}
				else if(value === "paste") {
					that.pasteSelection()
				}
				else if(value === "zoom-in") {
					that.selection = []
					that.shapeSelection = []
					that.zoomIn()
				}
				else if(value === "zoom-out") {
					that.selection = []
					that.shapeSelection = []
					that.zoomOut()
				}
				else if(value === "undo") {
					that.selection = []
					that.shapeSelection = []
					that.undoAction()
				}
				
				else if(value === "fullScreenMode") {
					that.fullScreenMode()
				}
			
				else if(value === "import-export") {
					
					newvalue = "canvas-disable"
					
					$('#'+id+" .glass-popup-importexport").css("display", "block")
					let boxwidth = parseInt($('#'+id+" .glass-popup-importexport").css("width"))
					let boxheight = parseInt($('#'+id+" .glass-popup-importexport").css("height"))
					
					$('#'+id+" .glass-popup-importexport").css("left", (that.options.width/2 - boxwidth/2) + "px")
					$('#'+id+" .glass-popup-importexport").css("top", (that.options.height/2 - boxheight/2) + "px")
				}
		
				else if(value === "1bond") {
					newvalue=""
				}
				else if(value === "erase") {
					newvalue="erase"
				}
				else if(value === "atom") {
					newvalue = "canvas-disable"
					$('#'+id+" .glass-popup-atoms").css("display", "block")
					
					let buttonLeft = $('#'+id+" .glass-left-buttons-atom").position().left
					let buttonTop = $('#'+id+" .glass-left-buttons-atom").position().top
					let parentLeft= $('#'+id).position().left
					let parentTop= $('#'+id).position().top
					let buttonWidth = that.options.buttonSize
					

					$('#'+id+" .glass-popup-atoms").css("left", (buttonLeft-parentLeft) + buttonWidth + "px")
					$('#'+id+" .glass-popup-atoms").css("top", (buttonTop-parentTop) + "px")
				}
				else if(value === "wedgebond") {
					newvalue = "wedgebond"
				}
				else if(value === "hashbond") {
					newvalue = "hashbond"
				}
				else if(!isNaN(parseInt(value))) {
					newvalue = parseInt(value)
				}	
				else if(value === "nring") {
					newvalue = "canvas-disable"
					$('#'+id+" .glass-popup-nring").css("display", "block")
					
					let buttonLeft = $('#'+id+" .glass-left-buttons-nring").position().left
					let buttonTop = $('#'+id+" .glass-left-buttons-nring").position().top
					let buttonWidth = that.options.buttonSize
					let parentLeft= $('#'+id).position().left
					let parentTop= $('#'+id).position().top

					$('#'+id+" .glass-popup-nring").css("left", (buttonLeft-parentLeft) + buttonWidth + "px")
					$('#'+id+" .glass-popup-nring").css("top", (buttonTop-parentTop) + "px")
					
				}
				else if(value === "pTable") {
					newvalue = "canvas-disable"
					$('#'+id+" .glass-popup-pTable").css("display", "block")
					
					let buttonLeft = $('#'+id+" .glass-left-buttons-pTable").position().left
					let buttonTop = $('#'+id+" .glass-left-buttons-pTable").position().top
					let buttonWidth = that.options.buttonSize
					let parentLeft = $('#'+id).position().left
					let parentTop = $('#'+id).position().top
					
					$('#'+id+" .glass-popup-pTable").css("left", (buttonLeft-parentLeft) + buttonWidth + "px")
					$('#'+id+" .glass-popup-pTable").css("top", (buttonTop-parentTop) + "px")
				}
				else if(value === "positive") {
					newvalue = "positive"
				}
				else if(value === "negative") {
					newvalue = "negative"
				}
				else {
					newvalue = value
				}
				that.nextClick=newvalue
			})
			
			$('#'+id+" .glass-popup-atoms-content svg").click(function() {
				$('#'+id+" .glass-popup-atoms").css("display", "none")
				let newatom = $(this).data("value")
				$('#'+id+" .glass-left-buttons-atom text").html(newatom)
				that.nextClick = "changeAtom"
				that.nextAtom = newatom
			})
			
			$('#'+id+" .glass-popup-pTable-content svg").click(function() {
				$('#'+id+" .glass-popup-pTable").css("display", "none")
				$('#'+id+' .glass-left-buttons svg').removeClass("highlight-svg")
				$('#'+id+' .glass-left-buttons-atom').addClass("highlight-svg")
				let newatom = $(this).data("value")
				$('#'+id+" .glass-left-buttons-atom text").html(newatom)
				that.nextClick="changeAtom"
				that.nextAtom = newatom
			})
			
			$('#'+id+' .glass-nring-button').click(function() {
				let inputvalue = $('#'+id+' .glass-popup-nring-content input').val()
				if(Number.isInteger(parseInt(inputvalue))) {
					
					that.nextClick = parseInt(inputvalue)
					$('#'+id+' .glass-left-buttons-nring text').html(that.nextClick)
				}
				
				
				$('#'+id+' .glass-popup').css("display", "none")
			})
			
			$(`#${id} .glass-IE-header-import`).click(function() {
				$(`#${id} .glass-popup-IE-import`).css("display", "flex")
				$(`#${id} .glass-popup-IE-export`).css("display", "none")
				
				$(this).addClass("highlight-svg")
				$(`#${id} .glass-IE-header-export`).removeClass("highlight-svg")
			})
			
			$(`#${id} .glass-IE-header-export`).click(function() {
				$(`#${id} .glass-popup-IE-export`).css("display", "flex")
				$(`#${id} .glass-popup-IE-import`).css("display", "none")
				
				$(this).addClass("highlight-svg")
				$(`#${id} .glass-IE-header-import`).removeClass("highlight-svg")
			})
			
			$(`#${id} .glass-import-button`).click(function() {
				//initiate a series of checks to determine what kind of information is being imported. 
				that.nextClick = ""
				let importText = $(`#${id} .glass-import-textarea`).val().trim()
				if(importText.slice(-6) === "M  END") {
					
					try {
						that.importMol(importText)
						$(`#${id} .glass-popup-importexport`).css("display", "none")
						$(`#${id} .glass-import-textarea`).val()
					}
					catch(e) {
						$(`#${id} .glass-import-textarea`).val(`Error: ${e}`)
					}
					
				}
				else {
					try {
						that.importGlass(importText)
						$(`#${id} .glass-popup-importexport`).css("display", "none")
						$(`#${id} .glass-import-textarea`).val()
					}
					catch(e) {
						$(`#${id} .glass-import-textarea`).val(`Error: ${e}`)
					}
				}
			})
			
			$(`#${id} .glass-export-toGlass`).click(function() {
				$(`#${id} .glass-export-textarea`).val(that.exportGlass())
			})
			
			$(`#${id} .glass-export-toMol`).click(function() {
				let newDate = new Date()
				
				$(`#${id} .glass-export-textarea`).val(that.exportMol("Glass-"+newDate.toDateString().replace(/ /g,'')))
			})
			
			$(`#${id} .glass-export-toSmiles`).click(function() {
				try {
					$(`#${id} .glass-export-textarea`).val(that.exportSmiles(true))
				}
				catch(e) {
					$(`#${id} .glass-export-textarea`).val(`Error: ${e}`)
				}
			})
			
			$('#'+id+' .glass-popup-button').click(function() {
				$('#'+id+' .glass-popup').css("display", "none")
			})
			
			that.canvas = document.getElementById(id+'-canvas')
			that.ctx = that.canvas.getContext('2d')
			that.ctx.strokeStyle = that.options.strokeStyle
			
			that.restoreNormalFunction()
			that.restoreNormalClickFunction()
			that.normalKeyFunction()
		}
		
		else {
			
			if(!this.options.isFullScreenMode) {
				//Append the DOM elements required for the full screen mode, unless we are already in "full screen mode"
				$('body').append('<div id="'+id+'-fullScreenDiv" class="glass-fullScreenDiv">')
				$('#'+id+" .glass_closefullScreenModeSVG").css("display", "none")
			}
			$('#'+id).append('<canvas class="'+id+'-glass_viewer_mode" id="'+id+'-canvas"  width="'+that.options.width+'px" height="'+that.options.height+'px" oncontextmenu="return false;" >Contact Administrator</canvas>')
			
			that.canvas = document.getElementById(id+'-canvas')
			that.ctx = that.canvas.getContext('2d')
			
			
		}
	
	}
	
	//Set the colour scheme for the sketcher now that all of the elements have loaded
	this.setPresetColourScheme()	
}
	
	
	
	
	
	
	
	

