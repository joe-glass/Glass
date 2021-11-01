
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
	
	
	Glass.prototype.findFragments = function(fragmentstofind) {
		let points = this.points
		let bonds = this.bonds
		let atomdict = this.atomdict
		let ctx = this.ctx 
		let that = this
		let fragmentsfound = []
		let bondarr = []
		
		let originalState = {
			"points": JSON.parse(JSON.stringify(points)),
			"bonds": JSON.parse(JSON.stringify(bonds))
		}
	
		//this function is used to find all the points that are bonded to "thisindex" that have the correct type of bond (single, double, etc) to "thisindex" and are the correct type of atom (carbon, nitrogen, etc)
		function matchMyPoints(thisindex, atomtomatch, bondtomatch, chainsofar, avoidpoints) {
			let matchedPoints = []
			$.each(points[thisindex][3], function(index, value) {
				if(chainsofar.indexOf(value) < 0 && avoidpoints.indexOf(value) < 0) { //check that the point is neither part of the already found chain, nor one of the avoidpoints
					if(bondarr[thisindex][value][0] == bondtomatch) { //check that the type of bond connecting the new and original points is correct
						if(that.genericAtomGroups[atomtomatch]) {
							if(that.genericAtomGroups[atomtomatch].indexOf(atomdict[points[value][2]][0])>-1) { //if we're looking for a generic atom, match to that
								matchedPoints.push(value)
							}
						}
						else {
							if(atomdict[points[value][2]][0]==atomtomatch) { //check that the type of atom is correct if the template contains a specific atom
								matchedPoints.push(value)
								
							}
						}
					}
				}
			})
			return matchedPoints
		}
		
		function findChain(template, chainstartdex, avoidpoints) {
			let chains = []
			
			//if the starting point (chainstartdex) matches the requirements for the template (only atomtype at this point), push
			//it into the chains array.
			if(that.genericAtomGroups[template[0][0]]) { //Include the case where we may wish to try to match a generic atom type
				if(that.genericAtomGroups[template[0][0]].includes(atomdict[points[chainstartdex][2]][0])) {
					chains.push([chainstartdex])
				}
			}
			else {
				if(atomdict[points[chainstartdex][2]][0] == template[0][0]) {
					chains.push([chainstartdex])
				}
			}
			
			//for each atom in the template, look at all the current (half-finished) possible chains in the chains array that are the
			//correct length given how many atoms in the template we have already looked at.
			//Look at the last point, and see if any points are bonded to it which match the requirements for the template (handled by matchMyPoints fn). 
			//If yes, append the chain with the first match, and for any subsequent matches, add the chain up to that point, 
			//concatonated with the matched point, into the chains array. As such, we now have a new half finished possible chain. 
			
			let chainstoadd = []
			for(let i = 1; i<template.length; i++) {
				chainstoadd = []
				
				$.each(chains, function(index, value) {
					if(value.length == i) {
						
						let matchedPoints = matchMyPoints(value[value.length-1], template[i][0], template[i][1], value, avoidpoints)
						
						$.each(matchedPoints, function(bindex, bvalue) {
							if(bindex == matchedPoints.length) {
								value.push(bvalue)
							}
							else {	
								let newentry = value.concat(bvalue)
								chainstoadd.push(newentry)
							}
						})
					}
				})
				

				if(chainstoadd.length > 0) {
					$.each(chainstoadd, function(index, value) {
						
						chains.push(value)
					})
				}
			}
			
			let returnvalue = []
			$.each(chains, function(index, value) {
				if(value.length == template.length) {
					returnvalue.push(value)
				}
			})
			
			return returnvalue
		}

		$.each(bonds, function(index, value) {
			bondarr[value[0]] = bondarr[value[0]] || {}
			bondarr[value[0]][value[1]] = [value[2], value[3]]
			bondarr[value[1]] = bondarr[value[1]] || {}
			bondarr[value[1]][value[0]] = [value[2], value[3]]
		})
		
		//adds in all the hydrogen atoms, ready for finding fragments.
		$.each(points, function(index, value) {
			
			let harray = atomdict[value[2]][1]
			
			//determine the number of bonds a point has (double bonds count as 2, triple as 3 etc)
			let bondno = 0
			$.each(bondarr[index], function(bindex, bvalue) {
				bondno = bondno + bvalue[0]
			})
			//Deduct the charge from the bondno 
			//i.e. negative charge adds one, to result in one fewer hydrogen atoms added
			bondno = bondno - value[4]
			
			if(harray.length>0) {
				let hno = harray[bondno-1] 
				for(let i=0; i<hno; i++) {
					let coords = that.getNewPointCoords(index)
					that.addpoint(coords[0], coords[1], index, true)
					that.points[that.points.length-1][2]=72
				}
			}
		})
		
		
		//find all rings in the current canvas
		let rings = that.findRings()
		
		//make a copy of the points array and bonds array. We do this as the next peice of code
		//with change the bond order of all bonds in an aromatic ring to 1.5, so that we don't have 
		//to worry which Kekule structure has been drawn
		let pcopy = JSON.parse(JSON.stringify(points))
		let bcopy = JSON.parse(JSON.stringify(bonds))
		
		//find all of the rings, in readiness for using the result to begin actually matching up fragments below. 
		$.each(rings, function(index, value) {
			if(value[0] == "aromatic") {
				$.each(bcopy, function(bindex, bvalue) {
					if((value[2].indexOf(bvalue[0]) > -1) && (value[2].indexOf(bvalue[1]) > -1)) {

						bvalue[2] = 1.5
						
					}
					
				})
				
			}
			
		})
		
		bondarr = [] 
		
		$.each(bcopy, function(index, value) {
			bondarr[value[0]] = bondarr[value[0]] || {}
			bondarr[value[0]][value[1]] = [value[2], value[3]]
			bondarr[value[1]] = bondarr[value[1]] || {}
			bondarr[value[1]][value[0]] = [value[2], value[3]]
		})
		
		
		let accesselement = 0
		let pastelement = 0
		let mainchains
		let ring = []
		let bondorder
		let avoidpoints
		let fragments
		
		//iterate through all the fragments the function has been asked to find, trying to match each one as it goes. Points in the matched fragment
		//will be pushed into the "fragments" array, and given the name of the fragment. 
		$.each(fragmentstofind, function(index, value) {
			mainchains = []
			avoidpoints = []
			fragments = []
			
			//calculate the total length of the fragment now, so that we can check that a sufficient number of atoms have been found to match the fragment. 
			let totallengthoffragment = value.mainchain.length
			$.each(value.mainchain.sidechains, function(bindex, bvalue) {
				totallengthoffragment = totallengthoffragment + bvalue[1].length
			})
			
			
			//we first need to find the mainchain, before finding side chains. This may either be a ring, or an acyclic fragment. 
			//fragments containing a ring, and those without, are dealt with seperately when it comes to finding the mainchain. 
			if(value.type != "acyclic") {
				
				//iterate through all the rings in the current canvas that were found above. 
				$.each(rings, function(rindex, rvalue) {
					if(rvalue[0] == value.type && rvalue[2].length == value.mainchain.length) {
						
						//Currently, we have a list of points which make up a ring, with no idea whether those points are in the right order to
						//match to the fragment. This is important, since any side chains are listed by which point they connect to. If the ring
						//points are in the wrong order, it will look for side chains in the wrong place. 
						//Move through the ring points in a forward sense, trying to match to the required fragment as we go
						//start by assuming the first point in the ring is the first point listed in the template. If match, push this list of points
						//into "matchedrings". If not, assume the second point of the ring is the first point in the template, and so on.
						//Matched points are pushed into the "ring" array.
						//For rings with an n number of axis of symmetry, there will be 2n number of correct orders. i.e. a pyridine SnAR 
						//will work at both the 2 and 6 position. How do we solve this? By redefining the 6 position as the 2 position, just moving
						//round the ring in the opposite direction. This saves having two equivalent disconnections, one to cover 2-position cases
						//and one for 6-position cases.
						
						matchedrings = []
						ring = []
						
						for(let i = 0; i<rvalue[2].length; i++) {
							
							for(let j = 0; j<rvalue[2].length; j++) {
								accesselement = i+j
								
								//if our start point is not the beginning of the ring points, at some point we 
								//will try to access a point beyond the length of the ring array. When this happens,
								//we should loopback to the start of the array. i.e. its a ring, the end point is connected to the first!
								if((i+j)>rvalue[2].length-1) {
									accesselement = (i+j-rvalue[2].length)
								}
								pastelement = accesselement-1
								
								//get the past point, so that we can check the bond order to the currentpoint is correct
								if(pastelement < 0) {

									pastelement = rvalue[2].length-1

								}
								
								//check that the atomtype and bondtype of point is correct.
								let templateatom = value.mainchain[j][0]
								let bondorder = bondarr[rvalue[2][accesselement]][rvalue[2][pastelement]][0] 
								
								//check if the atom to find in the template is a generic atom group, and if so, check that the currently 
								//accessed atom is part of that group. If true, check the bond order is correct. If all these things are satisfied, 
								//push the index into the ring array. 
								if(that.genericAtomGroups[templateatom]) {
									if(that.genericAtomGroups[templateatom].indexOf(atomdict[pcopy[rvalue[2][accesselement]][2]][0])>-1) {
										if(value.mainchain[j][1] == bondorder) {
											ring.push(rvalue[2][accesselement])
										}
									}
								}
								
								//if the atom specified by the template is a specific element, check the atomtype and bondorder is correct, then push 
								//index into ring array. 
								else {
									if(atomdict[pcopy[rvalue[2][accesselement]][2]][0] == value.mainchain[j][0]) {
										
										//check that the bond order is correct. If so, add it to the ring array
										if(value.mainchain[j][1] == bondorder) {
											ring.push(rvalue[2][accesselement])
										}
									}
								}
							}
							
							//if the correct order was found, all the required points will be in the ring array, and will be in the correct order
							//in that array, so push that into "mainchains"							
							if (ring.length == value.mainchain.length) {
								
								mainchains.push(ring)
								
							}
							//reset the ring array, ready to try another order of points
							ring = []
						}
						
						//alternatively, the rings points might be listed in the incorrect order! As such, we need to also go through the ring 
						//points in a backwards sense as well. Comments above are applicable for the below code
						
						for(let i = 0; i< rvalue[2].length; i++) {
							
							for(let j = rvalue[2].length-1; j>-1; j--) {
								accesselement = i+j
								
								if((i+j)>rvalue[2].length-1) {
									accesselement = (i+j-rvalue[2].length)
								}
								pastelement = accesselement+1
								
								if(pastelement > rvalue[2].length-1) {

									pastelement = 0

								}
								
								//work out which part of the template array we should be checking, based on where i and j currently are. 
								templateelement = Math.abs(j-rvalue[2].length+1)
								
								
								
								//check that the atomtype and bondtype of point is correct.
								let templateatom = value.mainchain[templateelement][0]
								let bondorder = bondarr[rvalue[2][accesselement]][rvalue[2][pastelement]][0] 
								
								//check if the atom to find in the template is a generic atom group, and if so, check that the currently 
								//accessed atom is part of that group. If true, check the bond order is correct. If all these things are satisfied, 
								//push the index into the ring array. 
								
								if(that.genericAtomGroups[templateatom]) {
									if(that.genericAtomGroups[templateatom].indexOf(atomdict[pcopy[rvalue[2][accesselement]][2]][0])>-1) {
										if(value.mainchain[templateelement][1] == bondorder) {
											ring.push(rvalue[2][accesselement])
										}
									}
								}
								
								//if the atom specified by the template is a specific element, check the atomtype and bondorder is correct, then push 
								//index into ring array. 
								else {
									if(atomdict[pcopy[rvalue[2][accesselement]][2]][0] == value.mainchain[templateelement][0]) {
										
										//check that the bond order is correct. If so, add it to the ring array
										if(value.mainchain[templateelement][1] == bondorder) {
											ring.push(rvalue[2][accesselement])
										}
									}
								}
							}
							

							if (ring.length == value.mainchain.length) {
								
								mainchains.push(ring)
								
							}
							ring = []
						}
	
					}
				})
				
			}
			if(value.type=="acyclic") {
				
				//starting with each point in turn, find mainchains which match the main chain template, and add them to the "mainchains" array
				for(let i = 0; i<points.length; i++) {
					let chains = findChain(value.mainchain, i, [])
					$.each(chains, function(bindex, bvalue) {	
						mainchains.push(bvalue)
					})
				}
			}
			
			//now that we have the mainchains, we need to find any side chains that are required by the template
			
			$.each(mainchains, function(bindex, bvalue) {
				fragments.push([bvalue])
			})
			

			$.each(value.sidechains, function(bindex, bvalue) {
				
				let matchestoadd = []

				$.each(fragments, function(cindex, cvalue) {
					let matches = []
						
					let startdex = cvalue[0][bvalue[0]]
					let chains = findChain(bvalue[1], startdex, cvalue[0])
					
					$.each(chains, function(dindex, dvalue) {
						if(dindex == chains.length-1) {
							cvalue.push(dvalue)
						}
						else {
							matchestoadd.push(cvalue.concat(dvalue))
						}
					})
					
				})
				
				$.each(matchestoadd, function(cindex, cvalue) {
					fragments.push(cvalue)
				})

			})
			

			//now that we have looked for the side chains, reduce the list of fragments down to only those which have found
			//the mainchain and ALL of the sidechains.
			let fragmentstokeep = []
			$.each(fragments, function(bindex, bvalue) {

				if(bvalue.length == Object.keys(value.sidechains).length+1) { //use Object.keys(objectname).length to get the length of an object
					let fragment = []
					$.each(bvalue, function(cindex, cvalue) {
						$.each(cvalue, function(dindex, dvalue) {
							//need to get all the points found into a single array, rather than a collection of different arrays
							if((cindex != 0 && dindex != 0) || (cindex == 0)) {
								fragment.push(dvalue)
							}
						})
					})
					fragmentstokeep.push(fragment)
				}
			})
			
			//replace the fragments array with that without any incomplete fragments
			fragments = fragmentstokeep
			

			let newfragmentstokeep = []
			
			$.each(fragments, function(bindex, bvalue) {
				
				let keepfragment = "true"
				$.each(value.exclude, function(cindex, cvalue) {
	
					let startdex = bvalue[cvalue[0]]
					let chains = findChain(cvalue[1], startdex, bvalue)

					if(chains.length != 0 ) {
						keepfragment = "false"
					}
				})
				
				if(keepfragment == "true") {
					newfragmentstokeep.push(bvalue)
				}
			})

			fragments = newfragmentstokeep
				

			$.each(fragments, function(bindex, bvalue) {
				fragmentsfound.push([index, bvalue])
				
			})
		})
		this.points = originalState.points
		this.bonds = originalState.bonds
		return fragmentsfound
	}
	
						
						
	
	
	
	//Fn to disconnect a molecule that's loaded into the current canvas. Note that two instances of a Glass canvas are required to 
	//load the fragments after disconnection into. Supply an array to store the fragments into, along with a running tab of
	//IDs so that each fragment can be supplied an ID. Disconnections refers to a list of disconnections in the Glass format,
	//supplied in disconnections.js, or can be a custom array. 
	Glass.prototype.Disconnect = function(targetA, targetB, fragmentstore, idGeneration, disconnections) {
		let that = this
		let donepoints = []
		let points = []
		let bonds = []
		disconnections = disconnections || that.disconnections //accept a object containing disconnections, or fallback to the default. 
		
		
		
		//get reverse atom dictionary, so that we can convert the specified atom in the disconnection to the correct number, ready 
		//to add the new points back into the array
		let reversedict = []
		$.each(this.atomdict, function(index, value) {
			reversedict[value[0]] = index
		})
		
		//this function takes a starting pointindex (pointtocheck) and an empty array (pointsadded) and traverses the network of bonds, adding each point as it goes until there
		//are no further points that connect to one of the points already in the pointsadded array. Beware recursive function. In this manner, the molecule is split into two 
		//fragments, and all the points in each fragment are placed into a new array for processing.
		
		let buildFragFail = "";
		
		function buildFragment(pointsadded, translationdict, pointtocheck, pointtoexclude) {
			$.each(points[pointtocheck][3], function(index, value) {
				
				//if, after the disconnection bond has been broken, the two points are still connected (i.e. via the other half of the cycle), 
				//we need to set this letiable to false and cease further execution of this function. If buildFragFail is set to false, 
				//the disconnection is halted, and the program moves on to the next disconnection.
				if(value==pointtoexclude) {
					buildFragFail = "false"
					return false
				}
				//if the point has not yet been found, add it to the ever growing array and translation dictionary, and recursively call the same function to begin finding further points. 
				else if(pointsadded.indexOf(value)<0) {
					if(points[value][2]!=72) {
						pointsadded.push(value)
						translationdict[value] = pointsadded.length-1
						buildFragment(pointsadded, translationdict, value, pointtoexclude)
					}
				
				}
			})
			return pointsadded
		}
		
		
		
		
		let fragments = []
		
		
		let functionals = this.findFragments(disconnections)

		//for each matched functional group, break the molecule into two fragments, along the bond defined in the "disconnections" array

		if(functionals.length>0) {
			$.each(functionals, function(findex, fvalue) {
					
				//redefine all the key variable, without using "var" so that they are updated at the correct moment (i.e. prior to 
				//further examining the disconnection). We do this so that the alterations to the bond and point arrays that were 
				//made whilst examining the last disconnection do not affect the current examination
				let fragmentApoints = []
				let fragmentBpoints = []
				let fragmentAbonds = []
				let fragmentBbonds = []
				let pointsarray = JSON.stringify(that.points)
				points = JSON.parse(pointsarray)
				let bondsarray = JSON.stringify(that.bonds)
				bonds = JSON.parse(bondsarray)
				
				let fragmentA = []
				let fragmentB = []
				let fragmenttype = fvalue[0]
				let fragmentname = disconnections[fragmenttype].name
				
				let disconnectat = disconnections[fragmenttype].disconnectat

				let fragAremove = [] 
				let fragBremove = []
				
				let translationdict = {}
				
				let pointindexA = fvalue[1][disconnectat.frag1[0]]
				let pointindexB = fvalue[1][disconnectat.frag2[0]]

				let fragAnewPoint = []
				let fragBnewPoint = []
				let MWA = 0
				let MWB = 0

				//delete the bond connecting the two fragments, so that they become seperate entities for further processing
				points[pointindexA][3].splice(points[pointindexA][3].indexOf(pointindexB), 1)
				points[pointindexB][3].splice(points[pointindexB][3].indexOf(pointindexA), 1)
				
				let bondextoremove;
				$.each(bonds, function(bindex, bvalue) {
				
					if((bvalue[0] == pointindexA && bvalue[1] == pointindexB) || (bvalue[1] == pointindexA && bvalue[0] == pointindexB)) {
						bondextoremove = bindex
						return
					}
				})

				bonds.splice(bondextoremove, 1)
				
				//call above function to get all the points in each fragment into a convenient array
				//put the first atoms into the fragment arrays, and update the translation dict. NOTE: this is important to 
				//make sure that fragments where the only non-hydrogen atom is the pointindexA or B actually generate correctly. 
				fragmentA.push(pointindexA)
				fragmentB.push(pointindexB)
				translationdict[pointindexA] = 0
				translationdict[pointindexB] = 0
				
				//build fragment A from the points and bonds available
				buildFragFail = ""
				fragmentA = buildFragment(fragmentA, translationdict, pointindexA, pointindexB)

				//as long as building fragmentA did not fail (because the pointindexA and pointindexB were still connected), build fragment B
				if(buildFragFail != "false") {
					buildFragFail = ""
					fragmentB = buildFragment(fragmentB, translationdict, pointindexB, pointindexA)
					if(buildFragFail != "false") {
						
						
						
						//prepare a full array ready for loading into new canvases, one each for fragmentA and fragmentB, then do the same for 
						//the bond array, updated old point indexes to the new ones using the translation dictionary that was created during the 
						//buildFragment() function. This is done with the exception of hydrogen atoms. 			
						$.each(fragmentA, function(pindex, pvalue){
							if(points[pvalue][2]!=72) {
								let bonddex = []
								$.each(points[pvalue][3], function(nindex, nvalue) {
									if(points[nvalue][2]!=72) {
										bonddex.push(translationdict[nvalue])
									}
								})
								
								fragmentApoints.push([points[pvalue][0], points[pvalue][1], points[pvalue][2], bonddex, points[pvalue][4]])
							}
						})
						$.each(fragmentB, function(pindex, pvalue){
							if(points[pvalue][2]!=72) {
								let bonddex = []
								$.each(points[pvalue][3], function(nindex, nvalue) {
									if(points[nvalue][2]!=72) {
										bonddex.push(translationdict[nvalue])
									}
								})
								fragmentBpoints.push([points[pvalue][0], points[pvalue][1], points[pvalue][2], bonddex, points[pvalue][4]])
							}
							
						})
						
						
						//iterate through all of the bonds in the target, and copy them into the appropriate fragment. Ignore the ones that connect to
						//a hydogen atom
						$.each(bonds, function(bindex, bvalue) {
							if(fragmentA.indexOf(bvalue[0])>-1 && fragmentA.indexOf(bvalue[1])>-1) {
								if(points[bvalue[0]][2]!=72 && points[bvalue[1]][2]!=72) {
									fragmentAbonds.push([translationdict[bvalue[0]], translationdict[bvalue[1]], bvalue[2], bvalue[3]])
								}
							}
							
							else if(fragmentB.indexOf(bvalue[0])>-1 && fragmentB.indexOf(bvalue[1])>-1) {
								if(points[bvalue[0]][2]!=72 && points[bvalue[1]][2]!=72) {
									fragmentBbonds.push([translationdict[bvalue[0]], translationdict[bvalue[1]], bvalue[2], bvalue[3]])
								}
							}
							
						})
						
						//store all fragment IDs in the following two arrays, so that each fragment can be pushed into the fragment store with an up
						//to date copy of all the partner IDs
						let Afragments = []
						let Bfragments = []
	
						fragmentAcanvas.points = fragmentApoints
						fragmentAcanvas.bonds = fragmentAbonds
						
						//add extra point and appopriate bond, required to allow disconnection, i.e. an extra oxygen in the case 
						//of amide goes to carboxylic acid, not aldehyde
						if(disconnectat.frag1[1]!="H") {
							fragAnewPoint = fragmentAcanvas.getNewPointCoords(translationdict[pointindexA])
							fragmentAcanvas.addpoint(fragAnewPoint[0], fragAnewPoint[1], translationdict[pointindexA], true) //set ignorenearpoints to be true, to make sure point is added
							fragmentAcanvas.points[fragmentAcanvas.points.length-1][2] = parseInt(reversedict[disconnectat.frag1[1]]) //use the reversedict to convert element back to numeric code
							fragmentAcanvas.bonds[fragmentAcanvas.bonds.length-1][2] = disconnectat.frag1[2]
							
						}
						
						
						
						//This second loop function adds in all the remaining points necessary to build up the functional handle for disconnection.
						//The instructions are written such that each new point that is required is connected to the last but "n" where n can be 1, 2, 3 etc.
						//This makes it much simpler to craft the function for this. 
						$.each(disconnectat.frag1[3], function(index, value) {
							let pointindex = fragmentAcanvas.points.length-1-value[0]
							fragAnewPoint = fragmentAcanvas.getNewPointCoords(pointindex)
							fragmentAcanvas.addpoint(fragAnewPoint[0], fragAnewPoint[1], pointindex, true)
							fragmentAcanvas.points[fragmentAcanvas.points.length-1][2] = parseInt(reversedict[value[1]])
							fragmentAcanvas.bonds[fragmentAcanvas.bonds.length-1][2] = value[2]
						})
						
						MWA = fragmentAcanvas.points.length
						
						//keep a note of the points in A that were part of the original functionalgroup that was found. 
						let rxnHandleA = fvalue[1].filter(x => fragmentA.includes(x)).map(x => translationdict[x])
						
						//generate ID
						Afragments.push(idGeneration)
						//fragments are stored by their points, their bonds, their molecular weight (to aid comparison of fragments) and the ID of the parent. 
						fragmentstore.push([idGeneration, Bfragments, fragmentname, JSON.parse(JSON.stringify(fragmentAcanvas.points)), JSON.parse(JSON.stringify(fragmentAcanvas.bonds)), MWA, rxnHandleA])
						idGeneration = idGeneration+1
						
						
						
						//do the same for fragment B
							
						fragmentBcanvas.points = fragmentBpoints
						fragmentBcanvas.bonds = fragmentBbonds
						

						//add extra point and appopriate bond, required to allow disconnection, i.e. an extra oxygen in the case 
						//of amide goes to carboxylic acid, not aldehyde
						if(disconnectat.frag2[1]!="H") {
							fragBnewPoint = fragmentBcanvas.getNewPointCoords(translationdict[pointindexB])
							fragmentBcanvas.addpoint(fragBnewPoint[0], fragBnewPoint[1], translationdict[pointindexB], true)
							fragmentBcanvas.points[fragmentBcanvas.points.length-1][2] = parseInt(reversedict[disconnectat.frag2[1]]) //use the reversedict to convert element back to numeric code
							fragmentBcanvas.bonds[fragmentBcanvas.bonds.length-1][2] = disconnectat.frag2[2]
							
						}
						
						$.each(disconnectat.frag2[3], function(index, value) {
							let pointindex = fragmentBcanvas.points.length-1-value[0]
							fragBnewPoint = fragmentBcanvas.getNewPointCoords(pointindex)
							fragmentBcanvas.addpoint(fragBnewPoint[0], fragBnewPoint[1], pointindex, true)
							fragmentBcanvas.points[fragmentBcanvas.points.length-1][2] = parseInt(reversedict[value[1]])
							fragmentBcanvas.bonds[fragmentBcanvas.bonds.length-1][2] = value[2]
						})
						
						MWB= fragmentBcanvas.points.length
						
						//keep a note of the points in B that were part of the original functionalgroup that was found. 
						let rxnHandleB = fvalue[1].filter(x => fragmentB.includes(x)).map(x => translationdict[x])
						
						Bfragments.push(idGeneration)
						fragmentstore.push([idGeneration, Afragments, fragmentname, JSON.parse(JSON.stringify(fragmentBcanvas.points)), JSON.parse(JSON.stringify(fragmentBcanvas.bonds)), MWB, rxnHandleB])
						idGeneration = idGeneration + 1
						
						
						
					}
	
				}
			})	
		}
		return idGeneration
	}
	
	
	//used to compare two fragments when given the smiles for molecule A and molecule B. 
	//Note that it will only return true for an exact match, false for anything else. 
	Glass.prototype.compareFragmentsBySmiles = function(molA, molB) {
		let returnvalue = false
		let molAMW = this.getMW(molA.points, molA.bonds)
		let molBMW = this.getMW(molB.points, molB.bonds)
		if(molA.points.length == molB.points.length && molA.bonds.length == molB.bonds.length && molAMW == molBMW) {
			if(molA.forcomparison.length == 0) {
				molA.forcomparison = this.exportSmiles(molA.points, molA.bonds)
			}
			if(molB.forcomparison.length == 0) {
				molB.forcomparison = this.exportSmiles(molB.points, molB.bonds)
			}
			if(molA.forcomparison.includes(molB.forcomparison[0])) {
				returnvalue = true
				
			}
		}
		
		return returnvalue
	}
	
	
	//THIS FUNCTION IS NOW OBSOLETE, BY THEN INTRODUCTION OF USING "CANONICAL" SMILES TO COMPARE STRUCTURES
	//Used to compare two Glass objects. Only returns true if the two molecules are exact matches of each other. 
	//A substructure mode is planned, once a method for doing this is found. 
	//This function has three modes: 1) generate the required master array from a input fragment, for use at a later date. 2) compare two fragments
	//and return whether they are the same or not; 3) using two pregenerated master arrays, determine whether the parent fragments are equal. 
	//Note that fragA and fragB do not have to be Glass objects, they only need to contain the points, bonds and MW. 
	Glass.prototype.compareFragments = function(mode, fragA, fragB, masterA, masterB) {
		let Apoints = fragA.points
		let Abonds = fragA.bonds
		
		//To ensure that aromatic mesomers are not found to be different compounds, change the bondorder of all bonds in an aromatic 
		//ring to 1.5
		if(masterA.length < 1 || masterB.length < 1) {
			Apoints = JSON.parse(JSON.stringify(fragA.points))
			Abonds = JSON.parse(JSON.stringify(fragA.bonds))
			this.points = Apoints
			this.bonds = Abonds
			let Arings = this.findRings() 
			$.each(Arings, function(index, value) {
				if(value[0] == "aromatic") {
					$.each(Abonds, function(bindex, bvalue) {
						if((value[2].indexOf(bvalue[0]) > -1) && (value[2].indexOf(bvalue[1]) > -1)) {

							bvalue[2] = 1.5
							
						}
						
					})
					
				}
				
			})
		}
		
		
		//These variables are optional, and only required if the mode is set to "compareFragments". We do not need them if 
		//the fn is only asked to generate a master array. 
		let Bpoints, Bbonds, MWB, MWA
		if(mode=="compareFragments") {
			MWA = fragA.MW
			Bpoints = fragB.points
			Bbonds = fragB.bonds
			MWB = fragB.MW
			
			if(masterA.length < 1 || masterB.length < 1) {
				Bpoints = JSON.parse(JSON.stringify(fragB.points))
				Bbonds = JSON.parse(JSON.stringify(fragB.bonds))
				this.points = Bpoints
				this.bonds = Bbonds
				//Do as similar for fragment B as fragment A above 
				let Brings = this.findRings()
				$.each(Brings, function(index, value) {
					if(value[0] == "aromatic") {
						$.each(Bbonds, function(bindex, bvalue) {
							if((value[2].indexOf(bvalue[0]) > -1) && (value[2].indexOf(bvalue[1]) > -1)) {

								bvalue[2] = 1.5
								
							}
							
						})
						
					}
					
				})
			}
		}
		
		
		//Returns an array of chains, which will include the longest possible chain when starting from the given "startingpoint".
		//This fn makes no effort at the stage to determine which is in fact going to be the longest chain, as it would still 
		//need to be compared against chains generated from other "startingpoint"s. Therefore, do this later in below code. 
		function findLongestChain(points, startingpoint) {
			let donepoints = []
			donepoints.push([startingpoint])
			for(let i = 1; i<=points.length; i++) {
				$.each(donepoints, function(index, value) {		
					if(value.length == i) {
						let lastpoint = value[value.length-1]
						
						let matches = 0
						$.each(points[lastpoint][3], function(bindex, bvalue) {
							if(!value.includes(bvalue)) {
								matches++
							}
						})
						
						$.each(points[lastpoint][3], function(bindex, bvalue) {
							if(!value.includes(bvalue)) {
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
		
		
		//This function gets all the subchains that branch off from a larger chain. Note that a minichain cannot contain
		//points from the parent chain, except that from which it started. 
		
		function findShortChains(points, parentchain, bondarr) {
			let returnvalue = []
			
			$.each(parentchain, function(index, value) {
				
				//get all the possible chains, of which a subset will be the longest. This function is basically the same 
				//as the one above used to get the longest chain. 
				let donepoints = []
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
								if(!bvalue.includes(cvalue) && !parentchain.includes(cvalue)) {
									matches++
								}
							})

							$.each(points[lastpoint][3], function(cindex, cvalue) {
								if(!bvalue.includes(cvalue) && !parentchain.includes(cvalue)) {
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
				
				
				
				//For each chain, find the "chainasatoms" which we'll use for comparisons, and order it into a suitable format. 
				$.each(donepoints, function(bindex, bvalue) {
					if(bvalue.length>1) {
						let chainasatoms = []
						$.each(bvalue, function(cindex, cvalue) {
							let atomtype = points[cvalue][2].toString()
							let bondno = points[cvalue][3].length.toString()
							if(cindex == 0) {
								chainasatoms.push("0"+atomtype+bondno)
							}
							else {
								let bondordertolast = bondarr[cvalue][bvalue[cindex-1]][1].toString()
								let string = bondordertolast + atomtype + bondno
								chainasatoms.push(string)
							}
						})
						
						chainasatoms = chainasatoms.toString()
						returnvalue.push([index, bvalue, chainasatoms])
					}
				})
			})
			return returnvalue
		}
		
		
		//Code for getting a master array, ready for comparison to other molecules in the future. 
		if(mode=="getMaster") {
			let bondarrA = []
			$.each(Abonds, function(index, value) {
				bondarrA[value[0]] = bondarrA[value[0]] || {}
				bondarrA[value[0]][value[1]] = [index, value[2], value[3]]
				bondarrA[value[1]] = bondarrA[value[1]] || {}
				bondarrA[value[1]][value[0]] = [index, value[2], value[3]]
			})
			
			let longestAchain = []
			$.each(Apoints, function(index, value) {
				//we can limit ourselves to searching only those points with single or double substitution, 
				//because the nature of a triple/quadruple substituted item means that there must be an ever longer chain to be found. 
				//doubly substituted points could be part of a ring, and therefore a valid start/end point
				if(value[3].length<3) { 
					let donepointsA = findLongestChain(Apoints, index)
					Array.prototype.push.apply(longestAchain, donepointsA)
						
				}
			})
			
			//find the length of the longest chain. 
			let Alongest = 0
			$.each(longestAchain, function(index, value) {
				if(value.length>Alongest) {
					Alongest = value.length
				}
			})
			//keep only those chains which are the longest. 
			let Akeepers = []
			$.each(longestAchain, function(index, value) {
				if(value.length==Alongest) {
					Akeepers.push(value)
				}
			})
			longestAchain = Akeepers
			
			let Achains = longestAchain
			$.each(Achains, function(index, value) {
				let chain = []
				$.each(value, function(bindex, bvalue) {
					let atomtype = Apoints[bvalue][2].toString()
					let bondno = Apoints[bvalue][3].length.toString()
					if(bindex == 0) {
						chain.push("0"+atomtype+bondno)
					}
					else {
						let bondordertolast = bondarrA[bvalue][value[bindex-1]][1].toString()
						let string = bondordertolast + atomtype + bondno
						chain.push(string)
					}
				})
				
				//Use this object data format for easy comprehension of whats going on. 
				let goingin = {
					"masterchain": value,
					"masterchainasatoms": chain.toString(),
					"subchains": []
				}
				
				masterA.push(goingin)
			})
			
			//for each "Longestchain", get all the required minichains that come off that. 
			$.each(masterA, function(index, value) {
				let minichains = findShortChains(Apoints, value.masterchain, bondarrA)
				Array.prototype.push.apply(value.subchains, minichains)
			})
			
			return masterA
		}
		
		//This is called when the mode is set to "compareFragments"
		else {
			//first check that the molecular weight of the two fragments is the same and the two molecules have the same number of 
			//atoms and bonds, which results in a drastic improvement in efficiency.
		
			if(MWA == MWB && Apoints.length == Bpoints.length && Abonds.length == Bbonds.length) {

				let bondarrA = []
				let doublebondsinA = 0
				$.each(Abonds, function(index, value) {
					bondarrA[value[0]] = bondarrA[value[0]] || {}
					bondarrA[value[0]][value[1]] = [index, value[2], value[3]]
					bondarrA[value[1]] = bondarrA[value[1]] || {}
					bondarrA[value[1]][value[0]] = [index, value[2], value[3]]
					if(value[2] == 2) {
						doublebondsinA++
					}
				})
				
				let bondarrB = []
				let doublebondsinB = 0
				$.each(Bbonds, function(index, value) {
					bondarrB[value[0]] = bondarrB[value[0]] || {}
					bondarrB[value[0]][value[1]] = [index, value[2], value[3]]
					bondarrB[value[1]] = bondarrB[value[1]] || {}
					bondarrB[value[1]][value[0]] = [index, value[2], value[3]]
					if(value[2] == 2) {
						doublebondsinB++
					}
				})
				
				//If we haven't already generated master arrays for each fragment for comparison, generate them now. This 
				//code is exactly the same as above. 
				if(masterA.length < 1 || masterB.length < 1) { 
					//get the longest chain/chains of points from fragmentA. This will be reduced down to a single longest chain in due course. 
					let longestAchain = []
					$.each(Apoints, function(index, value) {
						//we can limit ourselves to searching only those points with single or double substitution, 
						//because the nature of a triple/quadruple substituted item means that there must be an ever longer chain to be found. 
						//doubly substituted points could be part of a ring, and therefore a valid start/end point
						if(value[3].length<3) { 
							let donepointsA = findLongestChain(Apoints, index)
							Array.prototype.push.apply(longestAchain, donepointsA)
								
						}
					})
					let Alongest = 0
					$.each(longestAchain, function(index, value) {
						if(value.length>Alongest) {
							Alongest = value.length
						}
					})
					let Akeepers = []
					$.each(longestAchain, function(index, value) {
						if(value.length==Alongest) {
							Akeepers.push(value)
						}
					})
					longestAchain = Akeepers
					//do the same for fragmentB
					let longestBchain = []
					$.each(Bpoints, function(index, value) {
						//we can limit ourselves to searching only those points with single or double substitution, 
						//because the nature of a triple/quadruple substituted item means that there must be an ever longer chain to be found. 
						if(value[3].length<3) { 
							let donepointsB = findLongestChain(Bpoints, index)
							Array.prototype.push.apply(longestBchain, donepointsB)
								
						}
					})
					let Blongest = 0
					$.each(longestBchain, function(index, value) {
						if(value.length>Blongest) {
							Blongest = value.length
						}
					})
					let Bkeepers = []
					$.each(longestBchain, function(index, value) {
						if(value.length==Blongest) {
							Bkeepers.push(value)
						}
					})
					longestBchain = Bkeepers
						
					if(Alongest == Blongest) {
						//To reduce computational cost of comparing one array with another, we are going to convert the chain to a single string. 
						//Since it has to be an exact match, in that exact order, this is fine. 
						//we only need to take the first longest Achain, and form a string defining the atomtype, bondorder and no of bonds to that point. 
						let Achain = longestAchain[0]
						let Achainasatoms = []
						let chain = []
						$.each(Achain, function(bindex, bvalue) {
							let atomtype = Apoints[bvalue][2].toString()
							let bondno = Apoints[bvalue][3].length.toString()
							if(bindex == 0) {
								Achainasatoms.push("0"+atomtype+bondno)
							}
							else {
								let bondordertolast = bondarrA[bvalue][Achain[bindex-1]][1].toString()
								let string = bondordertolast + atomtype + bondno
								Achainasatoms.push(string)
							}
						})
						Achainasatoms = Achainasatoms.toString()
						
						let Bchains = longestBchain
						let Bchainsasatoms = []
						$.each(Bchains, function(index, value) {
							let chain = []
							$.each(value, function(bindex, bvalue) {
								let atomtype = Bpoints[bvalue][2].toString()
								let bondno = Bpoints[bvalue][3].length.toString()
								if(bindex == 0) {
									chain.push("0"+atomtype+bondno)
								}
								else {
									let bondordertolast = bondarrB[bvalue][value[bindex-1]][1].toString()
									let string = bondordertolast + atomtype + bondno
									chain.push(string)
								}
							})
							Bchainsasatoms.push(chain.toString())
						})
						
						
						let matches = []
						$.each(Bchainsasatoms, function(index, value) {

							if(Achainasatoms == value) {
								matches.push(index)
							}
						})
						
						if(matches.length > 0) {
							masterA = {
								"masterchain": Achain,
								"masterchainasatoms": Achainasatoms,
								"subchains": []
								
							}
							
							//takes all the matching B mainchains, and assembles them into a simple to read 
							//master array. 
							$.each(matches, function(index, value) {
								let goingin = {
									"masterchain": Bchains[value],
									"masterchainasatoms": Bchainsasatoms[value],
									"subchains": []
								}
								masterB.push(goingin)
							})
							//now that longchains have been found, we need to find all the shorter chains beginning with a point in the longest chain, 
							//but not including any point in the long chain.
							let minichains = findShortChains(Apoints, masterA.masterchain, bondarrA)
							Array.prototype.push.apply(masterA.subchains, minichains)
							
							$.each(masterB, function(index, value) {
								let minichains = findShortChains(Bpoints, value.masterchain, bondarrB)
								Array.prototype.push.apply(value.subchains, minichains)
							})
						}
					}
				}
				
				//Now that we have either the necessary arrays in hand containing a "chainasatoms" notation for both fragments, 
				//either because it was recieved as a parameter or because it was generated, compare these "chainasatoms". 
				//Although a fragment may have multiple valid longestchains, and corresponding minichains, 
				//two fragments which are identical must have exact matches for at least one of the these. 
				let returnvalue = "false"
				if(doublebondsinA == doublebondsinB) {
					$.each(masterA, function(index, value) {
						$.each(masterB, function(bindex, bvalue) {
							if(value.masterchainasatoms == bvalue.masterchainasatoms) {
								let dictionary = {}
								$.each(value.masterchain, function(cindex, cvalue) {
									dictionary[cvalue] = bvalue.masterchain[cindex]
								})
									
								let tickedoffA = []
								let tickedoffB = []
								$.each(value.subchains, function(cindex, cvalue) {
									$.each(bvalue.subchains, function(dindex, dvalue) {
										if(!tickedoffA.includes(cindex) && !tickedoffB.includes(dindex) && cvalue[0] == dvalue[0] && cvalue[2] == dvalue[2]) {
											tickedoffA.push(cindex)
											tickedoffB.push(dindex)
											
											//Update the dictionary now that we have found a matching pair of subchains
											$.each(cvalue[1], function(eindex, evalue) {
												dictionary[evalue] = dvalue[1][eindex]
											})
										}
									})
								})
								if(tickedoffA.length == value.subchains.length && tickedoffB.length == bvalue.subchains.length) {
									
									returnvalue = "true"
									
									//Use the translation dictionary to make sure that all bonds have the correct bond order. This
									//is important as the algorithm so far hasn't yet checked to see if the bond that joins the end of a ring
									//the start has the correct bond order. 
									//If we find a bond thats wrong, set the returnvalue to false. 
									$.each(Abonds, function(cindex, cvalue) {
										$.each(Bbonds, function(dindex, dvalue) {
											//Use the dictionary to convert a fragA point index to the corresponding fragB point index. 
											let Apoint1 = dictionary[cvalue[0]]
											let Apoint2 = dictionary[cvalue[1]]
											let Bpoint1 = dvalue[0]
											let Bpoint2 = dvalue[0]
											
											if((Apoint1 == Bpoint1 && Apoint2 == Bpoint2) || (Apoint1 == Bpoint2 && Apoint2 == Bpoint1)) {
												if(cvalue[2] != dvalue[2]) {
													returnvalue = "false"
												}
											}
										})
									})
									
									
									return false
								}
							}
						})
						//We only need to check one masterA, as B should contains all possible permutations meaning if it was possible to find
						//a match, we would after a single run. 	
						if(index==0) {
							return false
						}
						
					})
					
					return returnvalue
				}
				else {
					return "false"
				}

			}
			//If the molecular weights, number of points, or number of bonds are different, return false. 
			else {
				return "false"
			}
		}
	}
			