	
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
	
	//Import data from a Glass export
	Glass.prototype.importGlass = function(data) {
		
		this.selection = []
		this.shapeSelection = []
		
		let importData = JSON.parse(data)
		
		this.points = importData.points
		this.bonds = importData.bonds
		this.shapes = importData.shapes
		this.options.fontsize = importData.optionData[0]
		this.options.whitespace = importData.optionData[1]
		this.options.l = importData.optionData[2]
		
		if(this.options.mode !== "nocanvas") {
			this.currentRings = this.findRings()
			this.centreandRedraw()
		}
	}
	
	//Export state to Glass format 
	Glass.prototype.exportGlass = function() {
		let optionData = [this.options.fontsize, this.options.whitespace, this.options.l]
		let exportData = {
			"points": this.points, 
			"bonds": this.bonds, 
			"shapes": this.shapes, 
			"optionData": optionData
		}
		return JSON.stringify(exportData)
	}
	
	//Exports the atoms and bond in the state into a MOL V2000, currently written
	//in the console.
    Glass.prototype.exportMol = function(molname) {
		
		//Generic function, used to add the padding to the front of the str
		//Used for the exportMol fn, to turn "x.xxxx" into "     x.xxxx", since
		//the total number of characters is important.
		
		function pad(str, padding, max) {
			str = str.toString();
			return str.length < max ? pad(padding + str, padding, max) : str;
		}
		
		let that = this
        let zeroes = "    0  0  0  0  0  0  0  0  0  0  0  0"
        let molstring = molname+"\n"
        molstring = molstring + "\n\n"
		
		if(this.points.length > 0) {
			molstring = molstring + pad(this.points.length, " ", 3) + pad(this.bonds.length, " ", 3)
			molstring = molstring + "  0  0  1  0  0  0  0  0999 V2000\n"
			let startpos = [this.points[0][0], this.points[0][1]]
			$.each(this.points, function(index, value) {
				let pvalue1 = ((value[0]-startpos[0])/100)
				let pvalue2 = -((value[1]-startpos[1])/100)

				pvalue1 = pvalue1.toFixed(4)
				pvalue2 = pvalue2.toFixed(4)
				molstring = molstring + pad(pvalue1, " ", 10) + pad(pvalue2, " ", 10) + "    0.0000"
				molstring = molstring + " " + that.atomdict[value[2]][0] + zeroes + "\n"
			})
			$.each(this.bonds, function(index, value) {
				if(value[2] == 1) {
					if(value[3] == 0) {
						molstring = molstring + pad(value[0]+1, " ", 3) + pad(value[1]+1, " ", 3) + "  1  0\n"
					}
					if(value[3] == 1) {
						molstring = molstring + pad(value[0]+1, " ", 3) + pad(value[1]+1, " ", 3) + "  1  1\n"
					}
					if(value[3] == 2) {
						molstring = molstring + pad(value[0]+1, " ", 3) + pad(value[1]+1, " ", 3) + "  1  6\n"
					}
					if(value[3] == 3) {
						molstring = molstring + pad(value[1]+1, " ", 3) + pad(value[0]+1, " ", 3) + "  1  1\n"
					}
					if(value[3] == 4) {
						molstring = molstring + pad(value[1]+1, " ", 3) + pad(value[0]+1, " ", 3) + "  1  6\n"
					}
				}
				else {
					molstring = molstring + pad(value[0]+1, " ", 3) + pad(value[1]+1, " ", 3) + "  " + value[2] + "  0\n"
				}
				
			})
			$.each(this.points, function(index, value) {
				if(value[4] !== 0) {
					molstring = molstring + "M  CHG  1" + pad(index + 1, " ", 3) + pad(value[4], " ", 4) + "\n"
				}
			})
		}
        molstring = molstring + "M  END\n"
		return molstring
    }
	
	
	
	//Takes a MOL V2000 paragraph and imports all the information into the state.
    Glass.prototype.importMol = function(molstring) {
		
		if(molstring === "" || !molstring) {
			return ""
		}
		
		let lines = molstring.trim().split("\n")
		let atomlength = parseInt(lines[3].substring(0,3).trim())
		let bondlength = parseInt(lines[3].substring(3,6).trim())
		
		let j = 0
		let tmppoints = []
		let tmpbonds = []
		let that = this
		let l = this.options.l
		
		//Delete everything on the canvas first 
		that.points = []
		that.bonds = []
		that.selection = []
		that.shapeSelection = []
		that.shapes = []
		that.futurepoint = []
		that.refreshCanvas()
		for(let i = 0; i<lines.length; i++) {
			
			if(i>3 && i<atomlength+4) {
				
				tmppoints.push([parseFloat(lines[i].substring(0, 11).trim()), parseFloat(lines[i].substring(11, 21).trim()), lines[i].substring(31, 34).trim(), [], 0])
				j = j + 1
			}
			
			if(i>atomlength+3 && i<bondlength+atomlength+4) {
				let stereo = 0
				if(parseInt(lines[i].substring(9, 12).trim()) == 6) {
					stereo = 2
				}
				else if (parseInt(lines[i].substring(9, 12).trim()) == 1){
					stereo = 1
				}
				tmpbonds.push([parseInt(lines[i].substring(0, 3).trim())-1, parseInt(lines[i].substring(3, 6).trim())-1, parseInt(lines[i].substring(6, 9).trim()), stereo])
				tmppoints[parseInt(lines[i].substring(0, 3).trim())-1][3].push(parseInt(lines[i].substring(3, 6).trim())-1)
				tmppoints[parseInt(lines[i].substring(3, 6).trim())-1][3].push(parseInt(lines[i].substring(0, 3).trim())-1)
			}
			//Load in data pertaining to charges located on the atom. 
			if(i >= (atomlength + bondlength + 4)) {
				if(lines[i].substring(3, 6).trim() === "CHG") {
					let charge = [parseInt(lines[i].substring(10, 13).trim()), parseInt(lines[i].substring(14, 17).trim())]
					tmppoints[charge[0]-1][4] = charge[1]
				}
			}
		}
		
		
		let fixedpos = []
		let donepoints = []
		function correctPoints(start, previndex, currindex) {
			if(start === false && donepoints.indexOf(currindex) == -1) {
				let xy1 = [tmppoints[previndex][0], tmppoints[previndex][1]]
				let xy2 = [tmppoints[currindex][0], tmppoints[currindex][1]]
				let angle = Math.atan2(xy2[1]-xy1[1], xy2[0]-xy1[0])
				let fixedposindex = donepoints.indexOf(previndex)
				
				let newxy = [fixedpos[fixedposindex][0] + l*Math.cos(angle), fixedpos[fixedposindex][1] - l*Math.sin(angle)]
				fixedpos.push([newxy[0], newxy[1], tmppoints[currindex][2], [], tmppoints[currindex][4]])
				donepoints.push(currindex)
			}
			$.each(tmppoints[currindex][3], function(bindex, bvalue) {
				if(donepoints.indexOf(bvalue) === -1) {
					correctPoints(false, currindex, bvalue)
				}
			})
		}
		
		
		$.each(tmppoints, function(pindex, pvalue) {
			if(donepoints.indexOf(pindex) === -1) {
				fixedpos.push([pvalue[0]+100, pvalue[1]+100, pvalue[2], [], pvalue[4]])
				donepoints.push(pindex)
				correctPoints(true, -1, pindex)
			}
		})
		let plength = this.points.length
		for(let i = 0; i<fixedpos.length; i++) {
			this.points.push([])
		}
		//Build a reverse atom dictionary, indexing the atom type against the number which serves as the index 
		//in the real atomdict.
		let reversedict = []
		$.each(this.atomdict, function(index, value) {
			reversedict[value[0]] = parseInt(index)
		})
		$.each(donepoints, function(index, value) {
			let reversedictindex = fixedpos[index][2]
			let newpoint = [Math.round(fixedpos[index][0]), Math.round(fixedpos[index][1]), reversedict[reversedictindex], fixedpos[index][3], fixedpos[index][4]] 
			that.points[value+plength] = newpoint

		})
		
		$.each(tmpbonds, function(index, value) {
			that.bonds.push([value[0]+plength, value[1]+plength, value[2], value[3]])
		})
		
		$.each(that.bonds, function(index, value) {
			that.points[value[0]][3].push(value[1])
			that.points[value[1]][3].push(value[0])
		})
		
		this.fixDoubleBondPlacement()
		if(this.options.mode !== "nocanvas") {
			this.currentRings = this.findRings()
			this.centreandRedraw()
		}
		
		
	}
	
	//Takes an SDF file, imports each molstring contained within along with,
	//any additional data, and stores each compound as an object, which is pushed into 
	//an array, which is then returned. 
	Glass.prototype.importSDF = function(fileData) {
		let that = this
		let molecules = []
		if(typeof fileData === "string") {
			molecules = fileData.trim().split("$$$$")
		}
		else {
			return "Invalid file data."
		}
		
		let output = []
		//Get all the metaData that comes with the SDF file.   
		function getMetaData(mol) {
			let lines = mol.split("\n")
			let allinfo = {}
			$.each(lines, function(index, value) {
				if (value.trim().substring(0,4) == ">  <") {
					let metadatatitle = value.trim().substring(4).replace(' ', '_').replace(/[^\w]/gi, '')
					let info = lines[parseInt(index)+1].trim()
					allinfo[metadatatitle] = info
				}
			})
			return allinfo			
		}
		
		
		$.each(molecules, function(index, value) {
			
			if(value.trim() !== "") {
				
				that.importMol(value)
				let glassOutput = that.exportGlass()
				let metaData = getMetaData(value)
				let goingin = {
					molecule: glassOutput, 
					metaData: metaData,
				}
				output.push(goingin)
				that.points = []
				that.bonds = []
			}
		})
		
		return output
	}
	
	
	//Export smiles string.
	//The notKekule option, when set to true, will provide an output where aromatic points are in lowercase rather than 
	//explictly specifying where the aromatic double bonds are. This option is a must when using these smiles for comparison of 
	//two compounds. 
	//This function also systematically ignores hydrogen atoms (unless they are necessary to 
	//determine the stereochemistry, as these are not necesssary for the smiles specification. 
	//These two functions combined will also mean that aromatic tautomers are no longer a problem when comparing two different compounds. 
	
	Glass.prototype.exportSmiles = function(notKekule) {
		//Step 1. Find all the molecules in the state
		//Do this by picking an "as-yet-unused point" and recursively adding its bonded neighbours. 
		//Put these points into a single array, then use those points with the bondarr to get a standard glass-type output. 
		//Continue until all points have been added. 
		
		let originalstate = {
			"points": JSON.parse(JSON.stringify(this.points)),
			"bonds": JSON.parse(JSON.stringify(this.bonds))
		}
		
		this.canonicaliseStructure()

		let shapes = this.shapes 
		let that = this
		let points = this.points
		let bonds = this.bonds
		
		let molecules = []
		let pointsFoundInRound = []
		let allPointsDone = []
		function addPointsToMolecule(starter) {
			$.each(points[starter][3], function(index, value) {
				if(!pointsFoundInRound.includes(value)) {
					pointsFoundInRound.push(value) 
					addPointsToMolecule(value)
				}
			})
		}
		
		while(allPointsDone.length < points.length) {
			pointsFoundInRound = []
			let newStarter = -1
			for(let i=0; i<points.length; i++) {
				if(!allPointsDone.includes(i) && newStarter < 0) {
					newStarter = i
					
				}
			}
			pointsFoundInRound = [newStarter]
			addPointsToMolecule(newStarter)
			Array.prototype.push.apply(allPointsDone, pointsFoundInRound)
			
			let newMolecule = {
				"points": [],
				"bonds": [],
				"avgPosition": [0,0]
			}
			
			let translationDict = {}
			
			$.each(pointsFoundInRound, function(index, value) {
				let point = points[value]
				newMolecule.points.push([point[0], point[1], point[2], [], point[4]])
				translationDict[value] = newMolecule.points.length-1
			})
			
			
			newMolecule.bonds = bonds.filter(function(value, index, arr) {
				return pointsFoundInRound.includes(value[0]) //If the bond contains one of the pointsFoundInRound, it must contain both, and therefor must be a valid bond
			})
			
			newMolecule.bonds = newMolecule.bonds.map(function(value, index, arr) {
				return [translationDict[value[0]], translationDict[value[1]], value[2], value[3]]
			})
			
			$.each(newMolecule.bonds, function(index, value) {
				newMolecule.points[value[0]][3].push(value[1])
				newMolecule.points[value[1]][3].push(value[0])
			})
			
			let avgX = newMolecule.points.reduce((a,b) => a + b[0], 0) / newMolecule.points.length
			let avgY = newMolecule.points.reduce((a,b) => a + b[1], 0) / newMolecule.points.length
			
			newMolecule.avgPosition = [avgX, avgY]
			
			molecules.push(newMolecule)
		}

		//sort molecules in order that they appear from left to right
		molecules.sort(function(a, b) {
			return a.avgPosition[0] - b.avgPosition[0]
		})
		
		$.each(molecules, function(index, value) {
			let smiles = that.generateSmiles(value.points, value.bonds, notKekule)
			molecules[index].smiles = smiles
		})
		
		let arrows = shapes.filter(x => x[0] === "arrow")
		
		//The SMILES specification only allows for a single reaction arrow. 
		//If there is more than one, we only examine the first one. 
		
		if(arrows.length > 0) {
			let arrowx = arrows[0][1][0], arrowy = arrows[0][1][1], angle = arrows[0][1][2], length = arrows[0][1][3]
			let arrowx2 = arrowx + Math.cos(angle)*(length)
			let indexOfLastReactant = molecules.findIndex(x => x.avgPosition[0] > arrowx) - 1
			let indexOfFirstProduct = molecules.findIndex(x => x.avgPosition[0] > arrowx2) + 1
			
			molecules.splice(indexOfLastReactant + 1, 0, ">")
			molecules.splice(indexOfFirstProduct, 0, ">")
		}
		
		
		let output = ""
		
		$.each(molecules, function(index, value) {
			if(molecules[index-1]?.smiles !== undefined && value.smiles !== undefined) {
				output += "." + value.smiles
			}
			else if(value.smiles !== undefined) {
				output += value.smiles
			}
			else {
				output += value
			}
		})
		
		
		
		//return the canvas to its original state
		this.points = originalstate.points
		this.bonds = originalstate.bonds
		this.refreshCanvas()
		
		return output
		
	}
	
	//This fn generates the smiles for a single molecule, passed to it from the "export Smiles" fn above. 
	//This separation makes it easier to generate reaction Smiles, and smiles of different molecules. 
	Glass.prototype.generateSmiles = function(newPoints, newBonds, notKekule) {
		
		let smilestrings = []
		
		let atomdict = this.atomdict
		let orgsubset = ["B", "C", "N", "O", "P", "S", "F", "Cl", "Br", "I"]
		
		this.points = newPoints
		this.bonds = newBonds
		let points = this.points
		let bonds = this.bonds
		let that = this
		
		
		
		//Use placeholders to fill in where the ring numbers should go. Then, at the end, search for these and replace 
		//them with numbers incrementing by 1. In this way, we can be sure that the numbers used are independant 
		//of the order the rings were dealt with. Currently this can handle up to 17 different rings, which is expected
		//to be sufficient. 
		let placeholders = ["a", "d", "e", "g", "j", "l", "m", "q", "r", "t", "u", "v", "w", "y", "z", "A", "D", "E", "G", "J", "L", "M", "Q", "R", "T", "U", "V", "W", "Y", "Z"]
		
		
		//Setup the bondarr, a reverse dictionary which holds bond info, indexed by the points that bond concerns. 
		let bondarr = []
		$.each(bonds, function(index, value) {
			bondarr[value[0]] = bondarr[value[0]] || {}
			bondarr[value[0]][value[1]] = [index, value[2], value[3]]
			bondarr[value[1]] = bondarr[value[1]] || {}
			bondarr[value[1]][value[0]] = [index, value[2], value[3]]
		})
		
		//Find all rings, and process them for digestability in this function. 
		
		let rings = this.findRings()
		
		rings.sort(function(a, b) {
			return b[2].length - a[2].length
		})
		
		//remove any rings which are a combination of two or more fused rings
		let ringstoremove = []
		$.each(rings, function(index, value) {
			$.each(rings, function(bindex, bvalue) {
				if(bvalue[2].length > value[2].length) {
					let matches = value[2].filter(function(cvalue, cindex, arr) {
						return bvalue[2].includes(cvalue)
					}).length
					
					if(matches == value[2].length) {
						ringstoremove.push(bindex)
					}
				}
				
			})
		})
		rings = rings.filter(function(value, index, arr) {
			return !ringstoremove.includes(index)
		})
		let bondsinrings = []
		let bondsinsmallrings = [] //Keeps track of all bonds in a ring of size 8 or greater (not including fused ring systems). 
		let aromaticpoints = []
		let aromaticbonds = []
		
		$.each(rings, function(index, value) {
			let ring = value[2]
			for(let i = 0; i<value[2].length; i++) {
				if(i == 0) {
					let bond = bondarr[ring[0]][ring[value[2].length-1]]
					if(!bondsinrings.includes(bond[0])) {
						bondsinrings.push(bond[0])
					}
					if(!bondsinsmallrings.includes(bond[0]) && ring.length<8) {
						bondsinsmallrings.push(bond[0])
					}
					if(value[0] === "aromatic" && !aromaticbonds.includes(bond[0])) {
						aromaticbonds.push(bond[0])
					}
				}
				if(i != value[2].length-1) {
					
					let bond = bondarr[ring[i]][ring[i+1]]
					
					if(!bondsinrings.includes(bond[0])) {
						bondsinrings.push(bond[0])
					}
					if(!bondsinsmallrings.includes(bond[0]) && ring.length<8) {
						bondsinsmallrings.push(bond[0])
					}
					if(value[0] == "aromatic" && !aromaticbonds.includes(bond[0])) {
						aromaticbonds.push(bond[0])
					}
					
				}
				if(value[0] == "aromatic") {
					aromaticpoints.push(ring[i])
				}
			}
		})
		
		//adds in all the hydrogen atoms on chiral atoms to ensure that they
		//appear in the smiles output for the purposes of canonicalisation. 
		//We can also take this opportunity to log all those chiral atoms, 
		//and ensure each one conforms to standard rules, as per IUPAC paper 2006. 
		
		let chiralAtoms = []
		let atomsCheckedForChirality = []
		let stereogenicBonds = bonds.filter(function(value, index, arr) {
			if(value[2] === 1 && value[3] !== 0) {
				return true
			}
		})
		
		//Quick function to determine the angle between two bonds, given the indices of
		//the chiralPoint and the two points in question
		function findAngle(chiralPoint, point1, point2) {
			let point1Coords = [points[point1][0] - points[chiralPoint][0], points[point1][1] - points[chiralPoint][1]]
			let point2Coords = [points[point2][0] - points[chiralPoint][0], points[point2][1] - points[chiralPoint][1]]
			
			let length1 = Math.sqrt(Math.pow(point1Coords[0], 2) + Math.pow(point1Coords[1], 2))
			let length2 = Math.sqrt(Math.pow(point2Coords[0], 2) + Math.pow(point2Coords[1], 2))
			
			let dotProduct = point1Coords[0] * point2Coords[0] + point1Coords[1] * point2Coords[1]
			
			return Math.acos(dotProduct / (length1 * length2))
		}
						
					
		//Determine if the atom has valid stereochemistry, following the rules 
		//outlined in the document included with this package. 
		
		$.each(stereogenicBonds, function(index, value) {
			//Setup a variable to hold whether the chiralPoint under examination is valid,
			//as determined by rules outlined in IUPAC document (Pure. Appl. Chem. (2006), Vol78(10), 1897-1970)
			let isValid = false
			
			let chiralPoint = -1
			//If the stereoInfo label is "1" or "2", then the stereochemistry belongs to the first listed atom. 
			//If the stereoInfo label is "3" or "4", then the stereochemistry belongs to the second listed atom. 
			if(value[3] === 1 || value[3] === 2) {
				chiralPoint = value[0]
			}
			else if(value[3] === 3 || value[3] === 4) {
				chiralPoint = value[1]
			}
					
			if(!atomsCheckedForChirality.includes(chiralPoint) && chiralPoint !== -1) {
				atomsCheckedForChirality.push(chiralPoint)
				//Determine the number of stereobonds that join with this point, as long 
				//as the narrow edge of the bond joins with this point
				
				let stereobonds = Object.entries(bondarr[chiralPoint]).filter(function(bvalue, bindex, arr) {
					if((bvalue[1][2] === 1 || bvalue[1][2] === 2) && bonds[bvalue[1][0]][0] === chiralPoint && bvalue[1][1] === 1) {
						return true
					}
					else if((bvalue[1][2] === 3 || bvalue[1][2] === 4) && bonds[bvalue[1][0]][1] === chiralPoint && bvalue[1][1] === 1) {
						return true
					}
					else {
						return false
					}
				})
				let stereoPoints = stereobonds.map(x => parseInt(x[0]))
				
				//Any other bonds which don't satisfy the above criteria are marked as "flatPoints"
				//in that whether they have stereoinfo or not, it does not contribute to any further calculations below. 
				let flatbonds = Object.entries(bondarr[chiralPoint]).filter(function(bvalue, bindex, arr) {
					if(!stereoPoints.includes(parseInt(bvalue[0]))) {
						return true
					}
				})
				let flatPoints = flatbonds.map(x => parseInt(x[0]))
				let chiralPointData = points[chiralPoint]
				
				//Determine whether any of the bonds the chiralPoint is a member of is unsaturated 
				let chiralPointIsUnsaturated = (Object.entries(bondarr[chiralPoint]).filter(x => x[1][1] !== 1).length > 0) ? true : false
				
				let isCarbonOrSulfur = (points[chiralPoint][2] === 67 || points[chiralPoint][2] === 83) ? true : false
				
				//If the chiralPoint is a carbon or sulfur atom and the atom's charge is zero, 
				//the chiralPoint is valid and a hydrogen should be added in
				//We check the charge to ensure if it's a carbon atom, its not a carbanion or carbocation
				//We check if saturated to ensure that chiral allenes are handled seperately. 
				//We check its a carbon or sulfur as these are the only valid examples where a hydrogen atom could be added. 
				if(points[chiralPoint][3].length === 3 && !chiralPointIsUnsaturated && isCarbonOrSulfur && points[chiralPoint][4] === 0) {
					if(stereobonds.length === 1) {
						//Check to make sure the two flat bonds are less than 180 degrees from each other
						let angle1 = findAngle(chiralPoint, flatPoints[0], flatPoints[1])
						if(angle1 < Math.PI) {
	
							//Add hydrogen atom and place it in correct place							
							isValid = true
							let coords = that.getNewPointCoords(chiralPoint)
							that.addpoint(coords[0], coords[1], chiralPoint, true)
							that.points[that.points.length-1][2] = 72
							
							//Set the stereoinfo of the bond to the new H-atom to be opposite to that of 
							//the existing stereobond
							that.bonds[that.bonds.length-1][3] = (stereobonds[0][1][2] === 1 || stereobonds[0][1][2] === 3) ? 2 : 1
							
							
							//Check to ensure that stereobond bisects large angle between flat bonds
							//if the sum of the angles from the Hatom to the two flatbonds
							//is less than 180 degrees, we need to reverse the direction of the hydrogen atom
							
							let angleHto1 = findAngle(chiralPoint, that.points.length - 1, flatPoints[0])
							let angleHto2 = findAngle(chiralPoint, that.points.length - 1, flatPoints[1])
							
							if((angleHto1 + angleHto2) < Math.PI) {
								let Hatom = that.points[that.points.length-1]
								let HatomCoords = [Hatom[0] - chiralPointData[0], Hatom[1] - chiralPointData[1]]
								Hatom[0] = chiralPointData[0] - HatomCoords[0]
								Hatom[1] = chiralPointData[1] - HatomCoords[1]
								
							}
							
						}	
					}
					
					else if(stereobonds.length === 2) {
						
						//check that the two stereobonds are of opposite configurations
						let ups = 0
						let downs = 0
						
						$.each(stereobonds, function(bindex, bvalue) {
							if(bvalue[1][2] === 1 || bvalue[1][2] === 3) {
								ups++
							}
							else {
								downs++
							}
						})
						
						if(ups === 1 && downs === 1) {
						
							//check that angle(AB) + angle(BC) is less than 180 degrees where
							//angle(AB) is less than angle(AC)
							//if yes, add a hydrogen and place it to bisect other bonds
							
							
							let angle1 = findAngle(chiralPoint, flatPoints[0], stereoPoints[0])
							let angle2 = findAngle(chiralPoint, flatPoints[0], stereoPoints[1])
							let angle3 = findAngle(chiralPoint, stereoPoints[1], stereoPoints[2])
							
							//Check that the flat bond does not bisect the small angle between the two stereopoints, 
							//with a margin of error to account for rounding. 
							if(angle1 + angle2 > angle3 + 0.0005) { 
								if(angle1 < angle2) {
									if((angle1 + angle3) < Math.PI) {
										isValid = true
									}
								}
								else {
									if((angle2 + angle3) < Math.PI) {
										isValid = true
									}	
								}
							}
							
							
							if(isValid) {
								//Add in the implicit hydrogen atom with a flat bond linking it to the chiralPoint
								let coords = that.getNewPointCoords(chiralPoint)
								that.addpoint(coords[0], coords[1], chiralPoint, true)
								that.points[that.points.length-1][2] = 72
								
								//Check to ensure that Hatom bisects largest angle made with exisiting points
								//Find that largest angle, then make sure Hatom bisects it
								let angleHtoFlat = findAngle(chiralPoint, that.points.length-1, flatPoints[0])
								let angleHtoStereo1 = findAngle(chiralPoint, that.points.length-1, stereoPoints[0])
								let angleHtoStereo2 = findAngle(chiralPoint, that.points.length-1, stereoPoints[1])
								
								let Hatom = that.points[that.points.length-1]
								let HatomCoords = [Hatom[0] - chiralPointData[0], Hatom[1] - chiralPointData[1]]
								
								if(angle1 < angle2) {
									if((angleHtoFlat + angleHtoStereo2) <= angle2 + 0.0005) {
										Hatom[0] = chiralPointData[0] - HatomCoords[0]
										Hatom[1] = chiralPointData[1] - HatomCoords[1]
									}
								}
								else {
									if((angleHtoFlat + angleHtoStereo1) <= angle1 + 0.0005) {
										Hatom[0] = chiralPointData[0] - HatomCoords[0]
										Hatom[1] = chiralPointData[1] - HatomCoords[1]
									}
								}
							}
							
						}	
						
						
					}
				}
				//If the atom is a chiral sulfoxide or equivalent
				else if(points[chiralPoint][3].length === 3 && points[chiralPoint][2] === 83 && points[chiralPoint][4] === 1) {
					if(stereobonds.length === 1) {
						
						let angle1 = findAngle(chiralPoint, flatPoints[0], flatPoints[1])
						if(angle1 < Math.PI) {
							isValid = true
						}
					}
					else if(stereobonds.length === 2) {
						//check that the two stereobonds are of opposite configurations
						let ups = 0
						let downs = 0
						
						$.each(stereobonds, function(bindex, bvalue) {
							if(bvalue[1][2] === 1 || bvalue[1][2] === 3) {
								ups++
							}
							else {
								downs++
							}
						})
						
						
						if(ups === 1 && downs === 1) {
						
							//check that angle(AB) + angle(BC) is less than 180 degrees where
							//angle(AB) is less than angle(AC)
							//if yes, add a hydrogen and place it to bisect other bonds
							
							
							let angle1 = findAngle(chiralPoint, flatPoints[0], stereoPoints[0])
							let angle2 = findAngle(chiralPoint, flatPoints[0], stereoPoints[1])
							let angle3 = findAngle(chiralPoint, stereoPoints[1], stereoPoints[2])
							
							//Check that the flat bond does not bisect the small angle between the two stereopoints, 
							//with a margin of error to account for rounding. 
							if(angle1 + angle2 > angle3 + 0.0005) { 
								if(angle1 < angle2) {
									if((angle1 + angle3) < Math.PI) {
										isValid = true
									}
								}
								else {
									if((angle2 + angle3) < Math.PI) {
										isValid = true
									}	
								}
							}
						}
					}
					
					
				}
				//If the chiral atom has four bonds...
				else if(points[chiralPoint][3].length === 4) {

					if(stereobonds.length === 1) {
						//Check if angle(AB) + angle(BC) is greater than 180 degrees

						let angle1 = findAngle(chiralPoint, flatPoints[0], flatPoints[1])
						let angle2 = findAngle(chiralPoint, flatPoints[1], flatPoints[2])
						let angle3 = findAngle(chiralPoint, flatPoints[2], flatPoints[0])
						
						//Take the sum of the two smallest angles (which is equal to sum of all angles minus the largest angle)
						let sumOfTwoMin = [angle1, angle2, angle3].reduce((x, y) => x + y, 0) - Math.max(angle1, angle2, angle3)
						//If this sum is greater than 180 degrees, the current point is valid
						if(sumOfTwoMin > Math.PI) { //If yes, set isValid = true
							isValid = true
							
						}
						else {//If no, check if AB or BC are part of ring
							let ringCheck = false
							//We must check to find which points are A and C (those with the largest angle between them)
							//as a ring between A and C does not make this point valid. Only a ring including A and B or 
							//B and C makes this stereopoint valid. 
							
							//Start by finding which points are A and C. 
							//They are the one with the largest angle between them. 
							//We can link that back to which flatPoints they are, because this info was hard coded above. 
							let maxAngle = [angle1, angle2, angle3].indexOf(Math.max(angle1, angle2, angle3))
							
							//There are three flat points connecting to a stereoPoint. Given that we have removed all 
							//ring systems, leaving only indivisble rings, only two of these points can be part of 
							//a ring. (If all three were, you'd have two fused 3-rings, to give a 4-membered ring 
							//system, which gets removed).
							$.each(rings, function(bindex, bvalue) {
								let overlap = bvalue[2].filter(x => flatPoints.includes(x))
								if(maxAngle === 0) {
									if(overlap.includes(flatPoints[0]) && overlap.includes(flatPoints[1])) {
										overlap = []
									}
								}
								else if(maxAngle === 1) {
									if(overlap.includes(flatPoints[1]) && overlap.includes(flatPoints[2])) {
										overlap = []
									}
								}
								else if(maxAngle === 2) {
									if(overlap.includes(flatPoints[2]) && overlap.includes(flatPoints[0])) {
										overlap = []
									}
								}
								if(overlap.length === 2) {
									ringCheck = true
									return false
								}
								
								
							})
							
							if(ringCheck) { //If yes, isValid = true; if no, isValid = false
								isValid = true
							}
							
							
						}							
					}
					else if (stereobonds.length === 2) {
						//Check if two stereobonds are one up and one down, or two up/two down
						
						
						let upPoints = stereobonds.filter(x => x[1][2] === 1 || x[1][2] === 3).map(x => x[0])
						let downPoints = stereobonds.filter(x => x[1][2] === 2 || x[1][2] === 4).map(x => x[0])
						
						
						if(upPoints.length === 1 && downPoints.length === 1) {
							
							let angle1 = findAngle(chiralPoint, flatPoints[0], downPoints[0])
							let angle2 = findAngle(chiralPoint, flatPoints[1], downPoints[0])
							let angle3 = findAngle(chiralPoint, flatPoints[0], flatPoints[1])
							
							//If the downPoint bisects the large angle between the flatPoints
							if(angle1 + angle2 > angle3 + 0.0005) {
								isValid = true
							}
							//A reasonable assumption of the stereochemistry can be made, 
							//though this code related to "not acceptable" structures 
							//according to IUPAC
							else if(angle1 + angle2 < Math.PI) {  
								//This reasonable assumption can be made in the case 
								//where the upbond bisects the large angle made by the flat points, 
								//and where this large angle is greater than 180 degrees. 
								let angle4 = findAngle(chiralPoint, flatPoints[0], upPoints[0])
								let angle5 = findAngle(chiralPoint, flatPoints[1], upPoints[0])
								
								if(angle4 + angle5 > angle3 + 0.0005) {
									//Move the downpoint position to overlap with the upPoint position. 
									isValid = true
									let [x, y] = [points[upPoints[0]][0], points[upPoints[0]][1]]
									points[downPoints[0]][0] = x
									points[downPoints[0]][1] = y
								}
							}
						}
						//Two upPoints (or downPoints) are only valid if 
						//there is a flatbond that bisects them. 
						else if(upPoints.length === 2 || downPoints.length === 2) {
							let thesePoints = (upPoints.length === 2) ? upPoints : downPoints
							
							let angle1 = findAngle(chiralPoint, thesePoints[0], thesePoints[1])
							let angle2 = findAngle(chiralPoint, thesePoints[0], flatPoints[0])
							let angle3 = findAngle(chiralPoint, thesePoints[1], flatPoints[0])
							
							let angle4 = findAngle(chiralPoint, thesePoints[0], flatPoints[1])
							let angle5 = findAngle(chiralPoint, thesePoints[1], flatPoints[1])
							//If one of the flatbonds, but not both, bisects the small angle
							//made between the two stereobonds, this is a valid depiction. 
							if(angle1 === Math.PI) {
								isValid = true
							}
							else if(angle2 + angle3 <= angle1 + 0.0005) {
								if(angle4 + angle5 > angle1) {
									isValid = true
								}
							}
							else if(angle4 + angle5 <= angle1 + 0.0005) {
								
								if(angle2 + angle3 > angle1) {
									isValid = true
								}
							}
							
							
							
							if(isValid) {
								//Set one of the stereobonds to be flat, 
								//and one of the flatbonds to take the opposite stereochemistry
								//this gives a sensible tetrahedron with one up bond and one down
								//for easy reading by the rest of this function. 
								bonds[stereobonds[0][1][0]][3] = 0
								bonds[flatbonds[0][1][0]][3] = (upPoints.length === 2) ? 2 : 1
								bonds[flatbonds[0][1][0]][0] = parseInt(chiralPoint)
								bonds[flatbonds[0][1][0]][1] = parseInt(flatbonds[0][0])
								
							}
						}
					}
				}
				//If the chiral point is unsaturated and has just three bonds
				//this is likely to be a chiral allene
				else if(chiralPointIsUnsaturated && points[chiralPoint][3].length === 3) {
					console.log("deal with the possibility of chiral allene")
				}
				
				if(isValid) {
					chiralAtoms.push(chiralPoint)
				}	
				
			
			}	
			
			
		})
		
		
		
		
		//Set a list of atoms to ignore. Presently it is only explicit hydrogens which should be ignored (as this is pointless and 
		//adds a great deal of computation complexity), unless they contain stereochemical information, or the atom it is attached to
		//has stereochemical information. 
		let pointsToIgnore = points.map(function(value, index, arr) {
			return index
		}).filter(function(value, index, arr) {
			let keeper = true
			if(points[value][2] === 72) {
				//Check all points the hydrogen atom is bonded to, and if any of them is a chiralAtom,
				//make sure that this hydrogen atom is NOT ignored!
				$.each(points[value][3], function(bindex, bvalue) {
					
					if(chiralAtoms.includes(bvalue)) {
						keeper = false
					}
				})
			}
			else {
				keeper = false
			}
			return keeper
		})
		
		
		
		
		//We know which bonds are aromatic: rebuilt the bondarr with all aromatic bonds set to 1.5, if the notKekule parameter is set to false
		if(notKekule) {
			$.each(aromaticbonds, function(index, value) {
				bonds[value][2] = 1.5
			})
		}
		
		//Re-run the formation of the bondarr to take account
		//of any hydrogen atoms or bond order changes which were added above. 	
		$.each(bonds, function(index, value) {
			bondarr[value[0]] = bondarr[value[0]] || {}
			bondarr[value[0]][value[1]] = [index, value[2], value[3]]
			bondarr[value[1]] = bondarr[value[1]] || {}
			bondarr[value[1]][value[0]] = [index, value[2], value[3]]
		})
		
		
		
		//Returns an array of chains, which will include the longest possible chain when starting from the given "startingpoint".
		//This fn makes no effort at the stage to determine which is in fact going to be the longest chain, as it would still 
		//need to be compared against chains generated from other "startingpoint"s. Therefore, do this later in below code. 
		function findLongestChain(startingpoint) {
			let donepoints = []
			donepoints.push([startingpoint])
			for(let i = 1; i<=points.length; i++) {
				$.each(donepoints, function(index, value) {		
					if(value.length == i) {
						let lastpoint = value[value.length-1]
						
						let matches = 0
						$.each(points[lastpoint][3], function(bindex, bvalue) {
							if(!value.includes(bvalue) && !pointsToIgnore.includes(bvalue)) {
								matches++
							}
						})
						
						$.each(points[lastpoint][3], function(bindex, bvalue) {
							if(!value.includes(bvalue) && !pointsToIgnore.includes(bvalue)) { 
								if(matches>1) {
									donepoints.push(value.concat(bvalue))
									matches--
								}
								else {
									value.push(bvalue)
								}
							}
						})
						
					}
				})
			}
			
			
			return donepoints
		}
		
		function findShortChains(parentchain) {
			let donepoints = []
			
			$.each(parentchain, function(index, value) {
				
				//get all the possible chains, of which a subset will be the longest. This function is basically the same 
				//as the one above used to get the longest chain. 
				donepoints.push([value])
				for(let i = 1; i<=points.length; i++) {
					$.each(donepoints, function(bindex, bvalue) {		
						if(bvalue.length == i) {
							let lastpoint = bvalue[bvalue.length-1]
							//Determine how many matches are generated first, so that we know how many times the 
							//current chain in donepoints (bvalue) needs to be copied. We need to get this right, 
							//as every chain that is returned needs to be valid, not just something half 
							//finished because it wasn't concatonated with the next point at the right time. 
							let matches = 0
							$.each(points[lastpoint][3], function(cindex, cvalue) {
								if(!bvalue.includes(cvalue) && !parentchain.includes(cvalue) && !pointsToIgnore.includes(cvalue)) { //Don't include H atoms
									matches++
								}
							})

							$.each(points[lastpoint][3], function(cindex, cvalue) {
								if(!bvalue.includes(cvalue) && !parentchain.includes(cvalue) && !pointsToIgnore.includes(cvalue)) { 
									if(matches>1) {
										donepoints.push(bvalue.concat(cvalue))
										matches--
									}
									else {
										bvalue.push(cvalue)
									}
								}
							})
						}
					})
				}
				
			})
			return donepoints.filter(function(value, index, arr) {
				if(value.length>1) {
					return value
				}
			})
		}
		
		function sortChains(shortchains, indices, length) {
			//build array using only those specified, which includes the index so we can easily reference it in the sort function
			let miniarray = shortchains.map(function(value, index, arr) { 
				if(indices.includes(index)) {
					return [index, value]
				}
				else {
					return false
				}
			})
			
			miniarray = miniarray.filter(function(value, index, arr) { //remove any false inserts from the map function
				if(value !== false) {
					return true
				}
			})
			
			let degeneratechains = []
			miniarray.sort(function(a, b) {
				let i = 0
				let returnvalue = 0
				while(i<length && returnvalue == 0) {
					let pointa = points[a[1][i]]
					let pointb = points[b[1][i]]
					
					if(atomdict[pointa[2]][2] > atomdict[pointb[2]][2]) {
						returnvalue = -1
					}
					else if (atomdict[pointa[2]][2] < atomdict[pointb[2]][2]) {
						returnvalue = 1
					}
					else if(i>0) { //If i is greater than 0, we can also compare bonds to sort chains
						let bonda = bondarr[a[1][i]][a[1][i-1]]
						let bondb = bondarr[b[1][i]][b[1][i-1]]
						
						if(bonda[1] > bondb[1]) {
							returnvalue = -1
						}
						else if(bonda[1] < bondb[1]) {
							returnvalue = 1
						}
					}
					i++
				}
				if(returnvalue == 0) {
					//Even if two chains are exactly the same, we only need to flag them as degenerate if they share any points. 
					//Two chains which are the same, but at completely different places of the molecule, cannot interfere. 
					//Therefore, there is no need to generate all possible orders for these two chains. 
					let overlap = a[1].filter(value => b[1].includes(value))
					//if(overlap.length > 0) {
						degeneratechains.push([a[0], b[0]])
					//}
				}
			
				return returnvalue
				
			})
			let returnvalue = [miniarray.map(x => x[0]), degeneratechains]
			return returnvalue
		}
		
		//Get all possible orders for moving through a set of data marked 1, 2 3, etc
		function randomiser(inputset) {
			let output = inputset.map(x => [x])
			
			for(let i = 1; i<inputset.length; i++) {
				$.each(output, function(index, value) {
					
					for(let j = 0; j<inputset.length; j++) {
						if(!output[index].includes(inputset[j])) {
							if(j == inputset.length - 1) {
								output[index] = value.concat(inputset[j])
							}
							else {
								output.push(value.concat(inputset[j]))
							}
						}
					}
				})
			}
			return output.filter(function(value, index, arr) {
				return value.length == inputset.length 
			})
		}
		
		
		//This function determines the stereolabel given the centrePoints (chiral atoms/chiral centre for non-point chiral cases)
		//and the four key adjacent points.
		function getStereoLabel(initialstring, newstring, centrePoints, adjPoints) {
			let stereoInfo = {}
			let rings = that.findRings()
			
			//Next we need to label the points bonded to the stereogenic centre, by the order they appear in the string, or by 
			//the order their bonds appear if the stereogenicAtom and its neighbour at part of a ring. 
			
			//Search for the point/points (if it exists) where it does not immediately follow nor precede the stereogenicAtom
			//meaning that it must be part of the ring (multiple rings).
			let ringpoints = []
			
			if(centrePoints.length === 1) {
				
				$.each(adjPoints, function(bindex, bvalue) {
					let isAdjacent = false
					let index1 = initialstring.PIO.indexOf(bvalue)
					let index2 = initialstring.PIO.indexOf(stereogenicAtom)
					if(Math.abs(index1-index2) === 1 && index1 > -1 && index2 > -1) {
						isAdjacent = true
					}
					else {
						$.each(newstring.chainRecords, function(cindex, cvalue) { 
							let index3 = cvalue.indexOf(bvalue)
							let index4 = cvalue.indexOf(stereogenicAtom)
							if(index3 > -1 && index4 > -1 && Math.abs(index3-index4) === 1) {
								isAdjacent = true
								return false
							}
						})
					}
					//if neither of the above tests are true, this point is bonded to the stereogenic atom but is part of 
					//a ring (i.e. not adjacent to the stereogenic atom). 
					if(!isAdjacent) {
						ringpoints.push(bvalue)
					}
						
				})
			}
			
			else if(centrePoints.length === 2) {
				adjPoints.forEach((value, index, arr) => {
					let isAdjacent = false
					let index1 = initialstring.PIO.indexOf(value)
					let index2 = initialstring.PIO.indexOf(centrePoint[0])
					let index2 = initialstring.PIO.indexOf(centrePoint[1])
					
					if(Math.abs(index1-index2) == 1 && index1 > -1 && index2 > -1) {
						isAdjacent = true
					}
					else if(Math.abs(index1-index3) === 1 && index1 > -1 && index3 > -1) {
						isAdjacent = true
					}
					else {
						newstring.chainRecords.forEach((bvalue, bindex, barr) => {
							let index4 = bvalue.indexOf(value)
							let index5 = bvalue.indexOf(centrePoint[0])
							let index6 = bvalue.indexOf(centrePoint[1])
							if(Math.abs(index4-index5) == 1 && index4 > -1 && index5 > -1) {
								isAdjacent = true
							}
							else if(Math.abs(index4-index6) === 1 && index4 > -1 && index6 > -1) {
								isAdjacent = true
							}
							
						})
					}
					
					if(!isAdjacent) {
						ringpoints.push(bvalue)
					}					
				})
			}
			
			
			//Sort the array of bonded points (points[index][3]) by order they appear in string. 
			//First, make a copy of the array of bonded points which we can then sort
			let ranking = adjPoints.concat([])
			
			ranking.sort(function(a, b) {
				//If one of the atoms is a dummy atom, make sure this goes at the very end of the ranking. 
				if(points[a][2] === 601) {
					return 1
				}
				else if(points[b][2] === 601) {
					return -1
				}
				else if(ringpoints.length === 0) {
					return newstring.string.indexOf(a) - newstring.string.indexOf(b)
				}
				else {
					//If one of the bonds connecting the centrePoint with its neighbour is part of a ring, slightly modified
					//rules apply. It is the order of the bonds to the centrePoint which determine the numbering order. 
					if(ringpoints.includes(a) && ringpoints.includes(b)) {
						let ringIndexA = newstring.string[newstring.string.indexOf(a)+1]
						let ringIndexB = newstring.string[newstring.string.indexOf(b)+1]
						
						//There could be up to four ring points: we need to determine in which order those ring points come 
						//after the stereogenic atoms. 
						let ring1 = newstring.string[newstring.string.indexOf(stereogenicAtom)+1]
						let ring2 = newstring.string[newstring.string.indexOf(stereogenicAtom)+2]
						let ring3 = newstring.string[newstring.string.indexOf(stereogenicAtom)+3]
						let ring4 = newstring.string[newstring.string.indexOf(stereogenicAtom)+4]
						
						let ringIndices = [ring1, ring2, ring3, ring4]
						if(ringIndices.indexOf(ringIndexA) < ringIndices.indexOf(ringIndexB)) {
							return -1
						}
						else {
							return 1
						}
					}
					else if(ringpoints.includes(b)) {
						if(newstring.string.indexOf(a) < newstring.string.indexOf(stereogenicAtom)) {
							return -1 //a should come first
						}
						else {
							return 1 //b, the ringpoint, should come first
						}
					}
					else if(ringpoints.includes(a)) {
						if(newstring.string.indexOf(b) < newstring.string.indexOf(stereogenicAtom)) {
							return 1 //b should come first
						}
						else {
							return -1 //a, the ringpoint, should come first
						}
						
					}
					else { //If neither of the two points currently examined are part of the ring, then normal rules apply
						if(newstring.string.indexOf(a) < newstring.string.indexOf(b)) {
							return -1 //a should come first
						}
						
						else {
							return 1 //b should come first
						}
					}
					
				}

			})
		}
		
		function insertStereoChem(initialstring, newstring) {
			
			//Set variable to store information about all the chiralAtoms. 
			let stereoInfo = {}
			
			//Find which bonds are part of a ring
			let rings = that.findRings()
			
			
			console.log("insert code to force ignoring allenes")
			$.each(chiralAtoms, function(index, value) {
					
				let stereogenicAtom = value
				let centrePoint = points[stereogenicAtom]	
					
				//Next we need to label the points bonded to the stereogenic centre, by the order they appear in the string, or by 
				//the order their bonds appear if the stereogenicAtom and its neighbour at part of a ring. 
				
				//Search for the point/points (if it exists) where it does not immediately follow nor precede the stereogenicAtom
				//meaning that it must be part of the ring (multiple rings).
				let ringpoints = []
				$.each(centrePoint[3], function(bindex, bvalue) {
					let isAdjacent = false
					let index1 = initialstring.PIO.indexOf(bvalue)
					let index2 = initialstring.PIO.indexOf(stereogenicAtom)
					if(Math.abs(index1-index2) == 1 && index1 > -1 && index2 > -1) {
						isAdjacent = true
					}
					else {
						$.each(newstring.chainRecords, function(cindex, cvalue) { 
							let index3 = cvalue.indexOf(bvalue)
							let index4 = cvalue.indexOf(stereogenicAtom)
							if(index3 > -1 && index4 > -1 && Math.abs(index3-index4) == 1) {
								isAdjacent = true
								return false
							}
						})
					}
					//if neither of the above tests are true, this point is bonded to the stereogenic atom but is part of 
					//a ring (i.e. not adjacent to the stereogenic atom). 
					if(!isAdjacent) {
						ringpoints.push(bvalue)
					}
					
				})
				
				//If there is a chiral, positively charged sulfur with just three bonds, add a dummy point to represent the 
				//lone pair, which will enable determination of the chiral label. 
				if(centrePoint[2] === 83 && centrePoint[3].length === 3 && centrePoint[4] === 1) {
					let coords = that.getNewPointCoords(stereogenicAtom)
					that.addpoint(coords[0], coords[1], stereogenicAtom, true)
					that.points[that.points.length-1][2] = 601
					
					//Determine the number of stereobonds that join with this point, as long 
					//as the narrow edge of the bond joins with this point
					
					let stereobonds = Object.entries(bondarr[stereogenicAtom]).filter(function(bvalue, bindex, arr) {
						if((bvalue[1][2] === 1 || bvalue[1][2] === 2) && bonds[bvalue[1][0]][0] === stereogenicAtom) {
							return true
						}
						else if((bvalue[1][2] === 3 || bvalue[1][2] === 4) && bonds[bvalue[1][0]][1] === stereogenicAtom) {
							return true
						}
						else {
							return false
						}
					})
					let stereoPoints = stereobonds.map(x => parseInt(x[0]))
					
					//Any other bonds which don't satisfy the above criteria are marked as "flatPoints"
					//in that whether they have stereoinfo or not, it does not contribute to any further calculations below. 
					let flatbonds = Object.entries(bondarr[stereogenicAtom]).filter(function(bvalue, bindex, arr) {
						if(!stereoPoints.includes(parseInt(bvalue[0]))) {
							return true
						}
					})
					let flatPoints = flatbonds.map(x => parseInt(x[0]))
					
					//Check to ensure that Hatom bisects largest angle made with exisiting points
					//Find that largest angle, then make sure Hatom bisects it
					
					let dummyToFlat1 = findAngle(stereogenicAtom, that.points.length-1, flatPoints[0])
					let dummyToFlat2 = findAngle(stereogenicAtom, that.points.length-1, flatPoints[1])

					if((dummyToFlat1 + dummyToFlat2) < Math.PI) {
						let dummyAtom = that.points[that.points.length-1]
						let dummyAtomCoords = [dummyAtom[0] - centrePoint[0], dummyAtom[1] - centrePoint[1]]
						dummyAtom[0] = centrePoint[0] - dummyAtomCoords[0]
						dummyAtom[1] = centrePoint[1] - dummyAtomCoords[1]
						
					}
					
					//Re-run the formation of the bondarr to take account
					//of the dummy atom added
					$.each(bonds, function(index, value) {
						bondarr[value[0]] = bondarr[value[0]] || {}
						bondarr[value[0]][value[1]] = [index, value[2], value[3]]
						bondarr[value[1]] = bondarr[value[1]] || {}
						bondarr[value[1]][value[0]] = [index, value[2], value[3]]
					})					
					
				}
				
				
				//Sort the array of bonded points (points[index][3]) by order they appear in string. 
				//First, make a copy of the array of bonded points which we can then sort
				let ranking = centrePoint[3].concat([])
				
				ranking.sort(function(a, b) {
					//If one of the atoms is a dummy atom, make sure this goes at the very end of the ranking. 
					if(points[a][2] === 601) {
						return 1
					}
					else if(points[b][2] === 601) {
						return -1
					}
					else if(ringpoints.length === 0) {
						return newstring.string.indexOf(a) - newstring.string.indexOf(b)
					}
					else {
						//If one of the bonds connecting the centrePoint with its neighbour is part of a ring, slightly modified
						//rules apply. It is the order of the bonds to the centrePoint which determine the numbering order. 
						if(ringpoints.includes(a) && ringpoints.includes(b)) {
							let ringIndexA = newstring.string[newstring.string.indexOf(a)+1]
							let ringIndexB = newstring.string[newstring.string.indexOf(b)+1]
							
							//There could be up to four ring points: we need to determine in which order those ring points come 
							//after the stereogenic atoms. 
							let ring1 = newstring.string[newstring.string.indexOf(stereogenicAtom)+1]
							let ring2 = newstring.string[newstring.string.indexOf(stereogenicAtom)+2]
							let ring3 = newstring.string[newstring.string.indexOf(stereogenicAtom)+3]
							let ring4 = newstring.string[newstring.string.indexOf(stereogenicAtom)+4]
							
							let ringIndices = [ring1, ring2, ring3, ring4]
							if(ringIndices.indexOf(ringIndexA) < ringIndices.indexOf(ringIndexB)) {
								return -1
							}
							else {
								return 1
							}
						}
						else if(ringpoints.includes(b)) {
							if(newstring.string.indexOf(a) < newstring.string.indexOf(stereogenicAtom)) {
								return -1 //a should come first
							}
							else {
								return 1 //b, the ringpoint, should come first
							}
						}
						else if(ringpoints.includes(a)) {
							if(newstring.string.indexOf(b) < newstring.string.indexOf(stereogenicAtom)) {
								return 1 //b should come first
							}
							else {
								return -1 //a, the ringpoint, should come first
							}
							
						}
						else { //If neither of the two points currently examined are part of the ring, then normal rules apply
							if(newstring.string.indexOf(a) < newstring.string.indexOf(b)) {
								return -1 //a should come first
							}
							
							else {
								return 1 //b should come first
							}
						}
						
					}

				})
				
				//Now that we have a sort order, we need to find the bond that points "Up". Here we initialise "inversions", which will keep 
				//track of any inversions we make as result of making this problem easier for ourselves. 
				//Explanation: Ordinarily we would have to rotate the 3D coordinates of the 4 points so that we could "look" down the correct point. 
				//If would be easier if we could just look down the point that came towards us, as no rotation would be necessary. 
				//This is possible if we exchange the "up" point and the point we need to look down, and keep track of this. 
				//For every inversion that occurs, an "@" result becomes "@@" and vice versa. 
				//An even number of inversions will give a final result that was the same as the initial one, and an odd number of inversions 
				//will give the opposite result. 
				
				let inversions = 0
				
				let upPoint = -1
				$.each(centrePoint[3], function(bindex, bvalue) {
					if(bondarr[stereogenicAtom][bvalue][2] == 1 || bondarr[stereogenicAtom][bvalue][2] == 3) {
						upPoint = bvalue
					}
				})
				//If we can't find an up point, use a downpoint instead and convert that to point up
				//add 1 to the inversion count. (i.e. we have taken the mirror image of the molecule). 
				if(upPoint === -1) {
					$.each(centrePoint[3], function(bindex, bvalue) {
						let bondIndex = bondarr[stereogenicAtom][bvalue][0]
						if(bonds[bondIndex][3] == 2) {
							upPoint = bvalue
							bonds[bondIndex][3] = 1
							inversions++
						}
						else if(bonds[bondIndex][3] == 4) {
							upPoint = bvalue
							bonds[bondIndex][3] = 3
							inversions++
						}
					})
				}
				
				//We need to determine if the point we are looking down is the correct one, or if we need to do a swap. 
				//When we swap, the ranking needs to remain the same, i.e. the point which takes the place of the one
				//that needs to be looked down, needs to give away its priority. 
				
				
				if(ranking[0] != upPoint) {
					let oldranking = ranking.indexOf(upPoint)
					ranking[oldranking] = ranking[0]
					ranking[0] = upPoint
					inversions++
				}
				
				let rotationCount = 0
				for(let i = 1; i<4; i++) {
					if(i != 3) {
						let x = (points[ranking[i+1]][0] - points[ranking[i]][0])
						let y = (points[ranking[i+1]][1] + points[ranking[i]][1])
						rotationCount = rotationCount + (x * y)
					}
					else {
						let x = (points[ranking[1]][0] - points[ranking[i]][0])
						let y = (points[ranking[1]][1] + points[ranking[i]][1])
						rotationCount = rotationCount + (x * y)
					}
					
				}
				
				let result = ""
				if(rotationCount > 0) {
					if(inversions%2 == 0) {
						result = "@"
					}
					else {
						result = "@@"
					}
					
				}
				else {
					if(inversions%2 == 0) {
						result = "@@"
					}
					else {
						result = "@"
					}
				}
				stereoInfo[stereogenicAtom] = result		
			})
			
			return stereoInfo
					
		}
		
		function insertAlkeneGeometry(initialstring, newstring) {
			
			let alkenes = bonds.filter(function(value, index, arr) {
				if(value[2] == 2 && !bondsinsmallrings.includes(index)) {
					return true
				}
				
			})
			
			//remove any double bonds (named "alkenes", but currently including carbonyls, imines, oximes, etc)
			//to only those where the stereochemistry is an issue. 
			
			alkenes = alkenes.filter(function(value, index, arr) {
				let pointA = points[value[0]]
				let pointB = points[value[1]]
				
				if(pointA[3].length > 1 && pointB[3].length > 1) {
					return true
				}
			})
			
			
			//Sort the alkenes by the order in which they appear in the string.
			
			alkenes.sort(function(a, b) {
				let firsta = (newstring.string.indexOf(a[0]) < newstring.string.indexOf(a[1])) ? newstring.string.indexOf(a[0]) : newstring.string.indexOf(a[1])
				let firstb = (newstring.string.indexOf(b[0]) < newstring.string.indexOf(b[1])) ? newstring.string.indexOf(b[0]) : newstring.string.indexOf(b[1])
				
				return firsta - firstb
			})
			
			
			
			let subsForAlks = []
			
			$.each(alkenes, function(index, value) {
				let subA, subB, alkeneA, alkeneB
				
				//Find which is the first alkene point and which the second
				// and find the first substituent for the each alkene point, labelled subA and subB
				
				if(newstring.string.indexOf(value[0]) < newstring.string.indexOf(value[1])) {
					alkeneA = value[0]
					alkeneB = value[1]
					let subs = points[value[0]][3].filter(function(bvalue, bindex, arr) {
						if(![value[0], value[1]].includes(bvalue) && newstring.string.indexOf(bvalue) > -1) {
							return true
						}
						else {
							return false
						}
					})
					
					subA = subs.sort(function(a, b) {
						return newstring.string.indexOf(a) - newstring.string.indexOf(b)
					})[0]
					subs = points[value[1]][3].filter(function(bvalue, bindex, arr) {
						if(![value[0], value[1]].includes(bvalue) && newstring.string.indexOf(bvalue) > -1) {
							return true
						}
						else {
							return false
						}
					})
				
					subB = subs.sort(function(a, b) {
						return newstring.string.indexOf(a) - newstring.string.indexOf(b)
					})[0]
				}
				else {
					alkeneA = value[1]
					alkeneB = value[0]
					let subs = points[value[1]][3].filter(function(bvalue, bindex, arr) {
						if(![value[0], value[1]].includes(bvalue) && newstring.string.indexOf(bvalue) > -1) {
							return true
						}
						else {
							return false
						}
					})
					
					subA = subs.sort(function(a, b) {
						return newstring.string.indexOf(a) - newstring.string.indexOf(b)
					})[0]
					
					subs = points[value[0]][3].filter(function(bvalue, bindex, arr) {
						if(![value[0], value[1]].includes(bvalue) && newstring.string.indexOf(bvalue) > -1) {
							return true
						}
						else {
							return false
						}
					})
					subB = subs.sort(function(a, b) {
						return newstring.string.indexOf(a) - newstring.string.indexOf(b)
					})[0]
				}
				if(subA !== undefined && subB !== undefined) {
					subsForAlks.push([alkeneA, alkeneB, subA, subB])
				}
			})
			
			
			//Find the pairs of alkenes which are conjugated.
			//Then find overlapping pairs and combine them into conjugated chunks (containtaining all conjugated
			//and cross conjugated pairs)
			let conjugatedPairs = []
			
			$.each(alkenes, function(index, value) {
				$.each(alkenes, function(bindex, bvalue) {
					if(bindex > index) {
						let pointA1 = points[value[0]]
						let pointA2 = points[value[1]]
						
						if(pointA1[3].includes(bvalue[0]) || pointA1[3].includes(bvalue[1]) || pointA2[3].includes(bvalue[0]) || pointA2[3].includes(bvalue[1])) {
							conjugatedPairs.push([index, bindex])
						}
					}
				})
			})
			
			let PiSystems = []
			$.each(conjugatedPairs, function(index, value) {
				let pairAdded = false
				$.each(PiSystems, function(bindex, bvalue) {
					if(bvalue.includes(value[0]) || bvalue.includes(value[1])) {
						PiSystems[bindex] = PiSystems[bindex].concat(value)
						
						pairAdded = true
					
					}
				
				})
				if(!pairAdded) {
					PiSystems.push(value)
				}
			}) 
			//remove any duplicate alkenes from each PiSystem
			$.each(PiSystems, function(index, value) {
				PiSystems[index] = value.filter((x, y, arr) => arr.indexOf(x) === y)
			})
			
			//Then add in all single, non conjugated alkenes as a PiSystem.  
			for(let i = 0; i<alkenes.length; i++) {
				let alkeneFound = false
				$.each(PiSystems, function(index, value) {
					if(value.includes(i)) {
						alkeneFound = true
					}
				})
				if(!alkeneFound) {
					PiSystems.push([i])
				}
			}
			
			//For each alkene, find whether the bond connecting the substituent to the alkene is pointing forwards 
			//or backwards. This MUST be done by comparison of the angle made to the x-axis to the angle made 
			//by the alkene bond itself. 
			$.each(subsForAlks, function(index, value) {
				
				let bondAngle = Math.atan2(points[value[1]][1]-points[value[0]][1], points[value[1]][0]-points[value[0]][0])
				if(Math.abs(bondAngle) > Math.PI/2) {
					bondAngle = Math.atan2(points[value[0]][1]-points[value[1]][1], points[value[0]][0]-points[value[1]][0])
				}
				
				
				let angleSubA = Math.atan2(points[value[2]][1]-points[value[0]][1], points[value[2]][0]-points[value[0]][0])
				let labelSubA = (angleSubA < bondAngle) ? "forwards" : "backwards"
				

				
				let angleSubB = Math.atan2(points[value[3]][1]-points[value[1]][1], points[value[3]][0]-points[value[1]][0])
				let labelSubB = (angleSubB > bondAngle) ? "forwards" : "backwards"
				
				subsForAlks[index].push(labelSubA)
				subsForAlks[index].push(labelSubB)
			})
			
			
			//There are two situations for a pair of conjugated alkenes, either:
			// - subB of alkene 1 = alkeneA of alkene 2, in which case labelsubB of alkene 1 should equal labelsubA of alkene2
			// - subB of alkene 2 != alkeneA of alkene 2, in which case labelsubA of alkene 2 should be set to the opposite of labelsubB of alkene1
			//We need to run through all conjugated pairs, in order of their appearance in the string (which is already been determined)
			//and ensure that this is the case, swapping label A and label B appropriately. 
			$.each(conjugatedPairs, function(index, value) {
				let alkene1 = value[0]
				let alkene2 = value[1]
				
				if(subsForAlks[alkene1][3] === subsForAlks[alkene2][0]) {
					if(subsForAlks[alkene1][5] !== subsForAlks[alkene2][4]) {
						
						subsForAlks[alkene2][4] = (subsForAlks[alkene2][4] == "forwards") ? "backwards" : "forwards"
						subsForAlks[alkene2][5] = (subsForAlks[alkene2][5] == "forwards") ? "backwards" : "forwards"
					}
				}
				else {
					if(subsForAlks[alkene1][5] === subsForAlks[alkene2][4]) {
						subsForAlks[alkene2][4] = (subsForAlks[alkene2][4] == "forwards") ? "backwards" : "forwards"
						subsForAlks[alkene2][5] = (subsForAlks[alkene2][5] == "forwards") ? "backwards" : "forwards"
					}
				}
			})
			
			
			//For the purposes of obtaining a canonical smiles, we should ensure that the very first label 
			//of every pi system begins with the same label, which we arbitraily choose to be "forwards"
			$.each(PiSystems, function(index, value) {
				if(subsForAlks[value[0]][4] === "backwards") {
					$.each(value, function(bindex, bvalue) {
						subsForAlks[bvalue][4] = (subsForAlks[bvalue][4] == "forwards") ? "backwards" : "forwards"
						subsForAlks[bvalue][5] = (subsForAlks[bvalue][5] == "forwards") ? "backwards" : "forwards"
					})
				}
				
			})
			
			function findLabelPosition(alkenePoint, subPoint, AorB) {
				let labelPosition = -1
				let switchMe = false //Keep track of whether, as a result of the label occuring AFTER the alkenePoint, the label should be reversed
				
				let subIsAdjacent = false
				let index1 = initialstring.PIO.indexOf(alkenePoint)
				let index2 = initialstring.PIO.indexOf(subPoint)
				if(Math.abs(index1-index2) == 1 && index1 > -1 && index2 > -1) {
					subIsAdjacent = true
				}
				else {
					$.each(newstring.chainRecords, function(bindex, bvalue) { 
						let index3 = bvalue.indexOf(alkenePoint)
						let index4 = bvalue.indexOf(subPoint)
						if(index3 > -1 && index4 > -1 && Math.abs(index3-index4) == 1) {
							subIsAdjacent = true
							return false
						}
					})
				}
				
				if(subIsAdjacent === true) {
					if(AorB === "A") {
						if(newstring.string.indexOf(alkenePoint) < newstring.string.indexOf(subPoint)) {
							labelPosition = newstring.string.indexOf(subPoint)
							switchMe = true
						}
						else {
							labelPosition = newstring.string.indexOf(alkenePoint)
						}
					}
					else {
						labelPosition = newstring.string.indexOf(subPoint)
					}
				}
				else {
					//There may be more than one ring label after both the sub and alkene points. We need to find the one 
					//that is present for both the substituent atom AND the alkene atom, and then use its position 
					//to guide where the stereo label is placed. 
					let ringlabelsaftersub = [newstring.string[newstring.string.indexOf(subPoint)+1]]
					let recentfind = true
					while(recentfind) {
						let newitem = newstring.string[newstring.string.indexOf(subPoint) + ringlabelsaftersub.length + 1]
						if(placeholders.includes(newitem)) { //the placeholders are used to denote where ring labels will eventually be placed. 
							ringlabelsaftersub.push(newitem)
						}
						else {
							recentfind = false
						}
					}
					
					let ringlabelsafteralk = [newstring.string[newstring.string.indexOf(alkenePoint)+1]]
					recentfind = true
					while(recentfind) {
						let newitem = newstring.string[newstring.string.indexOf(alkenePoint) + ringlabelsafteralk.length + 1]
						if(placeholders.includes(newitem)) {
							ringlabelsafteralk.push(newitem)
						}
						else {
							recentfind = false
						}
					}
					
					let ringlabel = ringlabelsaftersub.filter(x => ringlabelsafteralk.includes(x))
					labelPosition = newstring.string.indexOf(ringlabel[0])
					
					let distanceToAlkene = Math.abs(labelPosition - newstring.string.indexOf(alkenePoint))
					let distanceToSub = Math.abs(labelPosition - newstring.string.indexOf(subPoint))
					if(AorB === "A") {
						if(distanceToAlkene < distanceToSub) {
							switchMe = true
						}
					}
					else {
						if(distanceToSub < distanceToAlkene) {
							switchMe = true
						}
					}
				}
				
				return [labelPosition, switchMe]
			}
			
			
			//finally, insert the labels into the correct position of the newstring
			$.each(subsForAlks, function(index, value) {
				let labelA = findLabelPosition(value[0], value[2], "A")
				let goinginA = ""
				if(labelA[1] === true) {
					goinginA = (value[4] === "forwards") ? "backwards" : "forwards"
				}
				else {
					goinginA = (value[4] === "forwards") ? "forwards" : "backwards"
				}
				
				newstring.string.splice(labelA[0], 0, goinginA)
				
				
				let labelB = findLabelPosition(value[1], value[3], "B")
				let goinginB = ""
				if(labelB[1] === true) {
					goinginB = (value[5] === "forwards") ? "backwards" : "forwards"
				}
				else {
					goinginB = (value[5] === "forwards") ? "forwards" : "backwards"
				}
				
				newstring.string.splice(labelB[0], 0, goinginB)
				
			})
			
			//The above set of functions may put two forwards or two backwards directly next to each other for a
			//a set of conjugated alkenes. Therefore, remove any duplicate values. 
			let markForDeletion = []
			for(let i=1; i<newstring.string.length; i++) {
				if(newstring.string[i] === newstring.string[i-1]) {
					if(newstring.string[i] === "forwards" || newstring.string[i] === "backwards") {
						markForDeletion.push(i)
					}
				}
			}
			newstring.string = newstring.string.filter(function(value, index, arr) {
				if(!markForDeletion.includes(index)) {
					return true
				}
			})
			
			//Now that we've finished comparing different values in the newstring.string
			//map all the "forwards" and "backwards" to "/" and "\". This has been done
			//like this as a backslash is the escape character which could cause unexpected effects. 
			newstring.string = newstring.string.map(function(value, index, arr) {
				if(value === "forwards") {
					return "/"
				}
				else if(value === "backwards") {
					let returnvalue = "\\"
					return returnvalue
				}
				else {
					return value
				}
			})
					
					
			return [initialstring, newstring]
		}
		
		
		
		//find all the potential longest chains using pre-written function above
		let longchains = []
		$.each(points, function(index, value) {
			if(!pointsToIgnore.includes(index)) { //Don't include hydrogen atoms
				let goingin = findLongestChain(index)
				Array.prototype.push.apply(longchains, goingin)
			}
		})
		
		//find the length of the longest chain(s)
		let longlength = 0
		$.each(longchains, function(index, value) {
			if(value.length > longlength) {
				longlength = value.length
			}
		})
		
		//keep only the longest chains
		longchains = longchains.filter(function(value, index, arr) {
			if(value.length === longlength) {
				return value
			}
		})
		
		//Keep only the longchains which move through the points from highest molecular weight to lowest molecular weight
		let iterations = 0
		while(longchains.length > 1 && iterations < longlength) {
			let keepers = []
			let highestMW = 0
			
			$.each(longchains, function(index, value) {
				
				if(atomdict[points[value[iterations]][2]][2] > highestMW) {
					highestMW = atomdict[points[value[iterations]][2]][2]
				}
			})
			
			longchains = longchains.filter(function(value, index, arr) {
				if(atomdict[points[value[iterations]][2]][2] === highestMW || !atomdict[points[value[iterations]][2]][2]) {
					return true
				}
			})
			iterations++
		}
		
		
		//Now, iterate through the longest chain, checking for rings as we go. The smiles string will be built initially from the longest chain
		//checking for rings as we progress through the chain. We use the "pointsinorder" to keep track of which characters in the smiles
		//string correspond to which points
		
		let stringcounter = 0
		$.each(longchains, function(index, value) {
			
			let initialstring = {
				string: [],
				PIO: [],
				chainRecords: []
			}
			
			
			
			$.each(value, function(bindex, bvalue) {
				let point = points[bvalue]
				if(bindex>0) {
					let bondorder = bondarr[bvalue][value[bindex-1]][1]
					if(bondorder == 2 && (!aromaticpoints.includes(bvalue) || !notKekule)) {
						initialstring.string.push("=")
					}
					else if(bondorder == 3) {
						initialstring.string.push("#")
					}
				}
				
				initialstring.string.push(bvalue)
				initialstring.PIO.push(bvalue)
			})
			
			
			let shortchains = findShortChains(value).sort(function(a, b) {
				return b.length-a.length
			})
			

			if(shortchains.length > 0) {
				let SClengths = {} //shortchainlengths
				$.each(shortchains, function(bindex, bvalue) {
					SClengths[bvalue.length] = SClengths[bvalue.length] || []
					SClengths[bvalue.length].push(bindex)
				})
				
				// take all keys to generate an array, then use the map function to generate new array comprised of numeric values rather
				//than strings, then find the maximum value
				let longest = Math.max.apply(null, Object.keys(SClengths).map(x => parseInt(x))) 
				
				
				let instructions = []
				for(let i = longest; i>0; i--) {
					
					if(SClengths[i]) {
					
						//If there is only one chain of that lengths, this is the easy case. Every half complete instruction
						//gets appended with this one chain. 
						if(SClengths[i].length == 1) {
							if(instructions.length == 0) {
								instructions.push([SClengths[i][0]])
							}
							else {
								$.each(instructions, function(bindex, bvalue) {
									instructions[bindex].push(SClengths[i][0])
								})
							}
						}
						else {
							//sort all the chains so that those that begin with highest MW atoms/highest bonds orders come first
							let sortorder = sortChains(shortchains, SClengths[i], i) 
							
							let degenerates = []
							//degenerate chains are given as just pairs, whereas there may be a degenrate set containing 3 or more chains
							//combine all degenerate chains into one set, and store all these degenerate sets inside the "degenerates" array
							$.each(sortorder[1], function(bindex, bvalue) {
								let found = -1
								$.each(degenerates, function(cindex, cvalue) {
									if(cvalue.includes(bvalue[0]) || cvalue.includes(bvalue[1])) {
										found = cindex
										return false
									}
								})
								
								if(found>-1) {
									if(!degenerates[found].includes(bvalue[0])) {
										degenerates[found].push(bvalue[0])
									}
									if(!degenerates[found].includes(bvalue[1])) {
										degenerates[found].push(bvalue[1])
									}
									
								}
								
								else {
									degenerates.push(bvalue)
								}
									
							})
							
							
							//Filter the degenerates to remove any chains which look the same, but are at different ends of the molecule. 
							//These chains cannot interfere with each other, so there is no need to generate all possible orders of 
							//iterating through these chains. 
							let doNotIncludes = {}
							
							$.each(degenerates, function(bindex, bvalue) {
								doNotIncludes[bindex] = []
								for(let i=0; i<bvalue.length; i++) {
									let anyoverlap = false
									let currentchain = shortchains[bvalue[i]]
									
									for(let j = 0; j<bvalue.length; j++) {
										if(i != j) {
											
											let otherchain = shortchains[bvalue[j]]
											let overlap = currentchain.filter(cvalue => otherchain.includes(cvalue)).length
											
											if(overlap > 0) {
												anyoverlap = true
												
											}
										}
										
									}
									
									if(!anyoverlap) {
										doNotIncludes[bindex].push(bvalue[i])
									}
									
									
								}
								
								
							})
							
							$.each(doNotIncludes, function(bindex, bvalue) {
								degenerates[bindex] = degenerates[bindex].filter(cvalue => !bvalue.includes(cvalue))
							}) 
							
							let shortChainsDone = []
							for(let i = 0; i<sortorder[0].length; i++) {
								let found = -1
								if(!shortChainsDone.includes(sortorder[0][i])) {
									$.each(degenerates, function(bindex, bvalue) {
										if(bvalue.includes(sortorder[0][i])) {
											found = bindex
											return false
										}
									})
									if(found > -1) { 
										let allorders = randomiser(degenerates[found])
										Array.prototype.push.apply(shortChainsDone, degenerates[found])
										if(instructions.length == 0) {
											Array.prototype.push.apply(instructions, allorders)
										}
										else {
											$.each(instructions, function(bindex, bvalue) {
												$.each(allorders, function(cindex, cvalue) {
													if(cindex == allorders.length-1) {
														instructions[bindex] = bvalue.concat(cvalue)
													}
													else {
														instructions.push(bvalue.concat(cvalue))
													}
												})
												 
											})
										}
										
										//We need to increment i to ensure we skip over the rest of the chains in the degenerate set
										//i = i + degenerates[found].length - 1 //Deduct one to compensate because the for loop will increment by one anyway
									}
									else {
										shortChainsDone.push(sortorder[0][i])
										if(instructions.length === 0) {
											instructions.push([sortorder[0][i]])
										}
										else {
											$.each(instructions, function(bindex, bvalue) {
												instructions[bindex].push(sortorder[0][i])
												
											})
										}
									}
								}
									
							}
							
						}
					}
							
				}
				
				instructions = instructions.filter(function(value, index, arr) {
					return value.length === shortchains.length
				})

				//for each shortchain...
				//with a set of instructions to follow, we can now add in all the shortchains in all possible orders
				$.each(instructions, function(bindex, bvalue) {
					//copy the initial string to one that we can edit, which will ultimately get pushed into the array that is returned 
					//from this function. 
					let newstring = JSON.parse(JSON.stringify(initialstring))
					$.each(bvalue, function(cindex, cvalue) {
						let chain = shortchains[cvalue]
						//insert each new point in the shortchain, if it hasn't already been included. DO this by first
						//finding the number of matches to points already included. 
						let matches = 0
						
						$.each(chain, function(dindex, dvalue) {
							if(newstring.string.includes(dvalue)) {
								matches++
							}
							else {
								return false //If we don't find a point, stop looking matches. 
							}
						})
						
						//if the no of matches is 1, then only the point from the parent chain has been included
						
						if(matches === 1) {
														
							let startpoint = newstring.string.indexOf(chain[0]) + 1
							
							let charactersadded = 0
							let chainRecord = [] // Build up a record of all the chains that were added, with the points in the correct order. We can then use this to determine which bonds are missing (i.e. those that are part of a ring)
							$.each(chain, function(dindex, dvalue) {
								let point = points[dvalue]
								if(dindex == 0) {
									newstring.string.splice(startpoint, 0, "(")
									charactersadded++
								}
								else {
									
									let bondorder = bondarr[dvalue][chain[dindex-1]][1]
									if(bondorder == 2  && (!aromaticpoints.includes(dvalue) || !notKekule)) {
										newstring.string.splice(startpoint+charactersadded++, 0, "=")
									}
									else if(bondorder == 3) {
										newstring.string.splice(startpoint+charactersadded++, 0, "#")
									}
									
									
									newstring.string.splice(startpoint + charactersadded++, 0, dvalue)
									
									
									
								}
								chainRecord.push(dvalue)
							})
							newstring.string.splice(startpoint + charactersadded, 0, ")")
							newstring.chainRecords.push(chainRecord)
						}
						else if(matches != chain.length) {
							
							let startpoint = newstring.string.indexOf(chain[matches-1])+1
							
							let charactersadded = 0
							let chainRecord = []
							$.each(chain, function(dindex, dvalue) {
								let point = points[dvalue]
								if(dindex === matches-1) {
									newstring.string.splice(startpoint, 0, "(")
									charactersadded++
									chainRecord.push(dvalue)
								}
								else if(dindex>matches-1 && !newstring.string.includes(dvalue)){
									
									let bondorder = bondarr[dvalue][chain[dindex-1]][1]
									if(bondorder === 2 && (!aromaticpoints.includes(dvalue) || !notKekule)) {
										newstring.string.splice(startpoint+charactersadded++, 0, "=")
									}
									else if(bondorder == 3) {
										newstring.string.splice(startpoint+charactersadded++, 0, "#")
									}
									newstring.string.splice(startpoint + charactersadded++, 0, dvalue)
									chainRecord.push(dvalue)
								}
								else if(dindex>matches-1 && newstring.string.includes(dvalue)) { //If we reach a point in the chain that has already been done, stop there. Don't start again. 
									return false
								}
								
							})
							newstring.string.splice(startpoint + charactersadded, 0, ")")
							newstring.chainRecords.push(chainRecord)
						}
						
					})
					
					//The ring bonds are covered if:
					//a) the two points in the ring are directly next to each other in the initialstring.string
					//b) the two points are directly next to each other in one of the "chains" array
					//If neither of these things is true, then this bond needs to be added
					let bondcounter = 0
					
					$.each(bondsinrings, function(bindex, bvalue) {
						let bond = bonds[bvalue]
						let isAdjacent = false
						
						let index1 = initialstring.PIO.indexOf(bond[0])//test condition a
						let index2 = initialstring.PIO.indexOf(bond[1])
						
						
						if(Math.abs(index1-index2) == 1 && index1 > -1 && index2 > -1) {
							isAdjacent = true
						}
						else {
							$.each(newstring.chainRecords, function(cindex, cvalue) { //test condition b
								let index3 = cvalue.indexOf(bond[0])
								let index4 = cvalue.indexOf(bond[1])
								if(index3 > -1 && index4 > -1 && Math.abs(index3-index4) == 1) {
									isAdjacent = true
									return false
								}
							})
						}
						if(!isAdjacent) {
							let index3 = newstring.string.indexOf(bond[0])
							let index4 = newstring.string.indexOf(bond[1])
							let startpoint1 = index3 + 1
							//If the ring ends in a double bond, and this point comes AFTER the other point, and the bond
							//isn't part of an aromatic ring, add in an equals sign
							if(bond[2] == 2 && index3>index4 && (!aromaticbonds.includes(bvalue) || !notKekule)) {
								newstring.string.splice(startpoint1, 0, "=")
								newstring.string.splice(startpoint1+1, 0, placeholders[bondcounter])
							}
							else {
								newstring.string.splice(startpoint1, 0, placeholders[bondcounter])
							}
							
							
							let startpoint2 = newstring.string.indexOf(bond[1]) +1 //Recalculate this, as the indexOf will have changed since we added a value above for startpoint1
							
							//If the ring ends in a double bond, and this point comes AFTER the other point, and the bond
							//isn't part of an aromatic ring, add in an equals sign
							if(bond[2] == 2 && index4>index3 && (!aromaticbonds.includes(bvalue) || !notKekule)) {
								newstring.string.splice(startpoint2, 0, "=")
								newstring.string.splice(startpoint2+1, 0, placeholders[bondcounter])
							}
							else {
								newstring.string.splice(startpoint2, 0, placeholders[bondcounter])
							}
							
							//Increment the bondcounter so we use a different placeholder for the next bond. 
							bondcounter++
							
						}
					})
					
					
					

					let goingin = {
						"initialstring": initialstring,
						"newstring": newstring,
						"usenewstring": true
					}
					smilestrings.push(goingin)
					
				}) 
			}
			else {
				//The ring bonds are covered if:
				//a) the two points in the ring are directly next to each other in the initialstring.string
				//If this is not true, then this bond needs to be added
				let bondcounter = 0
				//Use placeholders to fill in where the ring numbers should go. Then, at the end, search for these and replace 
				//them with numbers incrementing by 1. In this way, we can be sure that the numbers used are independant 
				//of the order the rings were dealt with. Currently this can handle up to 17 different rings, which is expected
				//to be sufficient. 
				
				$.each(bondsinrings, function(bindex, bvalue) {
					let bond = bonds[bvalue]
					let isAdjacent = false
					
					let index1 = initialstring.PIO.indexOf(bond[0])
					let index2 = initialstring.PIO.indexOf(bond[1])
					
					if(Math.abs(index1-index2) == 1 && index1 > -1 && index2 > -1) {
						isAdjacent = true
					}
					
					if(!isAdjacent) {
						
						//Do point1
						//If the ring ends in a double bond, and this point comes AFTER the other point, and the bond
						//isn't part of an aromatic ring, add in an equals sign
						let startpoint = initialstring.string.indexOf(bond[0]) + 1
						if(bond[2] == 2 && index1>index2 && (!aromaticbonds.includes(bvalue) || !notKekule)) {
							initialstring.string.splice(startpoint, 0, "=")
							initialstring.string.splice(startpoint+1, 0, placeholders[bondcounter])
						}
						else {
							initialstring.string.splice(startpoint, 0, placeholders[bondcounter])
						}
						
						//Do point 2
						//If the ring ends in a double bond, and this point comes AFTER the other point, and the bond
						//isn't part of an aromatic ring, add in an equals sign
						startpoint = initialstring.string.indexOf(bond[1]) + 1
						if(bond[2] == 2 && index2>index1 && (!aromaticbonds.includes(bvalue) || !notKekule)) {
							initialstring.string.splice(startpoint, 0, "=")
							initialstring.string.splice(startpoint+1, 0, placeholders[bondcounter])
						}
						else {
							initialstring.string.splice(startpoint, 0, placeholders[bondcounter])
						}
						bondcounter++
						
					}
				})
				
				let goingin = {
					"initialstring": initialstring,
					"newstring": initialstring,
					"usenewstring": false
				}
				smilestrings.push(goingin)
				
			}
		
		})
		
		
		//Sort the smilestrings based on the newstring.string (once its actually been converted to a string). 
		//The sort function with rank these different smiles precursors based on the unicode 
		//We need to swap out the point indexes for real elements, and number the bonds sequentially for each
		//string, PRIOR to the sort!
		//However, it is still worth doing this first, then doing it again before returning the final string
		//as it will save having to run the expensive stereochem functions for every smiles string possibility.
		
		let justTheStrings = smilestrings.map(function(value, index, arr) {
			let output = []
			let bondcounter = 1
			$.each(value.newstring.string, function(bindex, bvalue) {
				if(aromaticpoints.includes(bvalue) && notKekule) {
					output.push(atomdict[points[bvalue][2]][0].toLowerCase())
				}
				
				else if(typeof bvalue === "number") {
					output.push(atomdict[points[bvalue][2]][0])
				}
				else {
					output.push(bvalue)
				}
			})
			
			
			$.each(output, function(bindex, bvalue) {
				if(placeholders.includes(bvalue)) {
					
					let ringclose = -1
					$.each(output, function(cindex, cvalue) {
						if(cvalue == bvalue && bindex != cindex) {
							ringclose = cindex
						}
					})
					
					if(bondcounter > 9) {
						output[bindex] = "%" + bondcounter.toString()
						output[ringclose] = "%" + bondcounter.toString()
					}
					else {
						output[bindex] = bondcounter.toString()
						output[ringclose] = bondcounter.toString()
					}
					
					bondcounter++
				}
			})
			
			return [output, index] 
		})
		
		//Use a custom sort function to ensure that this is not dependant on the browser. 
		let uniqueStringIndex = justTheStrings.sort(function(a, b) {
			let outcome = 0
			for(let i = 0; i<a[0].length; i++) {
				let charA = a[0][i]
				let charB = b[0][i]
				
				if(charA.length === 1 && charB.length === 1) {
					outcome = charA.charCodeAt(0) - charB.charCodeAt(0)
				}
				else if(charA.length !== charB.length) {
					outcome = charA.length - charB.length
				}
				else {
					for(let j = 0; j<charA.length; j++) {
						outcome = charA.charCodeAt(j) - charB.charCodeAt(j)
						if(outcome > 0) {
							j = charA.length
						}
					}
				}
				
				if(outcome !== 0) {
					i = a[0].length
				}
			}
			return outcome
		})[0][1]
		
		let uniqueString = smilestrings[uniqueStringIndex]
		
		let result = insertAlkeneGeometry(uniqueString.initialstring, uniqueString.newstring)
		
		uniqueString.initialstring = result[0]
		uniqueString.newstring = result[1]
		
		//This is the final (major) function for generating the smiles. Give it the initialstring and newstring
		//and it will store all the results ("@" or "@@") in the array called "stereoInfo". 
		let stereoInfo = insertStereoChem(uniqueString.initialstring, uniqueString.newstring)
		
		let output = []
		$.each(uniqueString.newstring.string, function(index, value) {
			if(typeof value === "number") {
				if(!orgsubset.includes(atomdict[points[value][2]][0]) || chiralAtoms.includes(value) || points[value][4] !== 0) {
					output.push("[")
				}
				
				if(aromaticpoints.includes(value) && notKekule) {
					output.push(atomdict[points[value][2]][0].toLowerCase())
				}
				else {
					output.push(atomdict[points[value][2]][0])
				}
				
				if(chiralAtoms.includes(value)) {
					output.push(stereoInfo[value])
				}
				if(points[value][4] !== 0) {
					let goingin = (points[value][4] > 0) ? "+" + points[value][4] : points[value][4]
					output.push(goingin)
				}
				if(!orgsubset.includes(atomdict[points[value][2]][0]) || chiralAtoms.includes(value) || points[value][4] !== 0) {
					output.push("]")
				}
			}
			else {
				output.push(value)
			}
		})
		
		let bondcounter = 1
		$.each(output, function(index, value) {
			if(placeholders.includes(value)) {
				
				let ringclose = -1
				$.each(output, function(bindex, bvalue) {
					if(value == bvalue && index != bindex) {
						ringclose = bindex
					}
				})
				if(bondcounter > 9) {
					output[index] = "%" + bondcounter.toString()
					output[ringclose] = "%" + bondcounter.toString()
				}
				else {
					output[index] = bondcounter.toString()
					output[ringclose] = bondcounter.toString()
				}
				
				bondcounter++
			}
		})
			
		
		output = output.join("")
		
		return output
		
	}
	
