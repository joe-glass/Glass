# Glass
Browser based chemical drawing software

This software is a Javascript based library to add a chemical drawing tool and cheminformatic functions to the browser. It allows the drawing and editing of chemical structures and reactions, and can be easily customised by selecting one of the pre-existing colour schemes, or adding a new one. It uses the HTML5 canvas to render structures. 

Requirements for use:
  -jQuery 3.5.1 (or similar)

Functions currently include:
  -Import of (native) Glass format, MOL2000 and SDF files
  -Export to (native) Glass format, MOL2000, and canonicalised SMILES
  -The canonicalised SMILES function is designed to give a single unique SMILES string for each possible compound, regardless of how it was drawn. Point chirality and    double bond isomerism is currently supported (allenes, axial and planar chirality not currently supported). 
 -Use of any element on the periodic table
 -Use of positively and negatively charged atoms
 -Zoom in/out 
 -Disconnection of molecule to two simpler building blocks, based on known disconnections (see disconnections.js in resources folder)
 -Selection/move/copy/paste/undo/delete functions, with keyboard shortcuts for easier navigation
 -Autocentre and resize
 -Auto ring and aromaticitry detection (based on 4n+2 rule)
 -Class based architecture allows dynamic and rapid loading of thousands of structures on a page
 
An instance of Glass can be loaded with either the full sketcher and user tools, just a viewer (i.e. structure but no ability for the user to manipulate it) or no visible DOM element (for cases where just the functions provided are required). 

To get started:

  Load the following files into the head section:
    <script src="Glass/init.js"></script>
    <script src="Glass/canvasfn.js"></script>
    <script src="Glass/fileIO.js"></script>
    <script src="Glass/disconnect.js"></script>
    <script src="Glass/resources/layout.js"></script>
    <script src="Glass/resources/disconnections.js"></script>
  
  Add a suitable DOM element, e.g. 
    <div id="mysketcher"></div>
  
  Add the following script:
    let options = {
      mode: "sketcher",
      height: 500,
      width: 800,
      buttonSize: 34,
      colourScheme: "warm",
    }
    let mysketcher = new Glass("mysketcher", options)

