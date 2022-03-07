/** Added in addition to original Node-Red source, for audio system visualization
 * this file is intended to work as an interface between Node-Red flow and Arduino
 * vim: set ts=4:
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/


RED.arduino.export = (function () {
    const warningClassUse = " // warning this is referring to a class, which is not direct supported in simple export";
	const DynAudioMixers = ["AudioMixer","AudioMixerStereo"];

    /**
   * this take a multiline text, 
   * break it up into linearray, 
   * then each line is added to a new text + the incrementText added in front of every line
   * @param {*} text 
   * @param {*} increment
   */
    function incrementTextLines(text, increment) {
        var lines = text.split("\n");
        var newText = "";
        if (typeof increment == "number")
            increment = getNrOfSpaces(increment);
        for (var i = 0; i < lines.length; i++) {
            newText += increment + lines[i] + "\n";
        }
        return newText;
    }
    function getNrOfSpaces(count) {
        var str = "";
        for (var i = 0; i < count; i++)
            str += " ";
        return str;
    }

    function getCppHeader(jsonString, includes, generateZip) {
        if (includes == undefined)
            includes = "";
        var returnStr = RED.arduino.settings.StandardIncludeHeader
            + includes + "\n"
            + "// " + RED.arduino.settings.ProjectName + ": begin automatically generated code\n";
        // don't include JSON in files when exporting as zip, 
        // the zip contains the json as separate file.
        // this makes the zip generating much faster
        if (RED.arduino.settings.WriteJSONtoExportedFile == true && generateZip == false)
            returnStr += "// the following JSON string contains the whole project, \n// it's included in all generated files.\n"
                + "// JSON string:" + jsonString + "\n\n";
        return returnStr;
    }
    function getCppFooter() {
        return "// " + RED.arduino.settings.ProjectName + ": end automatically generated code\n";
    }
    function getNewWsCppFile(name, contents) {
        //contents = contents.replace("undefined", "").replace("undefined", "");
        return { name: name, contents: contents, header: "", footer: "", overwrite_file: true, isMain: false };
    }
    /**
     * 
     * @param {*} wsCppFiles array of type "getNewWsCppFile"
     * @param {*} removeOtherFiles remove files not present in JSON POST
     */
    function getPOST_JSON(wsCppFiles, removeOtherFiles) {
        return { files: wsCppFiles, removeOtherFiles: removeOtherFiles };
    }
    
    function getNewAudioConnectionType(workspaceId, minorIncrement, majorIncrement, staticType) {
        return {
            staticType:staticType,
            workspaceId: workspaceId,
            base: function() {
				const acn = getConnectionName();
                if (this.staticType==true) return acn + "        patchCord"+this.count + "(";
                else {
                    if (this.dstRootIsArray || this.srcRootIsArray)
                        return getNrOfSpaces(majorIncrement+minorIncrement) + "patchCord[pci++] = new " + acn + "(";
                    else
                        return getNrOfSpaces(majorIncrement) + "patchCord[pci++] = new " + acn + "(";
                }
            },
            
            dstRootIsArray: false,
            srcRootIsArray: false,
            arrayLength: 0,
            srcName: "",
            srcPort: 0,
            srcIsClass:0,
            dstName: "",
            dstPort: 0,
            dstIsClass:0,
            count: 1,
            totalCount: 0,
            cppCode: "",
            ifAnyIsArray: function () {
                return (this.dstRootIsArray || this.srcRootIsArray);
            },
			makeOSCname: function (n) {
				var result = this.srcName + '_' + this.srcPort + '_' + this.dstName + '_' + this.dstPort;
				result.replace("[","${").replace("]","}").replace(".","_")
				return result;
			},
			makeOSCnameQC: function (n) {
				return '"' + this.makeOSCname(n) + '", ';
			},
			
            appendToCppCode: function () {
                //if ((this.srcPort == 0) && (this.dstPort == 0))
                //	this.cppCode	+= "\n" + this.base + this.count + "(" + this.srcName + ", " + this.dstName + ");"; // this could be used but it's generating code that looks more blurry

                if (this.dstRootIsArray && this.srcRootIsArray && this.staticType == true) {
                    for (var i = 0; i < this.arrayLength; i++) {
                        this.cppCode += this.base() + this.makeOSCnameQC(i) + this.srcName.replace('[i]', '[' + i + ']') + ", " + this.srcPort + ", " + this.dstName.replace('[i]', '[' + i + ']') + ", " + this.dstPort + ");";
                        if (this.srcIsClass || this.dstIsClass) this.cppCode += warningClassUse;
                        this.cppCode += "\n";
                        this.count++;
                    }
                }
                else if (this.dstRootIsArray) {
                    if (this.staticType==false) {
                        this.cppCode += this.base() + this.makeOSCnameQC(-1) + this.srcName + ", " + this.srcPort + ", " + this.dstName + ", " + this.dstPort + ");";
                        this.cppCode += "\n";
                    }
                    else {
                        for (var i = 0; i < this.arrayLength; i++) {
                            this.cppCode += this.base() + this.makeOSCnameQC(i) + this.srcName + ", " + this.srcPort + ", " + this.dstName.replace('[i]', '[' + i + ']') + ", " + this.dstPort + ");";
                            if (this.srcIsClass || this.dstIsClass) this.cppCode += warningClassUse;
                            this.cppCode += "\n";
                            this.count++;
                        }
                        
                    }
                    this.totalCount += this.arrayLength;
                }
                else if (this.srcRootIsArray) {
                    if (this.staticType==false) {
                        this.cppCode += this.base() + this.makeOSCnameQC(-1) + this.srcName + ", " + this.srcPort + ", " + this.dstName + ", i"+(this.dstPort>0?("+"+this.dstPort):"")+");";
                        this.cppCode += "\n";
                    }
                    else {
                        for (var i = 0; i < this.arrayLength; i++) {
                            this.cppCode += this.base() + this.makeOSCnameQC(i) + this.srcName.replace('[i]', '[' + i + ']') + ", " + this.srcPort + ", " + this.dstName + ", "+i+");";
                            if (this.srcIsClass || this.dstIsClass) this.cppCode += warningClassUse;
                            this.cppCode += "\n";
                            this.count++;
                        }
                    }
                    this.totalCount += this.arrayLength;
                }
                else {
                    this.cppCode += this.base();
					this.cppCode += this.makeOSCnameQC(-1);
					this.cppCode += this.srcName + ", " + this.srcPort + ", " + this.dstName + ", " + this.dstPort + ");";
                    if (this.staticType == true && (this.srcIsClass || this.dstIsClass)) this.cppCode += warningClassUse;
                    this.cppCode += "\n";
                    this.count++;
                    this.totalCount++;
                }

            },
            checkIfDstIsArray: function () {
                var isArray = RED.export.isNameDeclarationArray(this.dstName, this.workspaceId);
                if (!isArray) {
                    this.dstRootIsArray = false;
                    return false;
                }
                this.arrayLength = isArray.arrayLength;
                this.dstName = isArray.newName;
                this.dstRootIsArray = true;
                return true;
            },
            checkIfSrcIsArray: function () {

                var isArray = RED.export.isNameDeclarationArray(this.srcName, this.workspaceId);
                if (!isArray) {
                    this.srcRootIsArray = false;
                    return false;
                }
                this.arrayLength = isArray.arrayLength;
                this.srcName = isArray.newName;
                this.srcRootIsArray = true;
                return true;
            }
        };
    }
    /**
     * Checks if a node have any Input(s)/Output(s)
     * @param {Node} node 
     * @returns {Boolean} ((node.outputs > 0) || (node._def.inputs > 0))
     */
    function haveIO(node) {
        return ((node.outputs > 0) || (node._def.inputs > 0));
    }

    let exportWarningText = "Your design contains Audio Object(s)<br>"+
                            "<p>But the workspace(s) contains no input/output nodes!</p>"+
                            "<p>Without such a input/output function the exported code will not generate any sound!</p>" +
                            "<p>Do you still want to export?</p>"
			
			
    function showIOcheckWarning(okCB) {
        if (RED.nodes.hasAudio() && !RED.nodes.hasIO() && RED.arduino.settings.IOcheckAtExport) {
            console.log("showing stuff");
            RED.main.verifyDialog("Export warning", "!!warning!!",  exportWarningText, function(okPressed) { 
                if (okPressed)
                {
                    okCB();
                }
                
            }, "Yes", "No");
        }
        else
            okCB();
    }

    $('#btn-deploy').click(function () {
        showIOcheckWarning(export_simple);
    });
    function export_simple() {

		const useDynMixers = RED.arduino.settings.UseVariableMixers; // set to true to assume that variable-width mixers are built into the Audio library
        var minorIncrement = RED.arduino.settings.CodeIndentations;
        var majorIncrement = minorIncrement * 2;

        const t0 = performance.now();
        RED.storage.update();

        var nns = RED.nodes.createCompleteNodeSet({newVer:false});

        var tabNodes = RED.nodes.getClassIOportsSorted(undefined, nns);
        console.warn(tabNodes);
        // sort is made inside createCompleteNodeSet
        var wsCppFiles = [];
        wsCppFiles.push(getNewWsCppFile("GUI_TOOL.json", JSON.stringify(nns, null, 4))); // JSON beautifier
        var jsonString = JSON.stringify(nns); // one liner JSON

        //console.log(JSON.stringify(nns));
        var includes = ""; // Include Def nodes
        var globalVars = "";
        var defines = "";
        var codeFiles = "";
        var functions = "";
        var cppAPN = "// Audio Processing Nodes\n";
        var cppAC = "// Audio Connections (all connections (aka wires or links))\n";
        var cppCN = "// Control Nodes (all control nodes (no inputs or outputs))\n";
        var cordcount = 1;
        var activeWorkspace = RED.view.getWorkspace();

        console.log("save1(simple) workspace:" + activeWorkspace);

        if (RED.arduino.settings.UseAudioMixerTemplate != true)
            var mixervariants = [];

        var ac = getNewAudioConnectionType(activeWorkspace, minorIncrement, majorIncrement, true);
        ac.count = 1;

        for (var i = 0; i < nns.length; i++) {
            var n = nns[i];
            if (n.type == "tab" || n.type == "settings") continue;
            if (n.z != activeWorkspace) continue; // workspace filter

            //if (isSpecialNode(n.type) || (n.type == "PointerArray")) continue; // simple export don't support Array-node, it's replaced by "real" node-array, TODO: remove Array-type
            var node = RED.nodes.node(n.id); // to get access to node.outputs and node._def.inputs

            if (node == null) { console.warn("node == null:" + "type:" + n.type + ",id:" + n.id); continue; } // this should never happen (because now "tab" type checked at top)
            // first handle special nodes
            if (node.type == "IncludeDef") { if (!includes.includes("#include " + node.name)) includes += "#include " + node.name + "\n"; }
            else if (node.type == "Variables") globalVars += node.comment + "\n";
            else if (node.type == "CodeFile") codeFiles += "\n" + node.comment + "\n";
            else if (node.type == "Function") functions += "\n" + node.comment + "\n";
            else if (node.type == "AudioStreamObject") { if (!includes.includes("#include " + node.includeFile)) includes += "#include " + node.includeFile + "\n"; }
            else if (node.type == "DontRemoveCodeFiles") {
                var files = node.comment.split("\n");
                for (var fi = 0; fi < files.length; fi++) {
                    var wsFile = getNewWsCppFile(files[fi], "");
                    wsFile.overwrite_file = false;
                    wsCppFiles.push(wsFile);
                }
            }
            else if (node.type == "AudioMixer" && mixervariants != undefined) {
                var inputCount = getDynamicInputCount(node, true); // variants 0 and 4 are taken care of in Mixers.GetCode
                if (!mixervariants.includes(inputCount)) mixervariants.push(inputCount);
            }
            else if (n.type == "ConstValue") {
                defines += "#define " + n.name  + " " + n.value + "\n";
            }

            if (node._def.nonObject != undefined) continue; // _def.nonObject is defined in index.html @ NodeDefinitions only for special nodes

            if (haveIO(node)) {
                // generate code for audio processing node instance
                if (node._def.isClass != undefined)//RED.nodes.isClass(n.type))
                    cppAPN += warningClassUse + "\n";
				var typeName = getTypeName(nns, n, useDynMixers);
                cppAPN += mapTypeName(typeName);
                var name = RED.nodes.make_name(n);
                cppAPN += name + makeCtor(name,typeName,n) + "; ";
                for (var j = n.id.length; j < 14; j++) cppAPN += " ";
                cppAPN += "//xy=" + n.x + "," + n.y + "\n";

                ac.dstIsClass = false;
                ac.srcIsClass = false;
                // generate code for node connections (aka wires or links)
                RED.nodes.eachWire(n, function (pi, dstId, dstPortIndex) {

                    var src = RED.nodes.node(n.id);
                        var dst = RED.nodes.node(dstId);

                        if (src.type == "TabInput" || dst.type == "TabOutput") return; // now with JSON string at top, place-holders not needed anymore

                        if (dst.type.startsWith("Junction"))// && )
                        {
                            var dstNodes = { nodes: [] };
                            getJunctionFinalDestinations(dst, dstNodes); // this will return the actual nodes, non export node
                            for (var dni = 0; dni < dstNodes.nodes.length; dni++) {
                                if (src === dstNodes.nodes[dni].node) continue; // can't make connections back to itself

                                //console.error(src.name +":"+ pi + "->" + dstNodes.nodes[dni].node.name + ":" + dstNodes.nodes[dni].dstPortIndex);
                                dst = dstNodes.nodes[dni].node;
                                ac.cppCode = "";
                                ac.srcName = RED.nodes.make_name(src);
                                ac.dstName = RED.nodes.make_name(dst);
                                ac.srcPort = pi;
                                ac.dstPort = dstNodes.nodes[dni].dstPortIndex;

                                ac.checkIfSrcIsArray(); // we ignore the return value, there is no really use for it
                                if (node._def.isClass != undefined) {//RED.nodes.isClass(n.type)) { // if source is class
                                    ac.srcIsClass = true;
                                    //console.log("root src is class:" + ac.srcName);
                                    RED.nodes.classOutputPortToCpp(nns, tabNodes.outputs, ac, n);
                                }
                                else
                                    ac.srcIsClass = false;

                                ac.checkIfDstIsArray(); // we ignore the return value, there is no really use for it
                                if (dst._def.isClass != undefined) {//RED.nodes.isClass(dst.type)) {
                                    ac.dstIsClass = true;
                                    //console.log("dst is class:" + dst.name + " from:" + n.name);
                                    RED.nodes.classInputPortToCpp(tabNodes.inputs, ac.dstName, ac, dst);
                                } else {
                                    ac.dstIsClass = false;
                                    ac.appendToCppCode(); // this don't return anything, the result is in ac.cppCode
                                }
                                cppAC += ac.cppCode;
                            }
                        }
                        else {
                            ac.cppCode = "";
                            ac.srcName = RED.nodes.make_name(src);
                            ac.dstName = RED.nodes.make_name(dst);
                            ac.srcPort = pi;
                            ac.dstPort = dstPortIndex;

                            ac.checkIfSrcIsArray(); // we ignore the return value, there is no really use for it

                            // classes not supported in simple export yet but we have it still here until then
                            if (node._def.isClass != undefined) {//RED.nodes.isClass(n.type)) { // if source is class
                                ac.srcIsClass = true;
                                //console.log("root src is class:" + ac.srcName);
                                RED.nodes.classOutputPortToCpp(nns, tabNodes.outputs, ac, n);
                            }
                            else {
                                ac.dstIsClass = false;
                            }

                            ac.checkIfDstIsArray(); // we ignore the return value, there is no really use for it

                            // classes not supported in simple export yet but we have it still here until then
                            if (dst._def.isClass != undefined) {//RED.nodes.isClass(dst.type)) {
                                ac.dstIsClass = true;
                                //console.log("dst is class:" + dst.name + " from:" + n.name);
                                RED.nodes.classInputPortToCpp(tabNodes.inputs, ac.dstName, ac, dst);
                            } else {
                                ac.dstIsClass = false;
                                ac.appendToCppCode(); // this don't return anything, the result is in ac.cppCode
                            }
                            cppAC += ac.cppCode;
                        }
                });
            } else { // generate code for control node (no inputs or outputs)
                cppCN += n.type + " ";
                for (var j = n.type.length; j < 24; j++) cppCN += " ";
                cppCN += n.name + "; ";
                for (var j = n.name.length; j < 14; j++) cppCN += " ";
                cppCN += "//xy=" + n.x + "," + n.y + "\n";
            }
        }

        var cpp = getCppHeader(jsonString, includes, false);
        if (!useDynMixers && mixervariants != undefined && mixervariants.length > 0) {
            var mfiles = Mixers.GetCode(mixervariants); // variants 0 and 4 are taken care of in Mixers.GetCode
            cpp += mfiles.copyrightNote + "\n" + mfiles.h + "\n";
            cpp += mfiles.cpp.replace('#include "mixers.h"', '') + "\n";
        }
        //console.warn("cpparray:\n"+cppArray)
        cpp += "\n" + codeFiles + "\n" + defines + "\n" + cppAPN + "\n" + cppAC + "\n" + cppCN + "\n" + globalVars + "\n" + functions + "\n";
        cpp += getCppFooter();
        //console.log(cpp);

        wsCppFiles.push(getNewWsCppFile(RED.nodes.getWorkspace(activeWorkspace).label + ".h", cpp));

        var wsCppFilesJson = getPOST_JSON(wsCppFiles, true);

        RED.arduino.httpPostAsync(JSON.stringify(wsCppFilesJson));
        const t1 = performance.now();

        var useExportDialog = (RED.arduino.settings.useExportDialog || !RED.arduino.serverIsActive())

        if (useExportDialog)
            RED.view.dialogs.showExportDialog("Simple Export to Arduino", cpp, " Source Code:");
        //RED.view.dialogs.showExportDialog("Simple Export to Arduino", JSON.stringify(wsCppFilesJson, null, 4));	// dev. test

        const t2 = performance.now();
        console.log('arduino-export-save1 took generating: ' + (t1 - t0) + ' milliseconds.');
        console.log('arduino-export-save1 took total: ' + (t2 - t0) + ' milliseconds.');

    }

    //nns.sort(function(a,b){ return (a.x + a.y/250) - (b.x + b.y/250); });
			

    $('#btn-deploy2').click(function () {
        showIOcheckWarning(export_classBased);
    });
    $('#btn-deploy2zip').click(function () {
        showIOcheckWarning(function() {export_classBased(true);});
    });
    function export_classBased(generateZip) {
		const useDynMixers = RED.arduino.settings.UseVariableMixers; // set to true to assume that variable-width mixers are built into the Audio library
        var minorIncrement = RED.arduino.settings.CodeIndentations;
        var exportOSC = RED.arduino.settings.ExportForOSC;
        var majorIncrement = minorIncrement * 2;
		const acn = getConnectionName();
		const baseClass = getBaseClass();
        const t0 = performance.now();
		
        RED.storage.update();
        if (generateZip == undefined) generateZip = false;

		var useExportDialog = (RED.arduino.settings.useExportDialog || !RED.arduino.serverIsActive() && (generateZip == undefined))

        var nns = RED.nodes.createCompleteNodeSet({newVer:false});
    	const busses = scanBusses(nns);
		const idMap = id2index(nns);
		
	    // sort is made inside createCompleteNodeSet

        var tabNodes = RED.nodes.getClassIOportsSorted(undefined,nns);

        //console.log(JSON.stringify(nns)); // debug test

        // to make splitting the classes to different files
        // wsCpp and newWsCpp is used
        var wsCppFiles = [];
        var newWsCpp;
        var mainFileName = "";
        var codeFileIncludes = [];
        var classAdditional = [];
        // first create the json strings, 
        // because when replacing constant def with values destroys the design
        var jsonString = JSON.stringify(nns); // one liner JSON
        wsCppFiles.push(getNewWsCppFile("GUI_TOOL.json", JSON.stringify(nns, null, 4))); // JSON beautifier
        wsCppFiles.push(getNewWsCppFile("preferences.txt", RED.arduino.board.export_arduinoIDE()));
        wsCppFiles.push(getNewWsCppFile("platformio.ini", RED.arduino.board.export_platformIO()));
        // first scan for code files to include them first
        if (RED.arduino.settings.UseAudioMixerTemplate != true)
            var mixervariants = [];

        for (var i = 0; i < nns.length; i++) {
            var n = nns[i];
            if (n.type == "CodeFile") // very special case
            {
                if (n.comment.length != 0) {
                    var wsFile = getNewWsCppFile(n.name, n.comment);
                    wsFile.header = "\n// ****** Start Of Included File:" + n.name + " ****** \n";
                    wsFile.footer = "\n// ****** End Of Included file:" + n.name + " ******\n";
                    wsCppFiles.push(wsFile);
                }
            }
            else if (n.type == "DontRemoveCodeFiles") {
                var files = n.comment.split("\n");
                for (var fi = 0; fi < files.length; fi++) {
                    var wsFile = getNewWsCppFile(files[fi], "");
                    wsFile.overwrite_file = false;
                    wsCppFiles.push(wsFile);
                }
            }
            else if (n.type == "AudioMixer" && mixervariants != undefined) {
                var inputCount = getDynamicInputCount(n, true);
                if (inputCount == 4) continue; // this variant is allready in the audio lib

                if (!mixervariants.includes(inputCount)) mixervariants.push(inputCount);
            }
        }
        if (!useDynMixers && mixervariants != undefined && mixervariants.length > 0) {
            var mfiles = Mixers.GetCode(mixervariants);
            var file = getNewWsCppFile("mixers.h", mfiles.h);
            file.header = mfiles.copyrightNote;
            wsCppFiles.push(file);
            file = getNewWsCppFile("mixers.cpp", mfiles.cpp);
            file.header = mfiles.copyrightNote;
            wsCppFiles.push(file);
        }
        var keywords = [];
        for (var wsi = 0; wsi < RED.nodes.workspaces.length; wsi++) // workspaces
        {
            var ws = RED.nodes.workspaces[wsi];
            if (!ws.export) continue; // this skip export
            if (ws.isMain == true)
            {
                var fileName = "";
                if (ws.mainNameType == "main")
                    fileName = "main";
                else if (ws.mainNameType == "projectName")
                    fileName = RED.arduino.settings.ProjectName;
                else // this includes if (ws.mainNameType == "tabName")
                    fileName = ws.label;
                newWsCpp = getNewWsCppFile(fileName + ws.mainNameExt, "");
                newWsCpp.isMain = true;
                mainFileName = fileName;
            }
            else if (ws.label == "main.cpp") {
                newWsCpp = getNewWsCppFile(ws.label, "");
                newWsCpp.isMain = true;
            }
            else {
                newWsCpp = getNewWsCppFile(ws.label + ".h", "");
                keywords.push({token:ws.label, type:"KEYWORD2"});
            }
            // first go through special types
            var classComment = "";
            var classConstructorCode = "";
            var classDestructorCode = "";
            var class_eofCode = "";
            var classFunctions = "";
            var classVars = "";
            var classAdditional = [];
            var classIncludes = [];
            var arrayNodes = [];

            for (var i = 0; i < ws.nodes.length; i++) {
                var n = ws.nodes[i];

                //if (n.z != ws.id) continue; // workspace filter
                if (n.type == "ClassComment") {
                    //if (n.name == "TestMultiline")
                    //	RED.nodes.node(n.id).name = "Test\nMultiline";
                    classComment += " * " + n.name + "\n";
                }
                else if (n.type == "Function") {
                    classFunctions += n.comment + "\n"; // we use comment field for function-data
                }
                else if (n.type == "Variables") {
                    classVars += n.comment + "\n" // we use comment field for vars-data
                }
                else if (n.type == "PointerArray") // this is special thingy that was before real-node, now it's obsolete, it only generates more code
                {
                    arrayNodes.push({ type: n.objectType, name: n.name, cppCode: n.arrayItems, objectCount: n.arrayItems.split(",").length });
                }
                else if (n._def.isClass != undefined) {//RED.nodes.isClass(n.type)) {
                    var includeName = '#include "' + n.type + '.h"';
                    if (!classAdditional.includes(includeName)) classAdditional.push(includeName);
                }
                else if (n.type == "CodeFile") // very special case
                {
                    var includeName = '#include "' + n.name + '"';
                    if (includeName.toLowerCase().endsWith(".c") || includeName.toLowerCase().endsWith(".cpp")) continue;

                    if (!classIncludes.includes(includeName)) classIncludes.push(includeName);
                }
                else if (n.type == "IncludeDef") {
                    var includeName = '#include ' + n.name;
                    if (!classIncludes.includes(includeName)) classIncludes.push(includeName);
                }
                else if (n.type == "ConstValue") {
                    classVars += "const static " + n.valueType + " " + n.name + " = " + n.value + ";\n";
                }
                else if (n.type == "ConstructorCode") {
                    classConstructorCode += n.comment + "\n";
                }
                else if (n.type == "DestructorCode") {
                    classDestructorCode += n.comment + "\n";
                }
                else if (n.type == "EndOfFileCode") {
                    class_eofCode += n.comment + "\n";
                }
                else if (n.type == "AudioMixer") {
                    var includeName = '#include "mixers.h"';
                    if (!classIncludes.includes(includeName)) classIncludes.push(includeName);
                }
            }
            if (classComment.length > 0) {
                newWsCpp.contents += "\n/**\n" + classComment + " */"; // newline not needed because it allready in beginning of class definer (check down)
            }
			
			// Create start of class declaration:
            if (newWsCpp.isMain == false) {
                newWsCpp.contents += "\nclass " + ws.label + baseClass+ " " + ws.extraClassDeclarations +"\n{\npublic:\n";
            }
			
            if (classVars.trim().length > 0) {
                if (newWsCpp.isMain == false)
                    newWsCpp.contents += incrementTextLines(classVars, minorIncrement);
                else
                    newWsCpp.contents += classVars;
            }

			inits = [];
            if (newWsCpp.isMain == false) // audio processing nodes should not be in the main file
            {
                // generate code for all audio processing nodes
                for (var i = 0; i < nns.length; i++) {
                    var n = nns[i];
                    if (n.type == "tab" || n.type == "settings") continue; // constant special objects
                    if (n.z != ws.id) continue; // workspace filter
                    var node = RED.nodes.node(n.id);
                    if (node == null) { continue; }
                    if (node._def.nonObject != undefined) continue; // _def.nonObject is defined in index.html @ NodeDefinitions only for special nodes

                    //if(isSpecialNode(n.type)) continue;
                    if ((node.outputs <= 0) && (node._def.inputs <= 0)) continue;

                    var isArray = RED.export.isNameDeclarationArray(n.name, ws.id, true);
                    if (isArray) {
                        n.name = isArray.newName;
                    }
					
					var typeName = getTypeName(nns, n, useDynMixers);
					var typeNameOSC = mapTypeName(typeName).trim();
                    newWsCpp.contents += getNrOfSpaces(minorIncrement) + mapTypeName(typeName);
					typeName = typeName.trim();
                    //console.log(">>>" + n.type +"<<<"); // debug test
                    var name = RED.nodes.make_name(n); 	// variable / class member name
					var ctor = makeCtor(name,typeName,n);	// add constructor, if needed
                    if (n.comment && (n.comment.trim().length != 0))
                        newWsCpp.contents += name + "; /* " + n.comment + "*/\n";
                    else if (isArray)
                        newWsCpp.contents += "*" + name + ";\n";
                    else 
                        newWsCpp.contents += name + ";\n";
					
					inits.push({idx: i, id: n.id, name: name, ctor: ctor, type: typeName, 
								typeOSC: typeNameOSC.replace("&",""),
								isArray: isArray,
								outputs: []
								})
                }
            }
            // generate code for all control/standard class nodes (no inputs or outputs)
            for (var i = 0; i < nns.length; i++) {
                var n = nns[i];

                if (n.z != ws.id) continue;
                var node = RED.nodes.node(n.id);
                if (node == null) { continue; }
                if (node._def.nonObject != undefined) continue;// _def.nonObject is defined in index.html @ NodeDefinitions only for special nodes
                if (node._def.outputs != 0) continue;
                if (node._def.inputs != 0) continue;
                if (node.type == "AudioStreamObject") continue;

                //if(isSpecialNode(n.type)) continue; // replaced by if (node._def.nonObject != undefined) 
                if (newWsCpp.isMain == false)
                    newWsCpp.contents += getNrOfSpaces(minorIncrement);

                newWsCpp.contents += n.type + " ";
                for (var j = n.type.length; j < 32; j++) cpp += " ";
                var name = RED.nodes.make_name(n)
                newWsCpp.contents += name + ";\n";
            }

            if (newWsCpp.isMain == false) // don't generate either audio connections or constructor in main file
            {
                // generate code for all connections (aka wires or links)
                var ac = getNewAudioConnectionType(ws.id, minorIncrement, majorIncrement, false);
                ac.count = 1;
                var cppPcs = "";
                var cppArray = "";
                for (var i = 0; i < nns.length; i++) {
                    var n = nns[i];

                    if (n.z != ws.id) continue; // workspace check
                    if (n.type.startsWith("Junction")) continue;

                    var src = RED.nodes.node(n.id, n.z);
					var outPort = -1;
					ac.srcName = "";

                    RED.nodes.eachWire(n, function (pi, dstId, dstPortIndex) {
						var oldSrcName = ac.srcName;
						
                        var dst = RED.nodes.node(dstId);

                        if (src.type == "TabInput" || dst.type == "TabOutput") return; // now with JSON string at top, place-holders not needed anymore

                        if (dst.type.startsWith("Junction"))// && )
                        {
                            var dstNodes = { nodes: [] };
                            getJunctionFinalDestinations(dst, dstNodes);
                            for (var dni = 0; dni < dstNodes.nodes.length; dni++) {
                                if (src === dstNodes.nodes[dni].node) continue; // can't make connections back to itself

                                //console.error(src.name +":"+ pi + "->" + dstNodes.nodes[dni].node.name + ":" + dstNodes.nodes[dni].dstPortIndex);
                                dst = dstNodes.nodes[dni].node;
                                ac.cppCode = "";
                                ac.srcName = RED.nodes.make_name(src);
								ac.dstName = RED.nodes.make_name(dst);
                                ac.srcPort = pi;
                                ac.dstPort = dstNodes.nodes[dni].dstPortIndex;

                                ac.checkIfSrcIsArray(); // we ignore the return value, there is no really use for it
                                if (src._def.isClass != undefined) { //RED.nodes.isClass(n.type)) { // if source is class
                                    //console.log("root src is class:" + ac.srcName);
                                    RED.nodes.classOutputPortToCpp(nns, tabNodes.outputs, ac, n);
                                }

                                ac.checkIfDstIsArray(); // we ignore the return value, there is no really use for it
                                if (dst._def.isClass != undefined) { //RED.nodes.isClass(dst.type)) {
                                    //console.log("dst is class:" + dst.name + " from:" + n.name);
                                    RED.nodes.classInputPortToCpp(tabNodes.inputs, ac.dstName, ac, dst);
                                } else {
                                    ac.appendToCppCode(); // this don't return anything, the result is in ac.cppCode
                                }
								
								// try to figure out tab port number:
								if (oldSrcName != ac.srcName)
								{
									outPort++;
									oldSrcName = ac.srcName;
								}
								ac.outPort = outPort;
							
                                if (ac.ifAnyIsArray())
                                    cppArray += ac.cppCode;
                                else
                                    cppPcs += ac.cppCode;
                            }
                        }
                        else {
                            ac.cppCode = "";
                            ac.srcName = RED.nodes.make_name(src);
                            ac.dstName = RED.nodes.make_name(dst);
                            ac.srcPort = pi;
                            ac.dstPort = dstPortIndex; // default
                                
                            ac.checkIfSrcIsArray(); // we ignore the return value, there is no really use for it
                            if (src._def.isClass != undefined) { //RED.nodes.isClass(n.type)) { // if source is class
                                //console.log("root src is class:" + ac.srcName);
                                RED.nodes.classOutputPortToCpp(nns, tabNodes.outputs, ac, n);
                            }

                            ac.checkIfDstIsArray(); // we ignore the return value, there is no really use for it
                            if (dst._def.isClass != undefined) { //RED.nodes.isClass(dst.type)) {
                                //console.log("dst is class:" + dst.name + " from:" + n.name);
                                RED.nodes.classInputPortToCpp(tabNodes.inputs, ac.dstName, ac, dst);
                            } else {
                                if (dst._def.dynInputs != undefined){
                                    //console.error(dstPortIndex);
                                    ac.dstPort = RED.export.links.getDynInputDynSizePortStartIndex(dst, src, pi);
                                    //console.error(ac.dstPort);
                                }
                                ac.appendToCppCode(); // this don't return anything, the result is in ac.cppCode
                            }
							
							// try to figure out tab port number:
							if (oldSrcName != ac.srcName)
							{
								outPort++;
								oldSrcName = ac.srcName;
							}
							ac.outPort = outPort;
							
                            if (ac.ifAnyIsArray())
							{
								addPortToInits(inits,ac);
                                cppArray += ac.cppCode;
							}
                            else
                                cppPcs += ac.cppCode;
                        }
                    });
                }
                if (ac.totalCount != 0) {
                    newWsCpp.contents += getNrOfSpaces(minorIncrement) + acn + " ";
                    newWsCpp.contents += getNrOfSpaces(32 - acn.length);
                    newWsCpp.contents += "*patchCord[" + ac.totalCount + "]; // total patchCordCount:" + ac.totalCount + " including array typed ones.\n";
                }
                for (var ani = 0; ani < arrayNodes.length; ani++) {
                    var arrayNode = arrayNodes[ani];
                    newWsCpp.contents += getNrOfSpaces(minorIncrement) + arrayNode.type + " ";
                    newWsCpp.contents += getNrOfSpaces(32 - arrayNode.type.length);
                    newWsCpp.contents += "*" + arrayNode.name + ";\n";
                }

                // generate constructor code
                newWsCpp.contents += "\n" + getNrOfSpaces(minorIncrement) + ws.label; 
				newWsCpp.contents +=  "(const char* _name,OSCAudioGroup* parent) : // constructor \n";
				newWsCpp.contents +=  getNrOfSpaces(minorIncrement) + "    OSCAudioGroup(_name,parent),\n";
				// initialisers
				var firstInit = true;
				for (i=0; i < inits.length; i++)
				{
					if (!inits[i].isArray)
					{
						if (!firstInit)
						{
							newWsCpp.contents += ",\n";
						}
						else
							firstInit = false;
						newWsCpp.contents +=  getNrOfSpaces(minorIncrement);
						newWsCpp.contents +=  `    ${inits[i].name}(*new ${inits[i].typeOSC}${inits[i].ctor})`;
					}
				}
				newWsCpp.contents +=  "\n" + getNrOfSpaces(minorIncrement) + "{\n";
				
				// constructor code:
				var indent = getNrOfSpaces(majorIncrement);
				var grpStr = 'this';
                if (ac.totalCount != 0)
                    newWsCpp.contents += indent + "int pci = 0; // used only for adding new patchcords\n\n"
				
				for (i=0; i < inits.length; i++)
				{
					if (inits[i].isArray)
					{
						var maxConnName = getMaxConnName(inits[i],busses[inits[i].id]);
						newWsCpp.contents += indent + `for (uint8_t i=0;i<${inits[i].isArray.arrayLength};i++)\n`;
						newWsCpp.contents += indent + '{\n';
						newWsCpp.contents += indent + `  char buf[${maxConnName}];\n\n`;
						newWsCpp.contents += indent + `  sprintf(buf,"${inits[i].isArray.name}_%d",i);\n`;
						newWsCpp.contents += indent + `  ${inits[i].isArray.name}[i] = new ${inits[i].type}(&buf[0], ${grpStr});\n`;
						for (opn=0;opn < busses[inits[i].id].outputs.length;opn++)
						{
							output = busses[inits[i].id].outputs[opn]; // {dstID,logPort,physPort}
							for (wire of output)
							{
							//for (src of inits[i].src)
								newWsCpp.contents += "\n" + indent + `  sprintf(buf,"${inits[i].isArray.name}_%d_${inits[i].outputs[opn].src}_${inits[i].outputs[opn].srcPort}_${nns[idMap[wire[0]]].name}_%d",i,i+${wire[2]});\n`;
								newWsCpp.contents +=        indent + `  patchCord[pci++] = new ${acn}{&buf[0],*${grpStr},${inits[i].isArray.name}[i]->${inits[i].outputs[opn].src},${inits[i].outputs[opn].srcPort},${nns[idMap[wire[0]]].name},(uint8_t)(i+${wire[2]})};\n`;
							}
						}
						newWsCpp.contents += indent + '}\n';
					}
				}
                for (var ani = 0; ani < arrayNodes.length; ani++) {
                    var arrayNode = arrayNodes[ani];
                    newWsCpp.contents += indent + arrayNode.name + " = new " + arrayNode.type + "[" + arrayNode.objectCount + "]";
                    if (arrayNode.autoGenerate)
                        newWsCpp.contents += "{" + arrayNode.cppCode.substring(0, arrayNode.cppCode.length - 1) + "}"
                    else
                        newWsCpp.contents += arrayNode.cppCode;

                    newWsCpp.contents += "; // pointer array\n";
                }
                newWsCpp.contents += "\n";
				
				// non-array connections
                newWsCpp.contents += cppPcs.replace(/",/g, `", *${grpStr},`); // use RegExp to get all instances replaced
				
				// disable this for now, it's not working too well!
                if (false && ac.arrayLength != 0) {
                    newWsCpp.contents += getNrOfSpaces(majorIncrement) + "for (int i = 0; i < " + ac.arrayLength + "; i++) {\n";
                    newWsCpp.contents += cppArray;
                    newWsCpp.contents += getNrOfSpaces(majorIncrement) + "}\n";
                }
				
				// end of constructor
                newWsCpp.contents += incrementTextLines(classConstructorCode, majorIncrement);
                newWsCpp.contents += getNrOfSpaces(minorIncrement) + "}\n";
				
				// constructor at root
				newWsCpp.contents += "\n" + getNrOfSpaces(minorIncrement) + "// constructor in root:"; 
				newWsCpp.contents += "\n" + getNrOfSpaces(minorIncrement) + ws.label; 
				newWsCpp.contents +=  `(const char* _name) : ${ws.label}(_name,NULL) {}\n`;
	
                
                // generate destructor code if enabled
                if (ws.generateCppDestructor == true) {
                    newWsCpp.contents += "\n" + getNrOfSpaces(minorIncrement) + "~" + ws.label + "() { // destructor (this is called when the class-object is deleted)\n";
                    if (ac.totalCount != 0) {
                        newWsCpp.contents += getNrOfSpaces(majorIncrement) + "for (int i = 0; i < " + ac.totalCount + "; i++) {\n";
                        newWsCpp.contents += getNrOfSpaces(majorIncrement + minorIncrement) + "patchCord[i]->disconnect();\n"
                        newWsCpp.contents += getNrOfSpaces(majorIncrement + minorIncrement) + "delete patchCord[i];\n"
                        newWsCpp.contents += getNrOfSpaces(majorIncrement) + "}\n";
                    }
                    newWsCpp.contents += incrementTextLines(classDestructorCode, majorIncrement);
                    newWsCpp.contents += getNrOfSpaces(minorIncrement) + "}\n";
                }
                
            } // don't generate constructor in main file END

            if (classFunctions.trim().length > 0) {
                if (newWsCpp.isMain == false)
                    newWsCpp.contents += "\n" + incrementTextLines(classFunctions, minorIncrement);
                else
                    newWsCpp.contents += "\n" + classFunctions;
            }

            if (newWsCpp.isMain == false) {// don't include end of class marker when doing main.cpp 
                newWsCpp.contents += "};\n"; // end of class
                newWsCpp.contents += class_eofCode; // after end of class
            }


            newWsCpp.header = getCppHeader(jsonString, classAdditional.join("\n") + "\n" + classIncludes.join("\n") + "\n ", generateZip);
            newWsCpp.footer = getCppFooter();
            wsCppFiles.push(newWsCpp);

            if (useExportDialog)
                for (var cai = 0; cai < classIncludes.length; cai++) {
                    if (!codeFileIncludes.includes(classIncludes[cai]))
                        codeFileIncludes.push(classIncludes[cai]);
                }
        } // workspaces loop
        console.error("@export as class RED.arduino.serverIsActive=" + RED.arduino.serverIsActive());
        // time to generate the final result
        var cpp = "";
        if (useExportDialog)
            cpp = getCppHeader(jsonString, undefined, false);//, codeFileIncludes.join("\n"));
        for (var i = 0; i < wsCppFiles.length; i++) {
            // don't include beautified json string here
            // and only append to cpp when useExportDialog
            if (isCodeFile(wsCppFiles[i].name) && useExportDialog) {
                if (wsCppFiles[i].name == "mixers.cpp") { // special case
                    cpp += wsCppFiles[i].contents.replace('#include "mixers.h"', '') + "\n"; // don't use that here as it generates compiler error
                }
                else if (wsCppFiles[i].name == "mixers.h") // special case
                    cpp += wsCppFiles[i].header + "\n" + wsCppFiles[i].contents + "\n"; // to include the copyright note
                else
                    cpp += wsCppFiles[i].contents;
            }

            wsCppFiles[i].contents = wsCppFiles[i].header + wsCppFiles[i].contents + wsCppFiles[i].footer;
            delete wsCppFiles[i].header;
            delete wsCppFiles[i].footer;
        }
        cpp += getCppFooter();
        //console.log(cpp);

        //console.log(jsonString);
        var wsCppFilesJson = getPOST_JSON(wsCppFiles, true);
        wsCppFilesJson.keywords = keywords;
        var jsonPOSTstring = JSON.stringify(wsCppFilesJson, null, 4);
        //if (RED.arduino.isConnected())

        if (generateZip == false)
            RED.arduino.httpPostAsync(jsonPOSTstring); // allways try to POST but not when exporting to zip
        //console.warn(jsonPOSTstring);


        // only show dialog when server is active and not generating zip
        if (useExportDialog)
            RED.view.dialogs.showExportDialog("Class Export to Arduino", cpp, " Source Code:");
        //RED.view.dialogs.showExportDialog("Class Export to Arduino", JSON.stringify(wsCppFilesJson, null, 4));	// dev. test
        const t1 = performance.now();
        console.log('arduino-export-save2 took: ' + (t1 - t0) + ' milliseconds.');

        if (generateZip == true) {
            var zip = new JSZip();
            let useSubfolder = RED.arduino.settings.ZipExportUseSubFolder;
            let subFolder = mainFileName != "" ? mainFileName : RED.arduino.settings.ProjectName;
            for (var i = 0; i < wsCppFiles.length; i++) {
                var wsCppfile = wsCppFiles[i];

                if (wsCppfile.overwrite_file == false) continue; // don't include in zip as it's only a placeholder for existing files
                if (useSubfolder == false)
                    zip.file(wsCppfile.name, wsCppfile.contents);
                else
                    zip.file(subFolder + "\\" + wsCppfile.name, wsCppfile.contents);
            }
            var compression = (RED.arduino.settings.ZipExportCompress==true)?"DEFLATE":"STORE";
            zip.generateAsync({ type: "blob", compression}).then(function (blob) {
                const t2 = performance.now();
                console.log('arduino-export-toZip took: ' + (t2 - t1) + ' milliseconds.');
                //console.log("typeof:" + typeof content);
                /*var reader = new FileReader();
                reader.readAsDataURL(blob); 
                reader.onloadend = function() {
                    var base64data = reader.result;                
                    //console.log(base64data);
                    localStorage.setItem("test.zip", base64data);
                }*/
                //
                RED.main.showSelectNameDialog(RED.arduino.settings.ProjectName + ".zip", function (fileName) { saveAs(blob, fileName); });//RED.main.download(fileName, content); });
            });
        }
    }

    function generate_OSC_function_decode(className) {
        var funcs = AceAutoComplete.getFromHelp(className);
        if (funcs.length == 0) return "";
        var result = "void decode_osc_functions_" + className + "(AudioStream *as, const char *func_name, const char *func_value) {\n";
        result += "    float val = std:stod(func_value);\n";
        result += "    " + className + "* cn = static_cast<" + className + "*>(as);\n";
        
        for (var fi = 0; fi < funcs.length; fi++) {
            if (funcs[fi].name.includes(",")) // only support one parameter functions at the moment
                continue;
            var funcName = funcs[fi].name.substring(0, funcs[fi].name.indexOf("("));
            var val = "val"; //funcs[fi].name.substring(funcs[fi].name.indexOf("(") + 1, funcs[fi].name.indexOf(")"));
            
            result += "    ";
            if (fi != 0) result += "else ";

            if (funcs[fi].name.includes("()")) val = ""; // no function parameters

            result += "if (strcmp(func_name, \""+funcName+"\") == 0) cn->" + funcName + "(" + val + ");\n";
        }
        result += "}\n";
        return result;
    }

    function getCppClassName(wsLabel) {
        return wsLabel.split(':')[0].split(' ')[0];
    }

    function isCodeFile(fileName) {
        if (fileName.endsWith(".h")) return true;
        else if (fileName.endsWith(".cpp")) return true;
        else if (fileName.endsWith(".tpp")) return true;
        else if (fileName.endsWith(".hpp")) return true;
        else if (fileName.endsWith(".c")) return true;
        else if (fileName.endsWith(".t")) return true;
        return false;
    }

    function getJunctionFinalDestinations(junctionNode, dstNodes) {
        junctionNode = RED.nodes.convertNode(junctionNode);
        RED.nodes.eachWire(junctionNode, function (pi, dstId, dstPortIndex) {
            var dst = RED.nodes.node(dstId, junctionNode.z); 

            if (dst.type.startsWith("Junction"))
                getJunctionFinalDestinations(dst, dstNodes);
            else
                dstNodes.nodes.push({ node: dst, dstPortIndex: dstPortIndex });
        });
    }

    $('#btn-pushJSON').click(function () { pushJSON(); });
    function pushJSON() {
        var json = localStorage.getItem("audio_library_guitool");
        var wsCppFiles = [];
        wsCppFiles.push(getNewWsCppFile("GUI_TOOL.json", json)); // JSON beautifier
        var wsCppFilesJson = getPOST_JSON(wsCppFiles, false); // false == don't remove other files

        RED.arduino.httpPostAsync(JSON.stringify(wsCppFilesJson));
    }
    $('#btn-deploy2singleLineJson').click(function () { exportSingleLineJSON(); });
    function exportSingleLineJSON() {
        var json = localStorage.getItem("audio_library_guitool");
        RED.view.dialogs.showExportDialog("Single line JSON", json, " JSON:");
    }

    // TODO: allow multiple array source signals to be connected to the mixer
    // the mixer will then expand to meet the requirements

    function getDynamicInputCount(n, replaceConstWithValue) { // rename to getDynamicInputCount?
        // check if source is an array
        n = RED.nodes.node(n.id, n.z);
        return RED.export.links.getDynInputDynSizePortStartIndex(n, undefined);

        if (n.inputs != 1) return n.inputs;

        var src = RED.nodes.getWireInputSourceNode(RED.nodes.node(n.id), 0);
        if (src && (src.node.name)) // if not src.node.name is defined then it is not an array
        {
            var isArray = RED.export.isNameDeclarationArray(src.node.name,src.node.z,replaceConstWithValue);
            if (isArray) {
                console.log("special case "+n.type+" connected from array " + src.node.name + " " + isArray.arrayLength);
                if (isArray.arrayLength <= 0) return 1;
                if (isArray.arrayLength > 255) return 255;
                return isArray.arrayLength;
            }
        }
        
        return n.inputs;
    }

    /**
     * This is only for the moment to get special type AudioMixer<n>, AudioMixerNNN or AudioStreamObject
     * @param {*} nns nodeArray
     * @param {Node} n node
     */
     function getTypeName(nns, n, useDynMixers) {
        var cpp = "";
        var typeLength = n.type.length;
        if (!useDynMixers && n.type == "AudioMixer") {

            var tmplDef = getDynamicInputCount(n,true).toString();
            //console.warn(n.name + " " + tmplDef )

            if (RED.arduino.settings.UseAudioMixerTemplate == true)
                tmplDef = '<' + tmplDef + '>'; // include the template def.

            
            cpp += n.type + tmplDef + " ";
            typeLength += tmplDef.length;
        }
        else if (n.type == "AudioStreamObject") {
            cpp += n.subType + " ";
            typeLength = n.subType.toString().length;
        }
        else
            cpp += n.type + " ";

        for (var j = typeLength; j < 32; j++) cpp += " ";
        return cpp;
    }
	
    /**
     * Convert type name if we're wanting to export OSCAudio objects
     * @param type name
     */
     function mapTypeName(name) 
	 {
		var kys = Object.keys(NodeDefinitions.officialNodes.types);
		if (RED.arduino.settings.UseVariableMixers)
			kys = kys.concat(DynAudioMixers);
			 
		if (RED.arduino.settings.ExportForOSC && kys.includes(name.trim()))
		{	
			
			
			name = name.replace("Audio","OSCAudio");
			name = name.replace(/([^ ]) /,"$1&");
			name = name.slice(0,name.length-3); // remove 3 trailing spaces, because we added "OSC"
		}
		
		return name;
	 }
	 
    /**
     * Create base class if we're wanting to export OSCAudio objects
     */
     function getBaseClass() 
	 {
		var result = "";
		if (RED.arduino.settings.ExportForOSC)
		{
			result = " : public OSCAudioGroup";
		}
		
		return result;
	 }
	 
	  /**
     * Convert type name if we're wanting to export OSCAudio objects
     */
     function getConnectionName() 
	 {
		var name = "AudioConnection";
		if (RED.arduino.settings.ExportForOSC && name.search("Audio") >= 0)
		{
			name = name.replace("Audio","OSCAudio");
		}
		
		return name;
	 }
	 
    /**
     * Create required constructor, if any
     * @param name object name
     * @param typeName type name
     * @param n index into nodes
     */
	 function makeCtor(name,typeName,n)
	 {
		var result = "";
		var ctor = [];
		
		if (RED.arduino.settings.ExportForOSC)
			ctor.push('"' + name + '"');
		ctor.push("*this");
		if (DynAudioMixers.includes(typeName))
			ctor.push(getDynamicInputCount(n,true).toString());
		if (ctor.length > 0)
			result += "{" + ctor.join() + "}";
		
		return result;
	 }
	 
	 function scanBusses(nodeArray)
	 {
		 var result = {};
		 var dsts = {};
		 
		 for (i=0;i<nodeArray.length;i++)
		 {
			var na = nodeArray[i];
						
			if (na.isClass && /\[[0-9]+\]/.test(na.name))
			{
				var sz = /\[([0-9]+)\]/.exec(na.name);
				sz = sz[1];
				var nm = na.name.slice(0,-sz.length-2);
				var wir = Array();
				for (j=0;j<na.wires.length;j++)
					for (k=0;k<na.wires[j].length;k++)
					{
						var s = na.wires[j][k];
						if (!(j in wir))
							wir[j] = Array();
					
						wir[j][k] = s.split(":");
						if (!(wir[j][k][0] in dsts))
							dsts[wir[j][k][0]] = {};
						dsts[wir[j][k][0]][wir[j][k][1]] = na.id;
					}
				result[na.id] = {name: nm, size: parseInt(sz), outputs: wir};
			}
		 }
		 
		 for (mixID in dsts)
		 {
			 var port = 0; // how far we've got down the physical ports...
			 var lprt = 0; // ...and the logical ports
			 var portList = Object.keys(dsts[mixID]).sort();
			 for (lp of portList)
			 {
				var logPort = parseInt(lp);
				if (logPort != lprt) // some ports skipped, not bus ports
					port += logPort - lprt;
				lprt = logPort+1; // next expected
				
				var dst = result[dsts[mixID][logPort]];
				for (wi of Object.keys(dst.outputs))
					for (wir of Object.keys(dst.outputs[wi]))
						if (dst.outputs[wi][wir][0] == mixID && dst.outputs[wi][wir][1] == lp)
							dst.outputs[wi][wir][2] = port;
				//["physPort"] = port; // say where first connection really is
				port += result[dsts[mixID][logPort]].size;
			 }
			 
		 }
		 
		 return result;
	 }
	 
	 function addPortToInits(inits,ac)
	 {
		 var src = ac.srcName.split(".");
		 src[0] = src[0].replace("[i]","["+ac.arrayLength+"]");
		 
		 for (i=0;i<inits.length;i++)
			 if (inits[i].name == src[0])
			 {
				 inits[i].outputs[ac.outPort] = {src: src[1], srcPort: ac.srcPort, dst: ac.dstName, dstPort: ac.dstPort};
				 break;
			 }
	 }
	 
	 function id2index(nodeArray)
	 {
		 var result = {};
		 
		 for (i=0;i<nodeArray.length;i++)
			 result[nodeArray[i].id] = i;
		 
		 return result;
	 }
	 
	 function getMaxConnName(init,bus)
	 {
		 var name = init.isArray.name;
		 var width = init.isArray.arrayLength;
		 var maxLen = 0;
		 var maxInStart = 0;
		 
		 for (i=0;i<bus.outputs.length;i++)
			 for (j=0;j<bus.outputs[i].length;j++)
				 if (maxInStart < bus.outputs[i][j][2])
					 maxInStart = bus.outputs[i][j][2];
		 
		 for (i=0;i<init.outputs.length;i++)
		 {
			var cName = `${name}_${width}_${init.outputs[i].src}_${init.outputs[i].srcPort}_${init.outputs[i].dst}_${init.outputs[i].dstPort+maxInStart}`;
			if (cName.length > maxLen)
				maxLen = cName.length;
		 }
		 
		 return maxLen+1; // allow for zero terminator
	 }
	 
    /*$("#node-input-export2").val("second text").focus(function() { // this can be used for additional setup loop code in future
            // future is now and with direct communication to from arduino ide this is no longer needed.
            var textarea = $(this);
            textarea.select();
            textarea.mouseup(function() {
              textarea.unbind("mouseup");
              return false;
            });
            }).focus();*/

    return {
        //isSpecialNode:isSpecialNode,
        getDynamicInputCount:getDynamicInputCount,
        pushJSON: pushJSON,
        generate_OSC_function_decode:generate_OSC_function_decode,
        showIOcheckWarning:showIOcheckWarning // to be removed and replaced by warning instead
    };
})();