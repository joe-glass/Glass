
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

	//Used throughout entire script to get the coordinates of the mouse following mousedown.
	Glass.prototype.getCurrentCoords = function(e) {
		let x = e.pageX - $(' #'+this.id+'-canvas').offset().left
		let y = e.pageY - $(' #'+this.id+'-canvas').offset().top
		return [x, y]
	}
	
	//Clears the canvas, and redraws. This is used many times per second, although optimisation has
	//been done to minimise the number of refreshes done where nothing changes.
	//If the nocanvas option is specified, we are using this object without a DOM object, so don't redraw. 
	Glass.prototype.refreshCanvas = function() {
		if(this.options.mode !== "nocanvas") {
			this.ctx.clearRect(0,0,this.canvasWidth,this.canvasHeight)
			this.reDraw()
		}
	}
	
	//Find which point was clicked, since we can't attach event handlers to pretty pictures drawn on the 
	//canvas.
    Glass.prototype.getPointClicked = function(e, xy) {
        let [x, y] = xy || this.getCurrentCoords(e)
		let locus = this.options.locus * 1.5
		
		let pointclicked = this.points.findIndex(value => {
			if(x<(value[0]+locus) && x>(value[0]-locus) && y<(value[1]+locus) && y>(value[1]-locus)) {
                return true
            }
		})
        return pointclicked
    }
	
	//Gets the bond that was clicked, for reason as above.
    Glass.prototype.getBondClicked = function(e, xy) {
        let [x, y] = xy || this.getCurrentCoords(e)
		let points = this.points
		let locus = this.options.locus * 1.8
		
		let bondclicked = this.bonds.findIndex(value => {
			
            let p1 = [points[value[0]][0], points[value[0]][1]]
            let p2 = [points[value[1]][0], points[value[1]][1]]
			
			//Find length of the bond, in case it's an abnormal length created by the user
			let l = Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2))
			
			//Find distance squared from each point linked by the bond
            let d1 = Math.pow(x-p1[0], 2) + Math.pow(y-p1[1], 2)
            let d2 = Math.pow(p2[0]-x, 2) + Math.pow(p2[1]-y, 2)
			
			//Find the length of the line at 90 degrees to the bond, from bond to point.
            let normdist = d1 - Math.pow((l*l + d1 - d2)/(2*l), 2)
			
			//17 is a arbitrary limit that works. Also checks that the click was less than bond
			//length from both atoms.
            if(normdist<locus**2 && d1<l*l && d2<l*l) {
                return true
            }
        })
        return bondclicked
    }
	
	
	//Takes the coordinates of the old point and its index in the state, uses new coordinates to add the new 
	//point to the state, then activates addbond() to draw bond between them
    Glass.prototype.addpoint = function(newx, newy, point, ignorenearpoints) {
		
		//point is the index of the pointclicked. If none, it adds a new point to state, starting a new molecule.
		if(typeof newx === "number" && typeof newy === "number") {
			if(point !== "none") {
				//uses the x and y coordinates of the new point to be set, and checks that the state doesn't already 
				//have a point at those coordinates
				let newpointexist = this.points.findIndex(value => {
					if(newx<(value[0]+7) && newx>(value[0]-7) && newy<(value[1]+7) && newy>(value[1]-7)) {
						return true
					}
				})

				if(newpointexist === -1 || ignorenearpoints === true) {
					this.points.push([newx, newy, 67, [], 0]) //[x coordinate, y coordinate, atomtype, [bonded neighbours], charge]
					this.addbond(point, this.points.length-1)
					newpointexist = this.points.length-1
				}
				
				
				//if the new point does exist, make sure there isn't already a bond between these two points
				//this should only occur when adding a ring to a bond (such
				//that the bond becomes part of the new ring). This would usually
				//occur when forming a fused ring system.
				else if(!this.points[point][3].includes(newpointexist)) {
					this.addbond(point, newpointexist)
				}
				return newpointexist
			}
			else {
				this.points.push([newx, newy, 67, [], 0])
				this.refreshCanvas()
				return this.points.length - 1
			}
		}
    }
	
	//add a new bond to the state, connecting two points. Two points are referenced by their index in the 
	//point array.
    Glass.prototype.addbond = function(point, other) {
        
		this.bonds.push([point, other, 1, 0])
		this.points[point][3].push(other)
		this.points[other][3].push(point)
		this.refreshCanvas()
    }
	
	Glass.prototype.changeAtom = function(e) {
		
		let xy = this.getCurrentCoords(e)
		let atom = this.nextAtom
		//get reverse atom dictionary, so that we can convert the specified atom in the disconnection to the correct number, ready 
		//to add the new points back into the array
		let atomAsNumber = -1
		$.each(this.atomdict, function(index, value) {
			if(value[0] === atom) {
				atomAsNumber = index
				return false
			}
		})

		let myindex = this.points.findIndex(value => {
			if(xy[0]<(value[0]+7) && xy[0]>(value[0]-7) && xy[1]<(value[1]+7) && xy[1]>(value[1]-7)) {
				return true
			}
		})
		
		if(myindex > -1) {
			this.points[myindex][2] = parseInt(atomAsNumber)
		}
		else {
			this.addpoint(xy[0], xy[1], "none", false)
			this.points[this.points.length -1][2] = parseInt(atomAsNumber)
		}
		this.refreshCanvas()
	}
	
	
	//changes the type of atom. Uses curx and cury defined in global variable.
    Glass.prototype.changeAtomOnKeyPress = function(keypress, curx, cury) {
        
		let points = this.points
		let atomdict = this.atomdict
		let that = this
		
		if(!isNaN(keypress) && atomdict[keypress]) {
			$.each(this.points, function(index, value) {
				if(curx<(value[0]+7) && curx>(value[0]-7) && cury<(value[1]+7) && cury>(value[1]-7)) {
					points[index][2]=keypress
					that.refreshCanvas()
					return false
				}
			})
		}
    }
		
	//Increase the charge of the atom on click
	Glass.prototype.increaseCharge = function(pointClicked) {
		if(this.points[pointClicked]) {
			this.points[pointClicked][4]++
		}
		this.refreshCanvas()
	}
	
	//Decrease the charge of the atom on click
	Glass.prototype.decreaseCharge = function(pointClicked) {
		if(this.points[pointClicked]) {
			this.points[pointClicked][4]--
		}
		this.refreshCanvas()
	}


	//Switch whether a bond should be single/double/triple, alter the state, and re-render
	Glass.prototype.changeBondType = function(bondclick) {
		
		let bondType = this.bonds[bondclick][2]
		if(bondType === 1) {
			this.bonds[bondclick][2] = 2
			this.bonds[bondclick][3] = 0
		}
		if(bondType === 2) {
			this.bonds[bondclick][2] = 3
			this.bonds[bondclick][3] = 0
		}
		if(bondType === 3) {
			this.bonds[bondclick][2] = 1
			this.bonds[bondclick][3] = 0
		}
		this.refreshCanvas()
	}
	
	//Changes the stereochemistry of the bond that was clicked from flat, wedge, hash, reversewedge, reversehash, then flat again.
	Glass.prototype.changeBondStereo = function(e, type) {
		
		let that = this
		let bondclick = this.getBondClicked(e)
		let pointclick = this.getPointClicked(e)		
		let bonds = this.bonds
		if(pointclick !== -1) {
			let coords = that.getNewPointCoords(pointclick)
			that.addpoint(coords[0], coords[1], pointclick, false)
			
			if(type === "wedgebond") {
				bonds[bonds.length-1][3] = 1
			}
			else if(type === "hashbond") {
				bonds[bonds.length-1][3] = 2
			}
		}
		else if(bondclick !== -1) {
			if(type === "wedgebond") {
				bonds[bondclick][3] = (bonds[bondclick][3] === 1) ? bonds[bondclick][3] = 3 : bonds[bondclick][3] = 1
			}
			else if(type === "hashbond") {
				bonds[bondclick][3] = (bonds[bondclick][3] === 2) ? bonds[bondclick][3] = 4 : bonds[bondclick][3] = 2
			}
			//if type is not defined, then it means we are not in a mode to choose bond stereochemistry, and the event was 
			//initiated by a right click, meaning we should just cycle through bond types. 
			else { 
				bonds[bondclick][3] = (bonds[bondclick][3] === 4) ? 0 : ++bonds[bondclick][3]
			}
		}
		this.refreshCanvas()
	}

	//Switches the direction of the bond. Invoked when the bond order of bond = 2. Has the effect (in combination
	//with the reDraw() function) of switching which side of the single bond the double bond goes. e.g. an internal 
	//depiction of a PI bond in a ring to an external PI bond. 
	Glass.prototype.switchBondDirection = function(bondindex) {
		
		let old1 = this.bonds[bondindex][0]
		let old2 = this.bonds[bondindex][1]
		this.bonds[bondindex][0] = old2
		this.bonds[bondindex][1] = old1
	}
	
	//copies the state into a backup (oldstates), in case the user wishes to undo the action.
	Glass.prototype.saveState = function() {
		if(this.oldstates.length>19) {
			this.oldstates.splice(0, 1)
		}
		this.oldstates.push(this.exportGlass()) 
	}
	
	//Copy the most recent old state into the current state, and refresh canvas, to undo an action
	Glass.prototype.undoAction = function() {
		if(this.oldstates.length>0) {
			let data = this.oldstates.pop()
			this.selection = []
			this.shapeSelection = []
			
			let importData = JSON.parse(data)
			
			this.points = importData.points
			this.bonds = importData.bonds
			this.shapes = importData.shapes
			this.refreshCanvas()
		}
	}
	
	//Uses the number of bonds an atom already has to determine how to get the coordinates of the new point
	//and what those coordinates should be.
    Glass.prototype.getNewPointCoords = function(pointindex) {
        let newCoords = []
		let l = this.options.l
		let points = this.points
		
		let [x, y, bondcheck] = [this.points[pointindex][0], this.points[pointindex][1], this.points[pointindex][3]]

        switch(bondcheck.length) {
			
			//if there are no bonds, then put next atom to bottom right.
            case 0:
                newCoords = [x+l*Math.cos(-Math.PI/6), y-l*Math.sin(-Math.PI/6)]
            break;
			//if there is one bond, make sure the next one is 120 degrees from the first
            case 1:
				
				let diff = [points[bondcheck[0]][0] - points[pointindex][0], points[pointindex][1] - points[bondcheck[0]][1]]
				let angle = Math.atan2(diff[1], diff[0])
				if(angle<0) {
						angle = Math.abs(-Math.PI-angle)+Math.PI	
				}
				switch(true) {
					case(0 < angle && angle < Math.PI/3):
						newCoords = [x+l*Math.cos(angle+2*Math.PI/3), y-l*Math.sin(angle+2*Math.PI/3)]
					break;
					case(Math.PI/3 < angle && angle < 2*Math.PI/3):
						newCoords = [x+l*Math.cos(angle-2*Math.PI/3), y-l*Math.sin(angle-2*Math.PI/3)]
					break;
					case(2*Math.PI/3 < angle && angle < Math.PI):
						newCoords = [x+l*Math.cos(angle-2*Math.PI/3), y-l*Math.sin(angle-2*Math.PI/3)]
					break;
					case(Math.PI < angle && angle < 4*Math.PI/3):
						newCoords = [x+l*Math.cos(angle+2*Math.PI/3), y-l*Math.sin(angle+2*Math.PI/3)]
					break;
					case(4*Math.PI/3 < angle && angle < 5*Math.PI/3):
						newCoords = [x+l*Math.cos(angle+2*Math.PI/3), y-l*Math.sin(angle+2*Math.PI/3)]
					break;
					case(5*Math.PI/3 < angle && angle < 2*Math.PI):
						newCoords = [x+l*Math.cos(angle-2*Math.PI/3), y-l*Math.sin(angle-2*Math.PI/3)]
					break;
				}
				

            break;
			//if there are two bonds, the new bond should bisect the typically reflex angle between them.
			case 2:
				let p1 = [points[bondcheck[0]][0], points[bondcheck[0]][1]]
				let p2 = [points[bondcheck[1]][0], points[bondcheck[1]][1]]
				
				let diff1 = [p1[0] - points[pointindex][0], points[pointindex][1] - p1[1]]
				let diff2 = [p2[0] - points[pointindex][0], points[pointindex][1] - p2[1]]
				let angle1 = Math.atan2(diff1[1], diff1[0])
				let angle2 = Math.atan2(diff2[1], diff2[0])
				
				
				let newangle = (angle1+angle2)/2
				
				let angarray = [angle1, angle2, newangle]
				$.each(angarray, function(index, value) {
					if(value<0) {
						let newvalue = Math.abs(-Math.PI-value)+Math.PI
						angarray[index] = newvalue
					}
				})
				
				if((Math.abs(angarray[0] - angarray[2]) < Math.PI/2) || (Math.abs(angarray[1] - angarray[2]) < Math.PI/2)){
					newangle = (angle1+angle2)/2 + Math.PI
				}

				newCoords = [this.points[pointindex][0] + l * Math.cos(newangle), this.points[pointindex][1] - l * Math.sin(newangle)]
			break;	
			
			case 12:
				//Max number of bonds will be 12
			break;
			//for three or more bonds: find the angles the bonds to the pointclicked make to the x-axis, convert to 360 degree regime, 
			//and sort them in order. for each neighbouring angle pair, find the mean between them. 
            default:
				let possibleangles = []
				let allangles = []
				for(let i=0; i<bondcheck.length; i++) {
					
					let diff1 = [points[bondcheck[i]][0] - points[pointindex][0], points[pointindex][1] - points[bondcheck[i]][1]]
					let angle = Math.atan2(diff1[1], diff1[0])
					//turn negative angles into a 360 regime
					if(angle<0) {
						angle = Math.abs(-Math.PI-angle)+Math.PI	
					}
					allangles.push(angle)
				}

				allangles.sort()
				for(let i = 0; i<allangles.length; i++) {
					let angle1, angle2
					if(i === allangles.length-1) {
						angle1 = allangles[i]
						angle2 = allangles[0]
					}
					else { 
						angle1 = allangles[i]
						angle2 = allangles[i+1]
					}
					let newangle = (angle1+angle2)/2
					let angarray = [angle1, angle2, newangle]

					//check/correct that each generated angle bisects the acute angle between the parent bonds, as opposed to the 
					//reflex angle.
					if(((Math.abs(angarray[0] - angarray[2]) > Math.PI/2) || (Math.abs(angarray[1] - angarray[2]) > Math.PI/2))){
						newangle = (angle1+angle2)/2 + Math.PI
					}
					possibleangles.push(newangle)
				}
				
				//convert possible angles into possible coordinates.
				let possibles = []
				$.each(possibleangles, function(index, value) {
					possibles.push([x + l*Math.cos(value), y - l*Math.sin(value), 0]) //the final number is a precursor for the rating the point is given by rateMyPoints
				})
				//Function to rate the possibilities that were generated, and return the coordinates of the the best option.
				
				newCoords = this.rateMyPoint(possibles)
			break;
        }
		return [newCoords[0], newCoords[1]]
    }
	
	//From a selection of hypothetical points (possibles) and the index of the point to which any of the hypothetical points would be bonded
	//to, choose the one that is the close to the least number of points, and return the coords of that point.
	Glass.prototype.rateMyPoint = function(possibles) {

		let points = this.points
		let bonds = this.bonds
		let l = this.options.l
		
		let returns = possibles.map(value => {
			let returnval = 0
			$.each(points, function(bindex, bvalue) {
				//Get the distance of the possible new point coords with the point currently being examined. 
				//Rank the points: The larger the distance, the larger the score.
				let ppdistance2 = Math.pow(bvalue[0]-value[0],2) + Math.pow(bvalue[1]-value[1], 2)
				//Only count this point if the distance is less than twice the bond distance. 
				returnval += Math.E ** (-Math.sqrt(ppdistance2))
			})
			return returnval
		})
		
		//find which possibility has the best ranking, by first finding the maximum score, 
		//finding the index of that best score, then relating that index to that 
		//of the "possibles" array, and return an output. 
		
		let minimum = Math.min(...returns)
		let returnsIndex = returns.findIndex(x => x === minimum)
		let newCoords = [possibles[returnsIndex][0], possibles[returnsIndex][1]] 

		return newCoords
	}
	
	//builds a ring, given the event (click), and the size of the ring to build.
    Glass.prototype.buildRing = function(e, size) {
		let points = this.points
		let bonds = this.bonds
		let l = this.options.l
		if(size === "benzene") {
			this.buildRing(e,6)
			bonds[bonds.length-1][2]=2
			bonds[bonds.length-3][2]=2
			bonds[bonds.length-5][2]=2
			this.refreshCanvas()
		}
		else {
			let indextracker = []
			let pointclick = this.getPointClicked(e)
			let bondclick = this.getBondClicked(e)
			
			let radius = Math.sqrt((l * l)/(2 * (1 - Math.cos(2*Math.PI/size))))
			let coords = []
			if(pointclick === -1 && bondclick === -1) {
				let [x, y] = this.getCurrentCoords(e)
				pointclick = this.addpoint(x, y, "none", false)
				coords = [l*Math.cos(-Math.PI/2)+points[pointclick][0], points[pointclick][1] - l*Math.sin(-Math.PI/2)]
			}
			else if(pointclick !== -1){
				let bondcheck = points[pointclick][3]
				if(bondcheck.length==1) {
					let diff = [points[pointclick][0] - points[bondcheck[0]][0], points[bondcheck[0]][1] - points[pointclick][1]]
					let angle = Math.atan2(diff[1], diff[0])
					coords = [l*Math.cos(angle)+points[pointclick][0], points[pointclick][1] - l*Math.sin(angle)]
				}
				else {
					coords = this.getNewPointCoords(pointclick)
				
				}
			}
			else {
				let p1 = points[bonds[bondclick][0]]
				let p2 = points[bonds[bondclick][1]]
				let diff = [p2[0] - p1[0], p1[1] - p2[1]]
				let angle = Math.atan2(diff[1], diff[0])
				let intangle = ((size-2)*Math.PI)/size
				let possangles = [angle-intangle/2, angle+intangle/2]
				let posspoints = [[p1[0]+Math.cos(possangles[0])*radius, p1[1]-Math.sin(possangles[0])*radius, 0], [p1[0]+Math.cos(possangles[1])*radius, p1[1]-Math.sin(possangles[1])*radius, 0]]
				coords = this.rateMyPoint(posspoints)
				//this.addpoint(posspoints[0][0], posspoints[0][1], "none", true)
				//this.addpoint(posspoints[1][0], posspoints[1][1], "none", true)
				pointclick = bonds[bondclick][0]
				
			}
			
			
			let diff = [coords[0] - points[pointclick][0], coords[1] - points[pointclick][1]]
			let angle = Math.atan2(diff[1], diff[0])
			
			let centre = [points[pointclick][0] + radius * Math.cos(angle), points[pointclick][1] + radius * Math.sin(angle)]
			let lastpoint = pointclick
			diff = [points[pointclick][0] - coords[0], coords[1] - points[pointclick][1]]
			angle = Math.atan2(diff[1], diff[0])
			
			for(i = 1; i<size+1; i++) {
				if(i === size) {
					this.addpoint(points[pointclick][0], points[pointclick][1], lastpoint, false)
				}
				else {
					let nextindex = this.addpoint(centre[0]+(radius*Math.cos(angle + 2*Math.PI*i/size)), centre[1]-(radius*Math.sin(angle + 2*Math.PI*i/size)), lastpoint, false)
					lastpoint = nextindex
					
				}
			}
		}
    }
	
	//highlights a particular atom
    Glass.prototype.highlightAtom = function(pointIndex) {
		
		let x = this.points[pointIndex][0]
		let y = this.points[pointIndex][1]
        this.ctx.beginPath()
        this.ctx.arc(x, y, 5, 0, 2*Math.PI);
        this.ctx.lineWidth=1
        this.ctx.stroke()
    }
	
	//highlights a particular bond
    Glass.prototype.highlightBond = function(bondclick) {
		
        let locus = this.options.locus
		let points = this.points
		let bonds = this.bonds
		let ctx = this.ctx
		
        let p1 = [points[bonds[bondclick][0]][0], points[bonds[bondclick][0]][1]]
        let p2 = [points[bonds[bondclick][1]][0], points[bonds[bondclick][1]][1]]
        let angle = Math.atan2((p1[1]-p2[1]), (p2[0]-p1[0]))

        let start = [p1[0] + locus * Math.cos(angle+(Math.PI/2)), p1[1] - locus * Math.sin(angle+(Math.PI/2))]
        let end = [p2[0] + locus * Math.cos(angle+Math.PI/2), p2[1] - locus * Math.sin(angle+Math.PI/2)]
        ctx.beginPath()
		ctx.lineWidth=1
        ctx.moveTo(start[0], start[1])
        ctx.lineTo(end[0], end[1])

        let mid1 = [end[0] + (locus * Math.cos(angle)), end[1] - (locus * Math.sin(angle))]
        let top = [p2[0] + (locus * Math.cos(angle)), p2[1] - (locus * Math.sin(angle))]
        ctx.arcTo(mid1[0], mid1[1], top[0], top[1], locus)


        let start2 = [p2[0] + locus * Math.cos(angle-Math.PI/2), p2[1] - locus * Math.sin(angle-Math.PI/2)]
        let mid2 = [start2[0] + (locus * Math.cos(angle)), start2[1] - (locus * Math.sin(angle))]
        ctx.arcTo(mid2[0], mid2[1], start2[0], start2[1], locus)

        let end2 = [p1[0] + locus * Math.cos(angle-Math.PI/2), p1[1] - locus * Math.sin(angle-Math.PI/2)]
        ctx.lineTo(end2[0], end2[1])

        let mid3 = [end2[0] - locus * Math.cos(angle), end2[1] + locus * Math.sin(angle)]
        let bottom = [p1[0] - locus * Math.cos(angle), p1[1] + locus * Math.sin(angle)]
        ctx.arcTo(mid3[0], mid3[1], bottom[0], bottom[1], locus)

        let mid4 = [start[0] - locus * Math.cos(angle), start[1] + locus * Math.sin(angle)]
        ctx.arcTo(mid4[0], mid4[1], start[0], start[1], locus)
        ctx.stroke()
    }
	
	//highlights a particular shape. 
	Glass.prototype.highlightShape = function(index) {
		
		if(this.shapes[index][0] === "arrow") {
			let locus = this.options.arrowHead * 2
			let points = this.points
			let ctx = this.ctx
			let shape = this.shapes[index][1]
			
			let p1 = [shape[0], shape[1]]
			let p2 = [shape[0] + shape[3] * Math.cos(shape[2]), shape[1] - shape[3] * Math.sin(shape[2])]
			let angle = shape[2]

			let start = [p1[0] + locus * Math.cos(angle+(Math.PI/2)), p1[1] - locus * Math.sin(angle+(Math.PI/2))]
			let end = [p2[0] + locus * Math.cos(angle+Math.PI/2), p2[1] - locus * Math.sin(angle+Math.PI/2)]
			ctx.beginPath()
			ctx.lineWidth=1
			ctx.moveTo(start[0], start[1])
			ctx.lineTo(end[0], end[1])

			let mid1 = [end[0] + (locus * Math.cos(angle)), end[1] - (locus * Math.sin(angle))]
			let top = [p2[0] + (locus * Math.cos(angle)), p2[1] - (locus * Math.sin(angle))]
			ctx.arcTo(mid1[0], mid1[1], top[0], top[1], locus)


			let start2 = [p2[0] + locus * Math.cos(angle-Math.PI/2), p2[1] - locus * Math.sin(angle-Math.PI/2)]
			let mid2 = [start2[0] + (locus * Math.cos(angle)), start2[1] - (locus * Math.sin(angle))]
			ctx.arcTo(mid2[0], mid2[1], start2[0], start2[1], locus)

			let end2 = [p1[0] + locus * Math.cos(angle-Math.PI/2), p1[1] - locus * Math.sin(angle-Math.PI/2)]
			ctx.lineTo(end2[0], end2[1])

			let mid3 = [end2[0] - locus * Math.cos(angle), end2[1] + locus * Math.sin(angle)]
			let bottom = [p1[0] - locus * Math.cos(angle), p1[1] + locus * Math.sin(angle)]
			ctx.arcTo(mid3[0], mid3[1], bottom[0], bottom[1], locus)

			let mid4 = [start[0] - locus * Math.cos(angle), start[1] + locus * Math.sin(angle)]
			ctx.arcTo(mid4[0], mid4[1], start[0], start[1], locus)
			ctx.stroke()
		}			
	}
	
	//redraws the state onto the canvas. May be called up to many times per second.
    Glass.prototype.reDraw = function() {
		
		let ctx = this.ctx
		let points = this.points
		let bonds = this.bonds
		let locus = this.options.locus
		let that = this
		let l = this.options.l
		let bondorderarr = {}
		
		//get those double bonds which are part of a ring, as we don't want a centred double bond for those. 
		let noDoubleBondCentering = []
		let rings = this.currentRings
		let ringarray = []
		$.each(rings, function(index, value) {
			if(value[0] === "aromatic" || value[0] === "parsat") {
				Array.prototype.push.apply(ringarray, value[2])
			}
		})
		 
		$.each(bonds, function(index, value) {
			if(ringarray.includes(value[0]) && ringarray.includes(value[1])) {
				noDoubleBondCentering.push(index)
			}
		}) 
		
		
		//Draw out all of the bonds onto the canvas
        $.each(bonds, function(index, value) {
			//whilst we're flicking through all the bonds, set up an array order by point index, detailing 
			//that points bond order, ready for atom labelling below.
			bondorderarr[value[0]]= bondorderarr[value[0]] + value[2] || value[2]
			bondorderarr[value[1]]= bondorderarr[value[1]] + value[2] || value[2]
			//end
			let bondsToAtomOne = points[value[0]][3].length
			let bondsToAtomTwo = points[value[1]][3].length
			
			
			let p1 = [points[value[0]][0], points[value[0]][1], points[value[0]][2]]
			let p2 = [points[value[1]][0], points[value[1]][1], points[value[1]][2]]
			let angle = Math.atan2((p1[1]-p2[1]), (p2[0]-p1[0]))
			switch (value[2]) {
				case 1:
					if(value[3] === 1) {
						ctx.beginPath()
						ctx.moveTo(p1[0], p1[1])
						
						let mid1 = [p2[0] + locus/2 * Math.cos(angle+(Math.PI/2)), p2[1] - locus/2 * Math.sin(angle+(Math.PI/2))]
						let mid2 = [p2[0] + locus/2 * Math.cos(angle-(Math.PI/2)), p2[1] - locus/2 * Math.sin(angle-(Math.PI/2))]
						ctx.lineTo(mid1[0], mid1[1])
						ctx.lineTo(mid2[0], mid2[1])
						ctx.lineTo(p1[0], p1[1])
						ctx.fill()
					}
					else if(value[3] === 2) {
						ctx.beginPath()
						
						for(let i = 0; i<5; i++) {
							let mid1 = [p1[0] + l*i/5*Math.cos(angle) + locus*i/5 * Math.cos(angle+(Math.PI/2)), p1[1]  - l*i/5*Math.sin(angle) - locus*i/5 * Math.sin(angle+(Math.PI/2))]
							let mid2 = [p1[0] + l*i/5*Math.cos(angle) + locus*i/5 * Math.cos(angle-(Math.PI/2)), p1[1]  - l*i/5*Math.sin(angle) - locus*i/5 * Math.sin(angle-(Math.PI/2))]
							ctx.moveTo(mid1[0], mid1[1])
							ctx.lineTo(mid2[0], mid2[1])
						}
						
						ctx.lineWidth=1
						ctx.stroke()
					}
					else if(value[3] === 3) {
						ctx.beginPath()
						ctx.moveTo(p2[0], p2[1])
						
						let mid1 = [p1[0] + locus/2 * Math.cos(angle+(Math.PI/2)), p1[1] - locus/2 * Math.sin(angle+(Math.PI/2))]
						let mid2 = [p1[0] + locus/2 * Math.cos(angle-(Math.PI/2)), p1[1] - locus/2 * Math.sin(angle-(Math.PI/2))]
						ctx.lineTo(mid1[0], mid1[1])
						ctx.lineTo(mid2[0], mid2[1])
						ctx.lineTo(p2[0], p2[1])
						ctx.fill()
					}
					else if(value[3] === 4) {
						ctx.beginPath()
						
						for(let i = 0; i<5; i++) {
							let mid1 = [p2[0] - l*i/5*Math.cos(angle) - locus*i/5 * Math.cos(angle+(Math.PI/2)), p2[1]  + l*i/5*Math.sin(angle) + locus*i/5 * Math.sin(angle+(Math.PI/2))]
							let mid2 = [p2[0] - l*i/5*Math.cos(angle) - locus*i/5 * Math.cos(angle-(Math.PI/2)), p2[1]  + l*i/5*Math.sin(angle) + locus*i/5 * Math.sin(angle-(Math.PI/2))]
							ctx.moveTo(mid1[0], mid1[1])
							ctx.lineTo(mid2[0], mid2[1])
						}
						
						ctx.lineWidth=1
						ctx.stroke()
					}
					else {
						ctx.beginPath()
						ctx.moveTo(p1[0], p1[1])
						ctx.lineWidth=2
						ctx.lineTo(p2[0], p2[1])
						ctx.stroke()
					}
					
				break
				case 2:
					
					
					if(!noDoubleBondCentering.includes(index) && ((bondsToAtomOne>2 && bondsToAtomTwo === 1) || (bondsToAtomTwo>2 && bondsToAtomOne === 1) || (p1[2] !== 67 || p2[2] !== 67))) {
						//docentred double bond
						let exlen = 1
						let start1 = [p1[0] + locus/2 * Math.cos(angle+(Math.PI/2)) - exlen*Math.cos(angle), p1[1] - locus/2 * Math.sin(angle+Math.PI/2) + exlen*Math.sin(angle)]
						let end1 = [p2[0] + locus/2 * Math.cos(angle+Math.PI/2) + exlen*Math.cos(angle), p2[1] - locus/2 * Math.sin(angle+Math.PI/2) - exlen*Math.sin(angle)]
						let start2 = [p1[0] + locus/2 * Math.cos(angle-(Math.PI/2)) - exlen*Math.cos(angle), p1[1] - locus/2 * Math.sin(angle-Math.PI/2) + exlen*Math.sin(angle)]
						let end2 = [p2[0] + locus/2 * Math.cos(angle-Math.PI/2) + exlen*Math.cos(angle), p2[1] - locus/2 * Math.sin(angle-Math.PI/2) - exlen*Math.sin(angle)]
						ctx.beginPath()
						ctx.lineWidth=2
						ctx.moveTo(start1[0], start1[1])
						ctx.lineTo(end1[0], end1[1])
						ctx.stroke()
						ctx.beginPath()
						ctx.lineWidth=2
						ctx.moveTo(start2[0], start2[1])
						ctx.lineTo(end2[0], end2[1])
						ctx.stroke()
					}
					else {
						ctx.beginPath()
						ctx.moveTo(p1[0], p1[1])
						ctx.lineWidth=2
						ctx.lineTo(p2[0], p2[1])
						ctx.stroke()
						
						let angle = Math.atan2((p1[1]-p2[1]), (p2[0]-p1[0]))
						let start = [p1[0] + locus * Math.cos(angle+(Math.PI/3)), p1[1] - locus * Math.sin(angle+(Math.PI/3))]
						let end = [p2[0] - locus * Math.cos(angle-Math.PI/3), p2[1] + locus * Math.sin(angle-Math.PI/3)] // draw double bond not quite as long as that of single bond
						ctx.beginPath()
						ctx.moveTo(start[0], start[1])
						ctx.lineTo(end[0], end[1])
						ctx.stroke()
					}
				break;
				case 3:
					ctx.beginPath()
					ctx.moveTo(p1[0], p1[1])
					ctx.lineWidth=2
					ctx.lineTo(p2[0], p2[1])				
					ctx.stroke()
					let start = [p1[0] + locus * Math.cos(angle+(Math.PI/2)), p1[1] - locus * Math.sin(angle+(Math.PI/2))]
					let end = [p2[0] + locus * Math.cos(angle+Math.PI/2), p2[1] - locus * Math.sin(angle+Math.PI/2)]
					ctx.beginPath()
					ctx.moveTo(start[0], start[1])
					ctx.lineTo(end[0], end[1])
					ctx.stroke()
					
					start = [p1[0] + locus * Math.cos(angle-(Math.PI/2)), p1[1] - locus * Math.sin(angle-(Math.PI/2))]
					end = [p2[0] + locus * Math.cos(angle-Math.PI/2), p2[1] - locus * Math.sin(angle-Math.PI/2)]
					ctx.beginPath()
					ctx.moveTo(start[0], start[1])
					ctx.lineTo(end[0], end[1])
					ctx.stroke()
				break;		
			}
			

        })
        $.each(points, function(index, value) {
			let bondcheck = bondorderarr[index] || 0
			let fontsize = that.options.fontsize //define fontsize from that set in global options
			let whitespace = that.options.whitespace
			
			if(that.options.pointsAsIndexed === false) {
				if(value[2] === 67) {
					if(bondcheck === 0) {
						ctx.beginPath()
						ctx.arc(value[0], value[1],whitespace/2,0,2*Math.PI)
						ctx.fillStyle = that.strokeStyle
						ctx.fill()
						
					}
				}
				else {
					ctx.beginPath()
					ctx.arc(value[0],value[1],whitespace,0,2*Math.PI);
					ctx.fillStyle = that.canvasColour  //Use the background colour of the canvas so this matches. 
					ctx.fill()
					ctx.beginPath()
					ctx.fillStyle = that.strokeStyle
					ctx.font = fontsize + "px Calibri"
					
					//get correct alignment of the atom label e.g. align center for H, Br, N, but align left for complex groups like B(OH)2
					let alignstyle = that.atomdict[value[2]][3] || "center"
					ctx.textAlign = alignstyle
					
					ctx.fillText(that.atomdict[value[2]][0], value[0], value[1]+(fontsize/3))
					
					
					
					let atomarr = that.atomdict[value[2]][1]
					let bondorder = -1
					if(bondcheck > atomarr.length) {
						bondorder = atomarr.length
					}
					else {
						bondorder = bondcheck - value[4] //The bond order is a combination of the number of bonds, and the charge on the atom
					}
					if(atomarr.length>0 && atomarr[bondorder-1]>0) {
						let coords = that.getNewPointCoords(index)
						let diff = [coords[0] - value[0], value[1]-coords[1]]
						let angle = Math.atan2(diff[1], diff[0])
						//convert all negative angles to their positive equivalent for easier analysis
						if(angle<0) {
							angle = Math.abs(-Math.PI-angle)+Math.PI	
						}
						
						let xspacing = 2
						let yspacing = 2
						let mytext = ""
						if(atomarr[bondorder-1] === 1) {
							mytext = "H"
						}
						else if(atomarr[bondorder-1] === 2) {
							mytext = "H"+String.fromCharCode(8322)
							xspacing = 5
						}
						else if(atomarr[bondorder-1] === 3) {
							mytext = "H"+String.fromCharCode(8323)
							xspacing = 5
						}
						
						if(Math.PI/4 < angle && angle < 3*Math.PI/4 && value[3].length>1){ //Hydrogens should only be oriented like this if the point has more than 1 bond. 
							//hydrogen should be above parent heteroatom
							ctx.fillText(mytext, value[0], value[1]-(1*fontsize/3)-yspacing)
						}
						else if(5*Math.PI/4 < angle && angle < 7*Math.PI/4 && value[3].length > 1) {
							//hydrogen should be below parent heteroatom
							ctx.fillText(mytext, value[0], value[1]+(3*fontsize/3)+yspacing)
						}
						else if(Math.PI/2 < angle && angle < 3*Math.PI/2){
							//hydrogen should be to left of parent heteroatom
							ctx.fillText(mytext, value[0]-(fontsize/2)-xspacing, value[1]+(fontsize/3))
						}
						
						else{
							//hydrogen should be to right of parent heteroatom
							ctx.fillText(mytext, value[0]+(fontsize/2)+xspacing, value[1]+(fontsize/3))
						}
					}
				}
				
				//Label the atom with its charge, if necessary
				
				if(value[4] !== 0) {
					ctx.beginPath()
					
					ctx.font = fontsize/1.3 + "px Calibri"
					
					//get correct alignment of the atom label e.g. align center for H, Br, N, but align left for complex groups like B(OH)2
					let mytext = value[4]
					if(mytext === -1) {
						mytext = "-"
					}
					else if(mytext === 1) {
						mytext = "+"
					}
					else if(mytext > 1) {
						mytext = "+" + value[4]
					}
					
					let xspacing = whitespace * Math.cos(Math.PI/4) * 1.3
					let yspacing = whitespace * Math.sin(Math.PI/4) * 1.3
					if(value[3].length > 1) {
						let coords = that.getNewPointCoords(index)
						let diff = [coords[0] - value[0], value[1]-coords[1]]
						let angle = Math.atan2(diff[1], diff[0])
						//convert all negative angles to their positive equivalent for easier analysis
						if(angle<0) {
							angle = Math.abs(-Math.PI-angle)+Math.PI	
						}
						
						if(Math.PI/2 < angle && angle < Math.PI) {
							//charge should be placed top left of atom
							ctx.fillText(mytext, value[0] - xspacing, value[1] - yspacing)
						}
						else if(Math.PI < angle && angle < 3*Math.PI/2) {
							//charge should be placed bottom left of atom
							ctx.fillText(mytext, value[0] - xspacing, value[1] + yspacing)
						}
						else if(3*Math.PI/2 < angle && angle < 2*Math.PI) {
							//charge should be placed bottom right of atom
							ctx.fillText(mytext, value[0] + xspacing, value[1] + yspacing)
						}
						else {
						//charge should be placed top right of atom
						ctx.fillText(mytext, value[0] + xspacing, value[1] - yspacing)
						}
					}
					else {
						//charge should be placed top right of atom
						ctx.fillText(mytext, value[0] + xspacing, value[1] - yspacing)
					}
					
					
				}
			}
			else {
				ctx.beginPath()
				ctx.arc(value[0],value[1],whitespace,0,2*Math.PI);
				ctx.fillStyle = that.canvasColour
				ctx.fill()
				ctx.beginPath()
				ctx.fillStyle = that.strokeStyle
				ctx.font = fontsize + "px Calibri"
				ctx.textAlign = "center"
				ctx.fillText(index, value[0], value[1]+(fontsize/3))
			}
		})
		$.each(this.shapes, function(index, value) {
			if(value[0] === "arrow") {
				let x = value[1][0], y = value[1][1], angle = value[1][2], length = value[1][3]
				let ahs = that.options.arrowHead
				let x1 = x + Math.cos(angle)*(length-5)
				let y1 = y - Math.sin(angle)*(length-5)
				that.ctx.beginPath()
				that.ctx.lineWidth=2
				
				that.ctx.moveTo(x, y)
				that.ctx.lineTo(x1, y1)
				that.ctx.stroke()
				
				let point1 = [x1 + Math.cos(angle+Math.PI/2)*ahs, y1-Math.sin(angle+Math.PI/2)*ahs]
				that.ctx.lineTo(point1[0], point1[1])
				that.ctx.stroke()
				
				let point2 = [x1 + Math.cos(angle)*ahs, y1-Math.sin(angle)*ahs]
				that.ctx.lineTo(point2[0], point2[1])
				that.ctx.stroke()
				
				let point3 = [x1 + Math.cos(angle-Math.PI/2)*ahs, y1-Math.sin(angle-Math.PI/2)*ahs]
				that.ctx.lineTo(point3[0], point3[1])
				that.ctx.stroke()
				
				that.ctx.lineTo(x1, y1)
				that.ctx.stroke()
			}
		})

		
		$.each(this.selection, function(index, value) {
			that.highlightAtom(value)
		})
		
		$.each(this.shapeSelection, function(index, value) {
			that.highlightShape(value)
		})

    }
	
	//Selects the items that appear inside the box that is drawn by the fn below, in response from mouse "click-n-drag"
	//input from the user.
	Glass.prototype.selectItems = function(e) {
		
		$(' #'+this.id+'-canvas').off("mousemove")
		let [startx, starty] = this.getCurrentCoords(e)
		let that = this
		$(' #'+this.id+'-canvas').on("mousemove", function(p) {
			that.selector = true
			that.refreshCanvas()
			let [endx, endy] = that.getCurrentCoords(p)
			that.selection = []
			that.shapeSelection = []
			$.each(that.points, function(index, value) {
				if(((startx < value[0] && value[0] < endx) || (startx > value[0] && value[0] > endx)) && ((starty < value[1] && value[1] < endy) || (starty > value[1] && value[1] > endy)))  {
					that.selection.push(index)
				}
			})
			
			$.each(that.shapes, function(index, value) {
				if(value[0] === "arrow") {
					let arrowheadXY = [value[1][0] + value[1][3]*Math.cos(value[1][2]), value[1][1] - value[1][3]*Math.sin(value[1][2])]
					if(((startx < value[1][0] && value[1][0] < endx) || (startx > value[1][0] && value[1][0] > endx)) && ((starty < value[1][1] && value[1][1] < endy) || (starty > value[1][1] && value[1][1] > endy))) {
						if(((startx < arrowheadXY[0] && arrowheadXY[0] < endx) || (startx > arrowheadXY[0] && arrowheadXY[0] > endx)) && ((starty < arrowheadXY[1] && arrowheadXY[1] < endy) || (starty > arrowheadXY[1] && arrowheadXY[1] > endy))) {
							that.shapeSelection.push(index)
						}
					}
				}
			})
			that.ctx.beginPath()
			that.ctx.lineWidth=1
			that.ctx.rect(startx, starty, endx-startx, endy-starty)
			that.ctx.stroke();
		})
	}
	
	//Select everything on the page
	Glass.prototype.selectAll = function() {
		
		this.selection = Object.keys(this.points)
		this.shapeSelection = Object.keys(this.shapes)
		this.refreshCanvas()
	}
	
	//move the selection, following the cursor while the left mouse button is held down.
	Glass.prototype.moveSelection = function(minx, miny, e) {
		
		$(' #'+this.id+'-canvas').off("mousemove")
		let xy = this.getCurrentCoords(e)
		let startx = xy[0], starty = xy[1]
		let oldPointInfo = JSON.parse(JSON.stringify(this.points))
		let oldShapes = JSON.parse(JSON.stringify(this.shapes))
		let that = this
		
		$(' #'+this.id+'-canvas').on("mousemove", function(p) {
			that.molmove = true
			let xy = that.getCurrentCoords(p)
			let x = xy[0], y = xy[1]
			let diffx = x - startx
			let diffy = y - starty
			
			$.each(that.selection, function(index, value) {
			
				let oldx = oldPointInfo[value][0]
				let oldy = oldPointInfo[value][1]
				let newx = oldx + diffx
				let newy = oldy + diffy
				that.points[value][0] = newx
				that.points[value][1] = newy
				
			})
			
			$.each(that.shapeSelection, function(index, value) {
				let oldx = oldShapes[value][1][0]
				let oldy = oldShapes[value][1][1]
				that.shapes[value][1][0] = oldx + diffx
				that.shapes[value][1][1] = oldy + diffy
			})
			that.refreshCanvas()
		})	
	}
	
	//Clicking a point and holding down allows the user to choose which direction the next bond goes in, 
	//instead of the software deciding the optimum position. The user also has the option of drawing a point farther away
	//that the standard bond length. Finally, when close enough, the line will "snap" to a nearby point. 
	Glass.prototype.setBondDirection = function(pointclick) {
		
		$(' #'+this.id+'-canvas').off("mousemove")
		
		let [initialX, initialY] = this.points[pointclick]
		this.ctx.beginPath()
		this.ctx.lineWidth=2
		this.ctx.arc(initialX, initialY, this.options.l, 0, 2*Math.PI)
		this.ctx.stroke()
		
		let that = this
		$(' #'+this.id+'-canvas').on("mousemove", function(e) {
			that.refreshCanvas()
			that.futuredir = true
			
			let [x, y] = that.getCurrentCoords(e)
			let distance2 = Math.pow(x-initialX, 2) +  Math.pow(y-initialY, 2)
			
			if(distance2 > Math.pow(that.options.l, 2)) {
				//If the user's cursor is sufficiently close to an existing point, the future point should "snap" to 
				//that existing point, with appropriate visual aids to notify the user of this behaviour. 
				let snapPoint = that.points.findIndex(value => {
					let spDistance = Math.pow(value[0] - x, 2) + Math.pow(value[1] - y, 2)
					if(spDistance < 49) {
						return true
					}
				})
				
				if(snapPoint > -1) {
					//Draw a line from the originally clicked point, and the "snapPoint"
					let pointxy = [that.points[snapPoint][0], that.points[snapPoint][1]]
					
					that.futurepoint = [initialX, initialY, pointxy[0], pointxy[1], pointclick]
					that.ctx.beginPath()
					that.ctx.moveTo(pointclick[0], pointclick[1])
					that.ctx.lineTo(pointxy[0], pointxy[1])
					that.ctx.lineWidth=2
					that.ctx.stroke()
					
					//Draw a small circle around the "snapPoint" to notify the user that this point is the snapPoint 
					that.ctx.beginPath()
					that.ctx.lineWidth=1
					that.ctx.arc(pointxy[0], pointxy[1], 5, 0, 2*Math.PI)
					that.ctx.stroke()
				}
				
				//If there isn't a snapPoint, simply draw a line from the originally clicked point to where
				//the new hypothetical point will be placed. 
				that.futurepoint = [initialX, initialY, x, y, pointclick]
				that.ctx.beginPath()
				that.ctx.moveTo(initialX, initialY)
				that.ctx.lineTo(x, y)
				that.ctx.stroke()	
			}
			
			else {
				let diff = [x - initialX, initialY - y]
				let angle = Math.atan2(diff[1], diff[0])
				let newx = that.points[pointclick][0] + that.options.l * Math.cos(angle)
				let newy = that.points[pointclick][1] - that.options.l * Math.sin(angle)
				that.futurepoint = [initialX, initialY, newx, newy, pointclick]
				that.ctx.beginPath()
				that.ctx.moveTo(initialX, initialY)
				that.ctx.lineTo(newx, newy)
				that.ctx.stroke()
				
				
				that.ctx.beginPath()
				that.ctx.lineWidth=1
				that.ctx.arc(initialX, initialY, that.options.l, 0, 2*Math.PI)
				that.ctx.stroke()
			}
		})
	}	
	
	//draws a rxn arrow on the canvas, and updates the state. Then, re-renders.
	Glass.prototype.drawArrow = function(e, length) {
		
		$(' #'+this.id+'-canvas').off("mousemove")
		let [x, y] = this.getCurrentCoords(e)
		let that = this
		//ahs = arrow head size, defines how big the arrow head will be, as set by the options/user
		let ahs = this.options.arrowHead
		$(' #'+this.id+'-canvas').on("mousemove", function(f) {
			that.refreshCanvas()
			let coords = that.getCurrentCoords(f)
			let length = Math.sqrt(Math.pow(coords[0]-x, 2) + Math.pow(coords[1]-y, 2))

			let angle
			if(that.options.allowDiagonalArrows === true) {
				angle = Math.atan2(y-coords[1], coords[0]-x)
			}
			else {
				angle = 0
			}
			let x1 = x + Math.cos(angle)*(length-5)
			let y1 = y - Math.sin(angle)*(length-5)

			
			that.ctx.beginPath()
			that.ctx.lineWidth=2
			
			that.ctx.moveTo(x, y)
			that.ctx.lineTo(x1, y1)
			that.ctx.stroke()
			
			let point1 = [x1 + Math.cos(angle+Math.PI/2)*ahs, y1-Math.sin(angle+Math.PI/2)*ahs]
			that.ctx.lineTo(point1[0], point1[1])
			that.ctx.stroke()
			
			let point2 = [x1 + Math.cos(angle)*ahs, y1-Math.sin(angle)*ahs]
			that.ctx.lineTo(point2[0], point2[1])
			that.ctx.stroke()
			
			let point3 = [x1 + Math.cos(angle-Math.PI/2)*ahs, y1-Math.sin(angle-Math.PI/2)*ahs]
			that.ctx.lineTo(point3[0], point3[1])
			that.ctx.stroke()
			
			that.ctx.lineTo(x1, y1)
			that.ctx.stroke()
			
			that.futurearrow = [x, y, angle, Math.sqrt(Math.pow(x1-x, 2) + Math.pow(y1-y, 2)) + ahs]
		})		
	}
	
	Glass.prototype.commitArrow = function() {
		this.shapes.push(["arrow", this.futurearrow])
		this.nextClick = ""
		this.futurearrow=[]
		
		$('#'+this.id+' .glass-left-buttons svg').removeClass("highlight-svg")
		$('#'+this.id+' .glass-left-buttons-1bond').addClass("highlight-svg")
	}
	
	//Copies all information about the points and bonds currently in selection, to a temporary storage 
	//(this.atomsToBeCopied and this.bondsToBeCopied)
	Glass.prototype.copySelection = function() {
		let bondsDone = []
		this.atomsToBeCopied = []
		this.bondsToBeCopied = []
		this.shapesToBeCopied = []
		let that = this
		let bonds = this.bonds
		let selection = this.selection
		
		//Copy information about the index and the value of each point for 
		//later retrieval
		this.atomsToBeCopied = selection.map(x => {
			return [x, [this.points[x][0], this.points[x][1], this.points[x][2], [], this.points[x][4]]]
		})
		
		//Copy across any relevant bonds. 
		this.bondsToBeCopied = bonds.filter(function(value, index, arr) {
			if(selection.includes(value[0]) && selection.includes(value[1])) {
				return true
			}
		})
		
		Array.prototype.push.apply(this.shapesToBeCopied, this.shapeSelection)
		
	}
	
	//Copies all the information held in storage (as above) into the state.
	Glass.prototype.pasteSelection = function() {
		
		let x = this.curx
        let y = this.cury
		let minx = 1000000
		let miny = 1000000
		this.selection = []
		this.shapeSelection = []
		
		let that = this
		
		//Build a translation dictionary as additional points are added
		//so that we can accurately add the bond info as well. 
		let translationDict = {}
		
		//Find the upper left corner of the selection, which will guide the placement of
		//all the items that are pasted. 
		$.each(this.atomsToBeCopied, function(index, value) {
			minx = Math.min(minx, value[1][0])
			miny = Math.min(miny, value[1][1])
		})
		
		$.each(this.shapesToBeCopied, function(index, value) {
			let x = that.shapes[value][1][0]
			let y = that.shapes[value][1][1]
			let angle = that.shapes[value][1][2]
			let length = that.shapes[value][1][3]
			let x1 = x + Math.cos(angle)*(length-5)
			let y1 = y - Math.sin(angle)*(length-5)
			minx = Math.min(minx, x, x1)
			miny = Math.min(miny, y, y1)
		})
		
		//Paste all the atoms into the points array. 
		$.each(this.atomsToBeCopied, function(index, value) {
			let newx = value[1][0] - minx + x
			let newy = value[1][1] - miny + y
			
			that.points.push([newx, newy, value[1][2], [], value[1][4]])
			translationDict[value[0]] = that.points.length - 1
			that.selection.push(that.points.length-1)
		})
		
		//Paste all the bonds into the bonds array, updating the information as we go. 
		$.each(this.bondsToBeCopied, function(index, value) {
			let newindex1 = translationDict[value[0]]
			let newindex2 = translationDict[value[1]]
			that.bonds.push([newindex1, newindex2, value[2], value[3]])
		})
		
		//Delete all bonded neighbour infomation, and replace it using the 
		//bond array as a template. 
		this.points = this.points.map(x => [x[0], x[1], x[2], [], x[4]])
		
		//Replace all the bonded neighbour information in the points array.  
		$.each(this.bonds, function(index, value) {
			that.points[value[0]][3].push(value[1])
			that.points[value[1]][3].push(value[0])
		})
		
		//Paste all the new shapes into the shapes array, updating position of new shapes as we go. 
		$.each(this.shapesToBeCopied, function(index, value) {
			let newx = that.shapes[value][1][0] - minx + x
			let newy = that.shapes[value][1][1] - miny + y
			that.shapes.push([that.shapes[value][0], [newx, newy, that.shapes[value][1][2], that.shapes[value][1][3]]])
			that.shapeSelection.push(that.shapes.length-1)
		})
		this.refreshCanvas()
	}
	
	//Deletes the points and bonds selected. Alternatively, if nothing is selected, deletes
	//either the point, bond or shape that the mouse is hovering over.
	Glass.prototype.deleteSelection = function() {
		let that = this
		
		//If there are no points and no shapes currently selected, look for a point or bond to delete
		//based on where the cursor currently is hovering. 
		if(this.selection.length === 0 && this.shapeSelection.length === 0) {
			let pointclick = this.getPointClicked("", [this.curx, this.cury])
			let bondclick = this.getBondClicked("", [this.curx, this.cury])
			if(pointclick !== -1)	{
				that.selection.push(pointclick)
			}
			else if(bondclick !== -1) {

				this.bonds.splice(bondclick, 1)

				//Delete all bonded neighbour infomation, and replace it using the 
				//bond array as a template. 
				this.points = this.points.map(x => [x[0], x[1], x[2], [], x[4]])
				$.each(this.bonds, function(index, value) {
					that.points[value[0]][3].push(value[1])
					that.points[value[1]][3].push(value[0])
				})
				this.refreshCanvas()
			}
			else {
				//Determine if a shape was hovered over when the delete key was pressed. 
				$.each(that.shapes, function(index, value) {
					if(value[0] === "arrow") {
						let x1 = value[1][0], y1 = value[1][1]
						let x2 = x1 + Math.cos(value[1][2]) * value[1][3]
						let y2 = y1 - Math.sin(value[1][2]) * value[1][3]
						
						let d1 = Math.pow(that.curx - x1, 2) + Math.pow(that.cury - y1, 2)
						let d2 = Math.pow(that.curx - x2, 2) + Math.pow(that.cury - y2, 2)
						
						let normdist = d1 - Math.pow((value[1][3]**2 + d1 - d2)/(2*value[1][3]), 2)

						if(normdist < 17 && d1 < Math.pow(value[1][3], 2) && d2 < Math.pow(value[1][3], 2)) {
							that.shapeSelection.push(index)
							
						}
					}
				})
			}
						
		}

		if(this.selection.length !== 0) {
			let tmppointarr = []
			$.each(this.points, function(pindex, pvalue) {
				let goingin = true
				$.each(that.selection, function(sindex, svalue) {
					if(pindex === svalue) {
						goingin = false
					}
				})
				if(goingin) {
					tmppointarr.push([pvalue[0], pvalue[1], pvalue[2], [], pvalue[4]])
				}
				
			})
			this.points = tmppointarr

			let tmpbondarr = []
			$.each(this.bonds, function(bindex, bvalue) {
				let goingin = true
				$.each(that.selection, function(sindex, svalue) {
					if(bvalue[0]==svalue || bvalue[1]==svalue) {
						goingin = false
					}
				})
				if(goingin) {
					tmpbondarr.push(bvalue)
				}
			})
			
			$.each(tmpbondarr, function(index, value) {
				let reduction1 = 0
				let reduction2 = 0
				$.each(that.selection, function(sindex, svalue) {
					
					if(value[0]>svalue) {
						reduction1 = reduction1 + 1
					}
					
					if(value[1]>svalue) {
						reduction2 = reduction2 + 1
					}
				})
				tmpbondarr[index][0] = tmpbondarr[index][0] -reduction1
				tmpbondarr[index][1] = tmpbondarr[index][1] -reduction2
			})
			this.bonds = tmpbondarr
			$.each(this.bonds, function(index, value) {
				that.points[value[0]][3].push(value[1])
				that.points[value[1]][3].push(value[0])
			})	
		}
		if(this.shapeSelection.length !== 0) {
			that.shapes = that.shapes.filter(function(value, index, arr) {
				if(!that.shapeSelection.includes(index)) {
					return value
				}
			})
		}
		
		
		this.selection = []
		this.shapeSelection = []
		this.refreshCanvas()
	}
	
	//This function looks for certain functional groups, and converts them to a pre-determined tautomer/mesomer/etc to ensure 
	//that all structure can look the same. This function is vital for being able to export a canonicalised SMILES. 
	Glass.prototype.canonicaliseStructure = function() {
		let points = this.points
		let bonds = this.bonds
		let that = this
		
		let bondarr = []
		$.each(bonds, function(index, value) {
			bondarr[value[0]] = bondarr[value[0]] || {}
			bondarr[value[0]][value[1]] = [index, value[2], value[3]]
			bondarr[value[1]] = bondarr[value[1]] || {}
			bondarr[value[1]][value[0]] = [index, value[2], value[3]]
		})
		
		function changeBond(point1, point2, newBondValence) {
			
			let bondIndex = bondarr[point1][point2][0]
			if(bondIndex > -1) {
				that.bonds[bondIndex][2] = newBondValence
			}
		}
		
		function setCharge(point1, newPointCharge) {
			if(!isNaN(newPointCharge) && that.points[point1]) {
				that.points[point1][4] = newPointCharge	
			}
		}
		
		function deletePoint(point1) {
			if(that.points[point1]) {
				that.selection = [point1]
				that.deleteSelection()
			}
		}
		
		function changePointType(point1, newElementType) {
			
		}
		
		//Find groups which need to be canonicalised, and fix them
		let functionalGroups = this.findFragments(this.canonicalGroups)
		let donePoints = []
		
		$.each(functionalGroups, function(index, value) {
			
			if(value[1].filter(x => donePoints.includes(x)).length === 0) { //Filter down to array intersection, and if length is greater than 0, skip fn Group
				Array.prototype.push.apply(donePoints, value[1])
				let instructions = that.canonicalGroups[value[0]].canonicalise
				$.each(instructions, function(bindex, bvalue) {
					switch(bvalue[0]) {
						case "changeBond":
							changeBond(value[1][bvalue[1]], value[1][bvalue[2]], bvalue[3])
						break;
						
						case "setCharge": 
							setCharge(value[1][bvalue[1]], bvalue[2])
						break;
						
						case "deletePoint":
							deletePoint(value[1][bvalue[1]])
						break;
					}
						
				})
			}
		})

		this.refreshCanvas()
	}
	
	
	Glass.prototype.centreandRedraw = function() {
		let that = this
		let points = that.points
		let bonds = that.bonds
		let scaling = 1
		
		//begin by getting the rectangular size of the molecule, find the centre, and move it to match the centre of the canvas
		let minx = 100000
		let miny = 100000
		let maxx = -100000
		let maxy = -100000
		
		$.each(points, function(index, value) {
			minx = Math.min(value[0], minx)
			maxx = Math.max(value[0], maxx)
			miny = Math.min(value[1], miny)
			maxy = Math.max(value[1], maxy)
		})
		
		$.each(this.shapes, function(index, value) {
			if(value[0] == "arrow") {
				let x = value[1][0], y = value[1][1], angle = value[1][2], length = value[1][3]
				let x1 = x + Math.cos(angle)*(length-5)
				let y1 = y - Math.sin(angle)*(length-5)
				
				minx = Math.min(x, x1, minx)
				maxx = Math.max(x, x1, maxx)
				miny = Math.min(y, y1, miny)
				maxy = Math.max(y, y1, maxy)
			}
		})
		

		//find the mid point of the hypothetical rectangle encompassing all drawn elements on the canvas
		let midx = (minx + maxx)/2
		let midy = (miny + maxy)/2
		
		//find the difference between the rectangular centre and the canvas centre
		let diffx = that.canvasWidth/2 - midx
		let diffy = that.canvasHeight/2 - midy

		//translocate every point by this difference, with the effect of moving all drawn elements to the centre
		$.each(points, function(index, value) {
			value[0] = value[0] + diffx
			value[1] = value[1] + diffy
		})
		

		//determine the width and the height of the molecule, and if it's larger than the canvas, scale the molecule
		//so that it fits correctly.
		let sizex = (maxx - minx) + 40 //add a margin so molecule fits comfortably
		let sizey = (maxy - miny) + 40
		
		if(sizex > that.canvasWidth || sizey > that.canvasHeight) {
			if(sizex < sizey) {
				scaling = (that.canvasHeight)/sizey
			}
			else {
				scaling = (that.canvasWidth)/sizex
			}
		}
		
		
		$.each(points, function(index, value) {
			let diffx = value[0] - that.canvasWidth/2
			let diffy = value[1] - that.canvasHeight/2
			value[0] = that.canvasWidth/2 + (diffx * scaling)
			value[1] = that.canvasHeight/2 + (diffy * scaling)
			
		})
		
		//For each shape (arrow), multiply the arrow length that.shapes[index][1][3] by the scaling factor. 
		$.each(this.shapes, function(index, value) {
			if(value[0] == "arrow") {
				let newXY = [value[1][0]+diffx, value[1][1]+diffy]
				that.shapes[index][1][0] = newXY[0]
				that.shapes[index][1][1] = newXY[1]
				that.shapes[index][1][3] = that.shapes[index][1][3] * scaling
			}
		})	
		
		
		this.options.fontsize = this.options.fontsize * scaling
		this.options.l = this.options.l * scaling
		this.options.whitespace = this.options.whitespace * scaling
		this.options.locus = this.options.locus * scaling
		
		//refresh the canvas so that we can see the results of the above transformations	
		this.refreshCanvas()
		
		//return the scaling parameter that was used in case this is useful. Note: since the new point positions have been saved, 
		//which encode the new bond lengths as a consequence, saving this scaling parameter should not be required. 
		return scaling
		
		
	}
	
	Glass.prototype.zoomIn = function(scaling) {
		scaling = scaling || 1.1
		let that = this
		let centre = [that.options.width/2, that.options.height/2]
		$.each(this.points, function(index, value) {
			let diffXY = [(centre[0] - value[0])*(scaling-1), (centre[1] - value[1])*(scaling-1)]
			let newXY = [value[0]-diffXY[0], value[1]-diffXY[1]]
			that.points[index][0] = newXY[0]
			that.points[index][1] = newXY[1]
		})
		
		//For each shape (arrow), multiply the arrow length that.shapes[index][1][3] by the scaling factor. 
		$.each(this.shapes, function(index, value) {
			if(value[0] == "arrow") {
				let diffXY = [(centre[0] - value[1][0])*(scaling-1), (centre[1] - value[1][1])*(scaling-1)]
				let newXY = [value[1][0]-diffXY[0], value[1][1]-diffXY[1]]
				that.shapes[index][1][0] = newXY[0]
				that.shapes[index][1][1] = newXY[1]
				that.shapes[index][1][3] = that.shapes[index][1][3] * scaling
			}
		})
		
		this.options.fontsize = this.options.fontsize * scaling
		this.options.l = this.options.l * scaling
		this.options.whitespace = this.options.whitespace * scaling
		this.options.locus = this.options.locus * scaling
		this.refreshCanvas()
	}
	
	Glass.prototype.zoomOut = function(scaling) {
		scaling = scaling || 0.9
		let that = this
		let centre = [that.options.width/2, that.options.height/2]
		$.each(this.points, function(index, value) {
			let diffXY = [(centre[0] - value[0])*(scaling-1), (centre[1] - value[1])*(scaling-1)]
			let newXY = [value[0]-diffXY[0], value[1]-diffXY[1]]
			that.points[index][0] = newXY[0]
			that.points[index][1] = newXY[1]
		})
		
		//For each shape (arrow), multiply the arrow length that.shapes[index][1][3] by the scaling factor. 
		$.each(this.shapes, function(index, value) {
			if(value[0] == "arrow") {
				let diffXY = [(centre[0] - value[1][0])*(scaling-1), (centre[1] - value[1][1])*(scaling-1)]
				let newXY = [value[1][0]-diffXY[0], value[1][1]-diffXY[1]]
				that.shapes[index][1][0] = newXY[0]
				that.shapes[index][1][1] = newXY[1]
				that.shapes[index][1][3] = that.shapes[index][1][3] * scaling
			}
		})
		
		this.options.fontsize = this.options.fontsize * scaling
		this.options.l = this.options.l * scaling
		this.options.whitespace = this.options.whitespace * scaling
		this.options.locus = this.options.locus * scaling
		this.refreshCanvas()
	}
	
	//a function to find, and name, rings and ring systems. 
	//The way this function works is to examine each bond individually, 
	//then traverse the whole network to find an alternative way to 
	//join pointA with pointB. A successful traversal is a ring. 
	Glass.prototype.findRings = function(bondarr) {
		let points = this.points
		let bonds = this.bonds
		let that = this
		let atomdict = this.atomdict
		let rings = {}
		
		bondarr = bondarr || []
		if(bondarr.length === 0) {
			$.each(bonds, function(index, value) {
				bondarr[value[0]] = bondarr[value[0]] || {}
				bondarr[value[0]][value[1]] = [value[2], value[3], index]
				bondarr[value[1]] = bondarr[value[1]] || {}
				bondarr[value[1]][value[0]] = [value[2], value[3], index]
			})
		}
		
		function iterateThroughPoints(currPoint, pointsThus, pointA, pointB) {
			$.each(points[currPoint][3], function(index, value) {
				if(!pointsThus.includes(value) && value !== pointB) {
					iterateThroughPoints(value, pointsThus.concat([value]), pointA, pointB)
				}
				else if(value === pointB && currPoint !== pointA) {
					let ring = pointsThus.concat([value]).sort((a, b) => a-b)
					let newIndex = ring.join("-")
					rings[newIndex] = pointsThus.concat([value])
				}
			})
		}
		
		//name the ring either aromatic, parsat, or satring
		function nameRingFuntionality(ring) {
			let heteroatoms = []
			let pielectrons = 0
			let doublebonds = []
			
			$.each(ring, function(index, value) {
				if(points[value][2] !== 67) {
					heteroatoms.push([points[value][2], value])
					let doublebondcheck = false
					$.each(points[value][3], function(bindex, bvalue) {
						if(bondarr[value][bvalue][0] === 2) {
							doublebondcheck = true
						}
					})
					//check that the heteroatom is not part of a double bond, and is not 
					//substituted beyond its maximum valency, and therefore able to contribute pi-electrons
					if(!doublebondcheck && points[value][3].length <= atomdict[points[value][2]][1].length) {
						pielectrons += 2
					}
				}
				
				//check that the point is not substituted beyond its maximum valency
				if(points[value][3].length <= atomdict[points[value][2]][1].length) {
					$.each(points[value][3], function(pindex, pvalue) {
						if(bondarr[value][pvalue][0] === 2 && doublebonds.indexOf(value) < 0 && doublebonds.indexOf(pvalue) < 0) {
							doublebonds.push(value) //check for double bonds, and if found, add the relevant points to the array, and update pielectron count
							doublebonds.push(pvalue)
							pielectrons = pielectrons + 2
						}
						
						
					})
				}
			})
			

			let ringtype = ""
			let aromaticrule = ((pielectrons-2)/4) //standard 4n+2 rule used to determine aromaticity. 
			let allpointssp2 = true //check to make sure that all the carbons in the ring are sp2 hydbridised, not sp3 or sp
			$.each(ring, function(index, value) {
				if(points[value][2] === 67) {
					let sp2bonds = 0
					$.each(bondarr[value], function(bindex, bvalue) {
						if(bvalue[0] === 2) {
							sp2bonds++
						}
					})
					if(sp2bonds !== 1) {
						allpointssp2 = false
						return false
					}
				}
			})
			
			if(doublebonds.length === 0) {
				ringtype = "satring"
			}
			else if(Number.isInteger(aromaticrule) && allpointssp2 && (pielectrons === ring.length || pielectrons === ring.length + 1)) {
				ringtype = "aromatic"
			}
			else {
				ringtype = "parsat"
			}
			return [ringtype, heteroatoms]
		}
		

		$.each(bonds, function(index, value) {

			iterateThroughPoints(value[0], [value[0]], value[0], value[1])

		})

		$.each(rings, function(index, value) {
			rings[index] = value.filter(function(bvalue, bindex, arr) {
				if(arr.indexOf(bvalue) === bindex) {
					return true
				}
			})
		})
		
		//COnvert an object to array
		let uniqueRings = Object.values(rings)
		
		//Sort the rings by order of size, from smallest to largest. 
		uniqueRings.sort(function(a, b) {
			return a.length - b.length
		})
		
		//Name each ring as either saturated, parsat (partially saturated) or aromatic. Return the number of heteroatoms. 
		$.each(uniqueRings, function(index, value) {
			let [name, heteroatoms] = nameRingFuntionality(value)
			uniqueRings[index] = [name, heteroatoms, value]
		})
		
		//Search for all rings that are part of an aromatic ring system, and make sure they
		//are marked as an aromatic ring themselves. 
		
		let aromaticRings = uniqueRings.filter(x => x[0] === "aromatic")
		
		$.each(uniqueRings, function(index, value) {
			//Look at only those rings which are currently labelled "parsat".
			//These are the only ones which may need to be relabelled to "aromatic"
			if(value[0] === "parsat") {
				//If an aromatic ring contains all of the points in the ring under investigation, 
				//this ring must also be aromatic. 
				$.each(aromaticRings, function(bindex, bvalue) {
					let overlap = bvalue[2].filter(x => value[2].includes(x))
					if(overlap.length === value[2].length) {
						uniqueRings[index][0] = "aromatic"
					}
				})
			}
		})	
		return uniqueRings
	}
	
	//Double bonds can be rendered on the outside of a ring, which can look odd. This function finds those which would be 
	//rendered incorrectly, and fixes that. 
	Glass.prototype.fixDoubleBondPlacement = function() {
		
		let points = this.points
		let bonds = this.bonds
		let rings = this.findRings()
		let locus = this.options.locus

		//we need to correct (if necessary) each ring that is aromatic or parsat
		$.each(rings, function(index, value) {
			if(value[0] == "aromatic" || value[0] == "parsat") {
				$.each(bonds, function(bindex, bvalue) {
					//if the current bond is part of the ring currently being examined, and has a bond order of 2
					if(value[2].includes(bvalue[0]) && value[2].includes(bvalue[1]) && bvalue[2] == 2) {
						
						//calculate where the double bond would be drawn
						let p1 = points[bvalue[0]]
						let p2 = points[bvalue[1]]
						let angle = Math.atan2((p1[1]-p2[1]), (p2[0]-p1[0]))
						let start = [p1[0] + locus * Math.cos(angle+(Math.PI/3)), p1[1] - locus * Math.sin(angle+(Math.PI/3))]
						
						//if the distance of all other rings points to the double bond is greater than the distance of all other ring poins to the single bond
						//we know that the double bond has been drawn outside the ring. Therefore, it needs to be moved, which can be done
						//by swapping the order of the points in the bond array. 
						let sumtodoublebond = 0
						let sumtosinglebond = 0
						
						$.each(value[2], function(cindex, cvalue) {
							if(cvalue != bvalue[0] && cvalue != bvalue[1]) {
								let distance1 = Math.pow(points[cvalue][0] - start[0], 2) + Math.pow(start[1]-points[cvalue][1], 2)
								sumtodoublebond = sumtodoublebond + distance1
								
								let distance2 = Math.pow(points[cvalue][0] - p1[0], 2) + Math.pow(p1[1]-points[cvalue][1], 2)
								sumtosinglebond = sumtosinglebond + distance2
							}
						})
						
						
						if(sumtodoublebond > sumtosinglebond) {
							let copy0 = JSON.parse(JSON.stringify(bvalue[0]))
							let copy1 = JSON.parse(JSON.stringify(bvalue[1]))
							bvalue[1] = copy0
							bvalue[0] = copy1
						}
					}
				})
			}
		})
					
		this.refreshCanvas()
	}
		
		
	//This function takes a functional group (provided as [title, a set of points] which have already been found using the findFragments fn),
	//and replaces it with an analogue group (provided as [parent, child] to allow navigation through the "analogueGroups" object).
	//Note: the findFragments function automatically adds all hydrogen atoms so that these can be used for fragments which specifically require 
	//a hydrogen atom to ensure that its matches correct (i.e. when finding COOH, it must find the hydrogen else it could accidentally pick up esters.
	//These hydrogens will usually not be present when making analogues, as it is best practice to use a copy of the working canvas when adding 
	//these otherwise pointless hydrogen atoms. Thus, some of the points in the matches fragment will not be present to use here. 
	//Fortunately, as these hydrogens will be the last thing added, not having them won't effect the bond/points arrays. 
	
	Glass.prototype.makeAnalogue = function(functionalGroup, analogueGroup) {
		let points = this.points
		let bonds = this.bonds
		let newgroup = this.analogueGroups[analogueGroup[0]][analogueGroup[1]]
		let that = this
			
		//Select all the atoms on the parent to delete, making sure to exclude the attachment point
		let hydrogenAtomFlag = false
		$.each(functionalGroup[1], function(index, value) {
			if(index != newgroup.connectionPoint) {
				let point = points[value]
				if(point) {
					that.selection.push(value)
				}
				
			}
		})
		
		//Find the point on the parent which will guide the translational placement of the new functional group. 
		//Unless... this point is a hydrogen atom which was found in the functional group, but now doesn't exist!
		
		let originalpointstotal = JSON.parse(JSON.stringify(points.length))
		let diffx = 0
		let diffy = 0
		
		let xGroupOnParent = points[functionalGroup[1][newgroup.xGroupOnParent]]
		
		if(xGroupOnParent) {
			diffx = newgroup.points[1][0] - xGroupOnParent[0]
			diffy = xGroupOnParent[1] - newgroup.points[1][1]
		}
		
		$.each(newgroup.points, function(index, value) {
			let newx = value[0] - diffx
			let newy = value[1] + diffy
			let newbondingdata = value[3].map(x => x + originalpointstotal)
			points.push([newx, newy, value[2], newbondingdata, 0])
		})
		
		$.each(newgroup.bonds, function(index, value) {
			bonds.push([value[0] + originalpointstotal, value[1] + originalpointstotal, value[2], value[3]])
		})
		
		let xGroupOnChild = points[originalpointstotal]
		let parentConnectionPoint = functionalGroup[1][newgroup.connectionPoint]
		let childConnectionPoint = xGroupOnChild[3][0]
		this.addbond(parentConnectionPoint, childConnectionPoint)
		
		//Add the "X" that was added as part of the new functional group (used to guide placement of the new group) to the selection for deletion
		this.selection.push(originalpointstotal)
		this.deleteSelection()
	
	}
	
	
	
	