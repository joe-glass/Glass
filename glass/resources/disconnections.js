	
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
	
	//Define generic atom groups for the following 
	Glass.prototype.genericAtomGroups = {
		
		"P": ["C", "N", "O", "S"], //generic atoms that may appear as part of an aromatic ring
	}
	
	
	//To canonicalise a functional group, we'll use the same code for finding other functional groups
	//then program a series of changes to that functional groups. These changes will be coded such that 
	//canonicalisations for different functional groups can be easily programmed in. 
	
	//"changeBond": ["title", pointOne of bond to be changed, pointTwo of bond to be changed, what the valence of this bond should be changed to
	//"setCharge": ["title", point to be changed, charge of point]
	//"setAtomType": ["title", point to be changed, element point should be changed to]
	
	Glass.prototype.canonicalGroups = {
		//Change nitro to non-charge-separated form. 
		"nitro": { 
			"name": "nitro",
			"protectingGroupHandle": false,
			"type": "acyclic",
			"mainchain": [["O", 0], ["N", 2], ["C", 1]],
			"sidechains": {
				"side1": [1, [["N", 0], ["O", 1]]]
			},
			"exclude": {},
			"canonicalise": {
				"step1": ["changeBond", 1, 3, 2],
				"step2": ["setCharge", 1, 0],
				"step3": ["setCharge", 3, 0]
			}
		},
		//Change pyridones to hydroxy-pyridine form. 
		"2-pyridone": {
			"name": "2-pyridone",
			"protectingGroupHandle": false,
			"type": "parsat",
			"mainchain": [["N", 1], ["P", 1], ["P", 2], ["P", 1], ["P", 2], ["P", 1]],
			"sidechains": {
				"side1": [5, [["P", 0], ["P", 2]]],
				"side2": [0, [["N", 0], ["H", 1]]]
			},
			"exclude": {},
			"canonicalise": {
				"step1": ["changeBond", 0, 5, 2],
				"step2": ["changeBond", 5, 6, 1],
				"step3": ["deletePoint", 7],

			}
		},
		
		"4-pyridone": {
			"name": "4-pyridone",
			"protectingGroupHandle": false,
			"type": "parsat",
			"mainchain": [["N", 1], ["P", 1], ["P", 2], ["P", 1], ["P", 1], ["P", 2]],
			"sidechains": {
				"side1": [3, [["P", 0], ["O", 2]]],
				"side2": [0, [["N", 0], ["H", 1]]]
			},
			"exclude": {},
			"canonicalise": {
				"step1": ["changeBond", 0, 1, 2],
				"step2": ["changeBond", 1, 2, 1],
				"step3": ["changeBond", 2, 3, 2],
				"step4": ["changeBond", 3, 6, 1],
				"step5": ["deletePoint", 7],

			}
		},
		
		"sulfoxide": {
			"name": "sulfoxide", 
			"protectingGroupHandle": false,
			"type": "acyclic", 
			"mainchain": [["O", 0], ["S", 2], ["C", 1]],
			"sidechains": {
				"side1": [1, [["S", 0], ["C", 1]]]
			},
			"exclude": {
				"exclude1": [1, [["S", 0], ["P", 2]]], //Make sure it doesn't change sulfones. 
			}, 
			"canonicalise": {
				"step1": ["changeBond", 0, 1, 1],
				"step2": ["setCharge", 0, -1],
				"step3": ["setCharge", 1, 1]
			}
		},
		
		"enamine": {
			"name": "enamine", 
			"protectingGroupHandle": false,
			"type": "acyclic", 
			"mainchain": [["H", 0], ["N", 1], ["C", 1], ["C", 2]],
			"sidechains": {
			},
			"exclude": {},
			"canonicalise": {
				"step1": ["changeBond", 1, 2, 2],
				"step2": ["changeBond", 2, 3, 1],
				"step3": ["deletePoint", 0]
			}
		},
		"enol": {
			"name": "enol",
			"protectingGroupHandle": false,
			"type": "acyclic", 
			"mainchain": [["H", 0], ["O", 1], ["C", 1], ["C", 2]],
			"sidechains": {},
			"exclude": {},
			"canonicalise": {
				"step1": ["changeBond", 1, 2, 2],
				"step2": ["changeBond", 2, 3, 1],
				"step3": ["deletePoint", 0]
			},
		}, 
		
		
	}
	
	
	
	//These analogue groups are to be used for replacement of an existing group with those with analogous reactivity. 
	//They MUST be drawn in such a way as to ensure that the connection point MUST be the 2nd point. 
	Glass.prototype.analogueGroups = {
		"boronic-acid": {
			"keepOriginal": true, //Select whether the original handle (i.e. boronic acid in this case) should be kept during enumeration processes
			"Bpin": {
				"points": [[116.25,127,501,[1]],[145,144,4,[0,2,5]],[148,177,79,[1,3]],[180,184,67,[2,4,6,8]],[197,155,67,[3,5,7,9]],[175,130,79,[4,1]],[194,215,67,[3]],[231,153,67,[4]],[160,211,67,[3]],[210,125,67,[4]]],
				"bonds": [[0,1,1,0],[1,2,1,0],[2,3,1,0],[3,4,1,0],[4,5,1,0],[5,1,1,0],[3,6,1,0],[4,7,1,0],[3,8,1,0],[4,9,1,0]],
				"connectionPoint": 3, //Set index of which point from the found functionalGroup (see Glass.prototype.functionalGroups below) the analogue should connect to. 
				"xGroupOnParent": 2,//Set index of which point the connection point joins to on the found functionalGroup to guide analogueGroup placement. 
				
			},

			"MIDA-boronate": {
				"points": [[155.5,178.5,501,[1]],[180.5,158.96,4,[0,5,6]],[207.63442999133574,139.24568263811048,78,[3,8,9]],[197.27,107.34724708157101,67,[2,4]],[163.73000000000002,107.34724708157101,67,[3,5,11]],[153.36557000866426,139.24568263811045,79,[4,1]],[190.86442999133573,190.85843555653946,79,[1,7]],[224.40442999133572,190.85843555653946,67,[6,8,10]],[234.76885998267147,158.96000000000004,67,[7,2]],[235,120,67,[2]],[244,218,79,[7]],[144,80,79,[4]]],
				"bonds": [[0,1,1,0],[2,3,1,0],[3,4,1,0],[4,5,1,0],[5,1,1,0],[1,6,1,0],[6,7,1,0],[7,8,1,0],[8,2,1,0],[2,9,1,0],[7,10,2,0],[4,11,2,0]],
				"connectionPoint": 3,
				"xGroupOnParent": 2
			}	
		},
		
		"pseudo-halide": {
			"keepOriginal": false,
			"Chloride": {
				"points": [[116.25,127,501,[1]],[145,144,76,[0]]],
				"bonds": [[0, 1, 1, 0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
				
			},
			"Bromide": {
				"points": [[116.25,127,501,[1]],[145,144,66,[0]]],
				"bonds": [[0, 1, 1, 0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
				
			},
			"Iodide": {
				"points": [[116.25,127,501,[1]],[145,144,73,[0]]],
				"bonds": [[0, 1, 1, 0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
				
			},
			"Triflate": {
				"points": [[104,163,501,[1]],[133,180,79,[0,2]],[162,163,83,[1,3,4,5]],[191,180,67,[2,6,7,8]],[162,129,79,[2]],[191,146,79,[2]],[220,163,70,[3]],[191,214,70,[3]],[220,197,70,[3]]],
				"bonds": [[0,1,1,0],[1,2,1,0],[2,3,1,0],[2,4,2,0],[2,5,2,0],[3,6,1,0],[3,7,1,0],[3,8,1,0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
			}
		}, 
		"amine-NH": {
			"keepOriginal": true,
			
			"NBoc": {
				"points": [[118,185,501,[1]],[147,202,67,[0,2,3]],[176,185,79,[1,4]],[147,236,79,[1]],[205,202,67,[2,5,6,7]],[234,185,67,[4]],[205,236,67,[4]],[234,219,67,[4]]],
				"bonds": [[0,1,1,0],[1,2,1,0],[1,3,2,0],[2,4,1,0],[4,5,1,0],[4,6,1,0],[4,7,1,0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
			},
			"NBn": {
				"points": [[96,161,501,[1]],[125,178,67,[0,2]],[154,161,67,[1,3,7]],[183,177,67,[2,4]],[212,160,67,[3,5]],[211,127,67,[4,6]],[182,110,67,[5,7]],[153,127,67,[6,2]]],
				"bonds": [[0,1,1,0],[1,2,1,0],[2,3,1,0],[3,4,2,0],[4,5,1,0],[5,6,2,0],[6,7,1,0],[7,2,2,0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
			},
			"NTs": {
				"points": [[96,161,501,[1]],[125,178,83,[0,2,8,9]],[154,161,67,[1,3,7]],[183,177,67,[2,4]],[212,160,67,[3,5]],[211,127,67,[4,6,10]],[182,110,67,[5,7]],[153,127.46073426592918,67,[6,2]],[125,212,79,[1]],[96,195,79,[1]],[241,110,67,[5]]],
				"bonds": [[0,1,1,0],[1,2,1,0],[2,3,1,0],[3,4,2,0],[4,5,1,0],[5,6,2,0],[6,7,1,0],[7,2,2,0],[1,8,2,0],[1,9,2,0],[5,10,1,0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
			},
			"NCBz": {
				"points": [[96,161,501,[1]],[125,178,67,[0,2,3]],[154,161,79,[1,4]],[125,212,79,[1]],[183,178,67,[2,5]],[212,161,67,[4,6,10]],[241,177,67,[5,7]],[270,160,67,[6,8]],[269,127,67,[7,9]],[240,110,67,[8,10]],[211.77806753418633,127.46073426592918,67,[9,5]]],
				"bonds": [[0,1,1,0],[1,2,1,0],[1,3,2,0],[2,4,1,0],[4,5,1,0],[5,6,1,0],[6,7,2,0],[7,8,1,0],[8,9,2,0],[9,10,1,0],[10,5,2,0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
			},
			"NAc": {
				"points": [[96,161,501,[1]],[125,178,67,[0,2,3]],[154,161,67,[1]],[125,212,79,[1]]], 
				"bonds": [[0,1,1,0],[1,2,1,0],[1,3,2,0]],
				"connectionPoint": 1,
				"xGroupOnParent": 0
			}
		},
		"carboxylic-acid": {
			"keepOriginal": true,
		}
		
	}
	
	Glass.prototype.functionalGroups = {
		"boronic-acid": { 
			"name": "Boronic acid",
			"protectingGroupHandle": false,
			"type": "acyclic",
			"mainchain": [["H", 0], ["O", 1], ["B", 1], ["C", 1]],
			"sidechains": {
				"side1": [2, [["B", 0], ["O", 1], ["H", 1]]]
			},
			"exclude": {}
		},
		"pseudo-halide": {
			"name": "Pseudo-Halide",
			"protectingGroupHandle": false,
			"type": "acyclic",
			"mainchain": [["X", 0], ["C", 1]],
			"sidechains": {},
			"exclude": {}
		},
		
		"amine-NH": {
			"name": "free-amine",
			"protectingGroupHandle": true,
			"type": "acyclic",
			"mainchain": [["H", 0], ["N", 1]],
			"sidechains": {},
			"exclude": {
				"exclude1": [1, [["N", 0], ["C", 1], ["O", 2]]],
				"exclude2": [1, [["N", 0], ["S", 1], ["O", 2]]]
			}
		},
		
		"carboxylic-acid": {
			"name": "carboxylic acid",
			"protectingGroupHandle": true,
			"type": "acyclic",
			"mainchain": [["H", 0], ["O", 1], ["C", 1], ["O", 2]],
			"sidechains": {},
			"exclude": {}
		}
		
	}
	
	Glass.prototype.disconnections = {
		//This is covered by a buchwald SnAr to give the same fragments (with the exception of providing access to fluoride monomers
		//which is likely less available than the corresponding chloride, and only required in specific cases. 
		/* "pyridine-amine-SnAR": {
			"name": "Aromatic Displacement", //Try to keep name lengths to just two lines, to avoid formatting issues. 
			"type": "aromatic",
			"mainchain": [["N", 1.5], ["C", 1.5], ["C", 1.5], ["C", 1.5], ["C", 1.5], ["C", 1.5]],
			"sidechains": {
				"side1": [1, [["C", 0], ["N", 1]]], //Select the index of the atom to which the side chain joins the mainchain (starting with 0), and start with the atom which is part of both the mainchain and sidechain. 
			},
			"exclude": {
				"exclude1": [6, [["N", 0], ["C", 1], ["O", 2]]] //functional groups to exclude, e.g. to prevent an amide being disconnected via a reductive amination
			},
			"disconnectat": {
				"frag1": [1, "X", 1, []],
				"frag2": [6, "H", 1, []] //[point in the list of matched points for above functional group that fragA should begin with, atomtype of the new point to be added to allow disconnection, bond order to new point]
			}							 //if the functional group is more than one atom long, the extra points are contained in the array at the end
										 //data structure is [number of points from end to join to, (i.e. 0 would join a new point to the last point in the 
										 //points array, which would be the atom specified at frag2[2]; 1 would be penultimate point in the points array
										 //Then it's the atom type, then the bond order
										 //as such, expect it to look like this [6, "C", 1, [[0, "O", 2], [1, "O", 1]]] to build a carboxylic acid on
													 
		}, */
		
		"ester": {
			"name": "Ester Synthesis",
			"type": "acyclic", 
			"mainchain": [["O",0],["C",2],["O",1],["C",1]],
			"sidechains": {},
			"exclude": {}, 
			"disconnectat": {
				"frag1": [1, "O", 1, []], 
				"frag2": [2, "H", 1, []]
			}
		},
		
		"amide": {
			"name": "Amide Synthesis",
			"type": "acyclic",
			"mainchain": [["O",0],["C",2],["N",1]],
			"sidechains": {},
			"exclude": {},
			"disconnectat": {
				"frag1": [1, "O", 1, []], 
				"frag2": [2, "H", 1, []]
			}
		},
		
		"reductive-amination": {
			"name": "Reductive Amination",
			"type": "acyclic",
			"mainchain": [["C", 0], ["N", 1], ["C", 1], ["H", 1]],
			"sidechains": {},
			"exclude": {
				"exclude1": [0, [["N", 0], ["C", 1], ["O", 2]]],
				"exclude2": [0, [["N", 0], ["S", 1], ["O", 2]]]
			},
			"disconnectat": {
				"frag1": [0, "H", 1, []], 
				"frag2": [1, "O", 2, []]
			}
		},
		
		"Suzuki-Miyaura-coupling" : {
			"name": "Suzuki-Miyaura Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["C", 1], ["P", 1.5]], //Use the fact that aromatic bonds are set to 1.5 to easy find any suzuki chemistry
			"sidechains": {
			},
			"exclude": {},
			"disconnectat": {
				"frag1": [1, "X", 1, []], 
				"frag2": [2, "B", 1, [[0, "O", 1], [1, "O", 1]]]
			}
		},
		
		"Suzuki-Miyaura-alkenyl-coupling" : {
			"name": "Suzuki-Miyaura Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["C", 1], ["C", 2]], 
			"sidechains": {
			},
			"exclude": {},
			"disconnectat": {
				"frag1": [1, "X", 1, []], 
				"frag2": [2, "B", 1, [[0, "O", 1], [1, "O", 1]]]
			}
		},
		
		"Suzuki-Miyaura-alkenyl-coupling-reverse" : {
			"name": "Suzuki-Miyaura Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["C", 1], ["C", 2]], 
			"sidechains": {
			},
			"exclude": {},
			"disconnectat": {
				"frag1": [1, "B", 1, [[0, "O", 1], [1, "O", 1]]], 
				"frag2": [2, "X", 1, []]
			}
		},
		
		
		"aryl/CH2N-molander" : {
			"name": "Molander Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["C", 1], ["N", 1]],
			"sidechains": {},
			"exclude": {
				"exclude1": [2, [["C", 0], ["C", 1]]],
				"exclude2": [2, [["C", 0], ["C", 2]]],
				"exclude3": [2, [["C", 0], ["O", 1]]],
				"exclude4": [2, [["C", 0], ["O", 2]]],
				"exclude5": [2, [["C", 0], ["N", 1]]],
				"exclude6": [2, [["C", 0], ["N", 2]]],
				
			},
			"disconnectat": {
				"frag1": [1, "X", 1, []], 
				"frag2": [2, "B", 1, [[0, "F", 1], [1, "F", 1], [2, "F", 1], [3, "K", 1]]]
			}
		},
		
		"aryl-buchwald": {
			"name": "Buchwald-Hartwig Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["N", 1]],
			"sidechains": {
			},
			"exclude": {
				"exclude1": [2, [["N", 0], ["C", 1], ["O", 2]]]
			},
			"disconnectat": {
				"frag1": [1, "X", 1, []],
				"frag2": [2, "H", 1, []]
			}
		},
		
		"oxy-Chan-Lam-coupling": {
			"name": "Chan-Lam Coupling with Alcohols",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["O", 1], ["C", 1]],
			"sidechains": {},
			"exclude": {
				"exclude1": [3, [["C", 0], ["O", 2]]]
			},
			"disconnectat": {
				"frag1": [1, "B", 1, [[0, "O", 1], [1, "O", 1]]],
				"frag2": [2, "H", 1, []]
			}
		},
		
		"amino-Chan-Lam-coupling": {
			"name": "Chan-Lam Coupling with Amines",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["N", 1]],
			"sidechains": {},
			"exclude": {
				"exclude1": [2, [["N", 0], ["C", 1], ["O", 2]]]
			},
			"disconnectat": {
				"frag1": [1, "B", 1, [[0, "O", 1], [1, "O", 1]]],
				"frag2": [2, "H", 1, []]
			}
		},
		
		"aryl-C-O-cross-coupling": {
			"name": "Aromatic C-O Cross Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["O", 1], ["C", 1]],
			"sidechains": {
			},
			"exclude": {
				"exclude1": [3, [["C", 0], ["O", 2]]]
			},
			"disconnectat": {
				"frag1": [1, "X", 1, []],
				"frag2": [2, "H", 1, []]
			}
		},
		
		"aryl-mitsunobu": {
			"name": "Mitsunobu Reaction",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["O", 1], ["C", 1]],
			"sidechains": {
			},
			"exclude": {
				"exclude1": [3, [["C", 0], ["O", 2]]]
			},
			"disconnectat": {
				"frag1": [2, "H", 1, []], 
				"frag2": [3, "O", 1, []]
			}
		},
		
		"benzylic-amide-sn2": {
			"name": "Amide Sn2",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["N", 1], ["C", 1], ["O", 2]],
			"sidechains": {
				"side1": [2, [["N", 0], ["C", 1]]]
			},
			"exclude": {},
			"disconnectat": {
				"frag1": [2, "H", 1, []], 
				"frag2": [5, "X", 1, []]
			}
		}, 
		
		"negishi-sp2/sp3": {
			"name": "Negishi Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["C", 1]],
			"sidechains": {
			},
			"exclude": {
				"exclude2": [2, [["C", 0], ["O", 2]]],
				"exclude3": [2, [["C", 0], ["N", 2]]],
				"exclude4": [2, [["C", 0], ["O", 1]]],
				"exclude5": [2, [["C", 0], ["N", 1]]],
				"exclude6": [2, [["C", 0], ["N", 3]]]
			},
			"disconnectat": {
				"frag1": [1, "X", 1, []], 
				"frag2": [2, "X", 1, []]
			}
		}, 
		
		"photoredox-sp2/sp3": {
			"name": "Decarboxylative Cross-Coupling",
			"type": "acyclic",
			"mainchain": [["P", 0], ["C", 1.5], ["C", 1]],
			"sidechains": {
			},
			"exclude": {
				"exclude1": [2, [["C", 0], ["P", 1.5]]],
				"exclude2": [2, [["C", 0], ["O", 2]]],
				"exclude3": [2, [["C", 0], ["N", 2]]],
				"exclude4": [2, [["C", 0], ["N", 3]]],
				"exclude5": [2, [["C", 0], ["C", 2]]],
				
			},
			"disconnectat": {
				"frag1": [0, "X", 1, []], 
				"frag2": [2, "C", 1, [[0, "O", 2], [1, "O", 1]]]
			}
		},		
	}