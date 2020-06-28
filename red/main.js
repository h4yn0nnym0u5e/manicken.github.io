/** Modified from original Node-Red source, for audio system visualization
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
var RED = (function() {

	$('#btn-keyboard-shortcuts').click(function(){showHelp();});

	function hideDropTarget() {
		$("#dropTarget").hide();
		RED.keyboard.remove(/* ESCAPE */ 27);
	}

	$('#chart').on("dragenter",function(event) {
		if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
			$("#dropTarget").css({display:'table'});
			RED.keyboard.add(/* ESCAPE */ 27,hideDropTarget);
		}
	});

	$('#dropTarget').on("dragover",function(event) {
		if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
			event.preventDefault();
		}
	})
	.on("dragleave",function(event) {
		hideDropTarget();
	})
	.on("drop",function(event) {
		var data = event.originalEvent.dataTransfer.getData("text/plain");
		hideDropTarget();
		RED.view.importNodes(data);
		event.preventDefault();
	});
	function make_name(n) {
		var name = (n.name ? n.name : n.id);
		name = name.replace(" ", "_").replace("+", "_").replace("-", "_");
		return name
	}

	function save(force) {
		RED.storage.update();

		if (RED.nodes.hasIO()) {
			var nns = RED.nodes.createCompleteNodeSet();
			// sort by horizontal position, plus slight vertical position,
			// for well defined update order that follows signal flow
			nns.sort(function(a,b){ return (a.x + a.y/250) - (b.x + b.y/250); });
			//console.log(JSON.stringify(nns));

			var cpp = "#include <Audio.h>\n#include <Wire.h>\n"
				+ "#include <SPI.h>\n#include <SD.h>\n#include <SerialFlash.h>\n\n"
				+ "// GUItool: begin automatically generated code\n";
				+ "// JSON string:\n"
				+ "//" + JSON.stringify(nns) + "\n";

			// generate code for all audio processing nodes
			for (var i=0; i<nns.length; i++) {
				var n = nns[i];
				var node = RED.nodes.node(n.id);
				if (node && (node.outputs > 0 || node._def.inputs > 0)) {
					cpp += n.type + " ";
					for (var j=n.type.length; j<24; j++) cpp += " ";
					var name = make_name(n)
					cpp += name + "; ";
					for (var j=n.id.length; j<14; j++) cpp += " ";
					cpp += "//xy=" + n.x + "," + n.y + "\n";
				}
			}
			// generate code for all connections (aka wires or links)
			var cordcount = 1;
			for (var i=0; i<nns.length; i++) {
				var n = nns[i];
				if (n.wires) {
					for (var j=0; j<n.wires.length; j++) {
						var wires = n.wires[j];
						if (!wires) continue;
						for (var k=0; k<wires.length; k++) {
							var wire = n.wires[j][k];
							if (wire) {
								var parts = wire.split(":");
								if (parts.length == 2) {
									cpp += "AudioConnection          patchCord" + cordcount + "(";
									var src = RED.nodes.node(n.id);
									var dst = RED.nodes.node(parts[0]);
									var src_name = make_name(src);
									var dst_name = make_name(dst);
									if (j == 0 && parts[1] == 0 && src && src.outputs == 1 && dst && dst._def.inputs == 1) {
										cpp += src_name + ", " + dst_name;
									} else {
										cpp += src_name + ", " + j + ", " + dst_name + ", " + parts[1];
									}
									cpp += ");\n";
									cordcount++;
								}
							}
						}
					}
				}
			}
			// generate code for all control nodes (no inputs or outputs)
			for (var i=0; i<nns.length; i++) {
				var n = nns[i];
				var node = RED.nodes.node(n.id);
				if (node && node.outputs == 0 && node._def.inputs == 0) {
					cpp += n.type + " ";
					for (var j=n.type.length; j<24; j++) cpp += " ";
					cpp += n.id + "; ";
					for (var j=n.id.length; j<14; j++) cpp += " ";
					cpp += "//xy=" + n.x + "," + n.y + "\n";
				}
			}
			cpp += "// GUItool: end automatically generated code\n";
			//console.log(cpp);

			RED.view.state(RED.state.EXPORT);
			RED.view.getForm('dialog-form', 'export-clipboard-dialog', function (d, f) {
				$("#node-input-export").val(cpp).focus(function() {
				var textarea = $(this);
				textarea.select();
				textarea.mouseup(function() {
					textarea.unbind("mouseup");
					return false;
				});
				}).focus();
			$( "#dialog" ).dialog("option","title","Export to Arduino").dialog( "open" );
			});
			//RED.view.dirty(false);
		} else {
			$( "#node-dialog-error-deploy" ).dialog({
				title: "Error exporting data to Arduino IDE",
				modal: true,
				autoOpen: false,
				width: 410,
				height: 245,
				buttons: [{
					text: "Ok",
					click: function() {
						$( this ).dialog( "close" );
					}
				}]
			}).dialog("open");
		}
	}

	$('#btn-deploy').click(function() { save(); });

	function isClass(node)
	{
		var wns = RED.nodes.getWorkspacesAsNodeSet();

		for (var wsi = 0; wsi < wns.length; wsi++)
		{
			var ws = wns[wsi];
			if (node.type == ws.label) return true;
			//console.log(node.type  + "!="+ ws.label);
		}
		return false;
	}
	
	function getWorkspaceIdFromClassName(node)
	{
		var wns = RED.nodes.getWorkspacesAsNodeSet();

		for (var wsi = 0; wsi < wns.length; wsi++)
		{
			var ws = wns[wsi];
			if (node.type == ws.label)  return ws.id;
		}
		return "";
	}

	/**
	 * This is only used to find what is connected to a TabOutput-"pin"
	 * @param {Array} nns array of all nodes
	 * @param {node} classNode the node that is in the class
	 * @param {String} nId node id
	 * @returns {*} as {node:n, srcPortIndex: srcPortIndex}
	 */
	function getWireInputSourceNode(nns, classNode, nId)
	{
		var wsId = getWorkspaceIdFromClassName(classNode);
		//console.log("try get WireInputSourceNode:" + classNode.name + ":" + nId);
		for (var ni = 0; ni < nns.length; ni++)
		{
			var n = nns[ni];
			if (n.z != wsId) continue; // workspace check

			var retVal = RED.nodes.eachWire(n, function(srcPortIndex,dstId,dstPortIndex)
			{
				if (dstId == nId)
				{
					//console.log("we found the WireInputSourceNode! name:" + n.name + " ,id:"+ n.id + " ,portIndex:" + srcPortIndex);
					//console.log("");
					return {node:n, srcPortIndex: srcPortIndex};
				}
			});
			if (retVal) return retVal;
		}
	}
	/**
	 * the name say it all
	 * @param {Array} nns array of all nodes
	 * @param {node} classNode as nodeType
	 * @param {String} portType (TabInput or TabOutput)
	 * @param {Number} portIndex
	 * @returns {node} the TabInput or TabOutput node
	 */
	function getClassPortNode(nns, classNode, portType, portIndex)
	{
		var wsId = getWorkspaceIdFromClassName(classNode);
		var currIndex = 0;
		//console.log("getClassPortNode classNode:" + classNode.name + ", portType: " + portType + ", portIndex:" + portIndex);
		for (var i = 0; i < nns.length; i++)
		{
			var n = nns[i];
			if (n.z != wsId) continue;
			
			if (n.type != portType) continue;

			//console.log("getClassPortNode current:" + n.name); // so that we can see the order

			if (currIndex == portIndex) // we found the port
			{
				//console.log("getClassPortNode found port:" + n.name);
				return n;
			}
			currIndex++;
		}
		console.log("ERROR! could not find the class, portType:" + portType + " with portIndex:" + portIndex);
	}
	
	function classOutputPortToCpp(nns, ac, classNode)
	{
		var outputNode = getClassPortNode(nns, classNode, "TabOutput", ac.srcPort);
		if (!outputNode)
		{
			 console.log("could not getClassPortNode:" + classNode.name + ", ac.srcPort:" + ac.srcPort);
			 return false;
		} // abort

		// if the portNode is found, next we get what is connected to that port inside the class
		var newSrc = getWireInputSourceNode(nns, classNode, outputNode.id); // this return type {node:n, srcPortIndex: srcPortIndex};

		ac.srcName += "." + make_name(newSrc.node);
		ac.srcPort = newSrc.srcPortIndex;

		if (isClass(newSrc.node))
		{
			//console.log("isClass(" + newSrc.node.name + ")");

			// call this function recursive until non class is found
			if (!classOutputPortToCpp(nns, ac, newSrc.node))
				return false; // failsafe
		}
		return true;
	}

	function classInputPortToCpp(nns, currRootName, ac, classNode)
	{
		var inputNode = getClassPortNode(nns, classNode, "TabInput", ac.dstPort);
		if (!inputNode) return false; // abort

		// here we need to go througt all wires of that virtual port
		var retVal = RED.nodes.eachWire(inputNode, function(srcPortIndex,dstId,dstPortIndex)
		{
			var dst = RED.nodes.node(dstId);
			//console.log("found dest:" + dst.name);
			ac.dstPort = dstPortIndex;
			ac.dstName = currRootName + "." + make_name(dst);

			if (isClass(dst))
			{
				// call this function recursive until non class is found
				classInputPortToCpp(nns, ac.dstName, ac, dst);
			}
			else
			{
				ac.appendToCppCode(); // this don't return anything, the result is in ac.cppCode
			}					
		});
		return true;
	}
	
	$('#btn-deploy2').click(function() { save2(); });
	function save2(force)
	{
		//TODO: to use this following sort, 
		//it's more meaningfull if we first sort nodes by workspace
		//RED.nodes.nodes.sort(function(a,b){ return (a.x + a.y/250) - (b.x + b.y/250); }); 

		RED.storage.update();

		if (RED.nodes.hasIO())
		{
			var nns = RED.nodes.createCompleteNodeSet();
			// sort by horizontal position, plus slight vertical position,
			// for well defined update order that follows signal flow
			nns.sort(function(a,b){ return (a.x + a.y/250) - (b.x + b.y/250); });
			//console.log(JSON.stringify(nns)); // debug test

			var wns = RED.nodes.getWorkspacesAsNodeSet();

			var cpp = "#include <Audio.h>\n#include <Wire.h>\n"
				+ "#include <SPI.h>\n#include <SD.h>\n#include <SerialFlash.h>\n\n"
				+ "\n// GUItool: begin automatically generated code\n"
				+ "// JSON string:\n"
				+ "//" + JSON.stringify(nns) + "\n";
				
			for (var wsi=0; wsi < wns.length; wsi++)
			{
				cpp += "\nclass " + wns[wsi].label + "\n{\n"
				+ "  public:\n";

				//console.log("class>>>" + wns[wsi].label + "<<<"); // debug test
			
				//cpp += "// " + wns[i].id + ":" + wns[i].label + "\n"; // test 
			
				// generate code for all array def. nodes
				for (var i=0; i<nns.length; i++) {
					var n = nns[i];

					if (n.z != wns[wsi].id) continue; // workspace check

					var node = RED.nodes.node(n.id);
					if (!node) continue;
					if (node.type != "Array") continue;
					var arrayNode = node.name.split(" ");
					if (!arrayNode) continue;
					if (arrayNode.length != 2) continue;

					cpp += "    " + arrayNode[0] + " "; // type
					for (var j=arrayNode[0].length; j<32; j++) cpp += " ";
					cpp += arrayNode[1] + ";\n"; // name
					//for (var j=arrayNode[1].length; j<26; j++) cpp += " ";

					//cpp += "//xy=" + n.x + "," + n.y + "," + n.z + "\n"; // now with JSON string at top xy not needed anymore
				}
				// generate code for all audio processing nodes
				for (var i=0; i<nns.length; i++) {
					var n = nns[i];

					if (n.z != wns[wsi].id) continue; // workspace check

					var node = RED.nodes.node(n.id);
					if (!node) continue;
					if ((node.outputs <= 0) && (node._def.inputs <= 0)) continue;
						
					if (n.type == "TabInput" || n.type == "TabOutput") continue; // now with JSON string at top place-holders not needed anymore
					//	cpp += "//  "; // comment out because this is just a placeholder for import
					//else
						cpp += "    "
						
					//console.log(">>>" + n.type +"<<<"); // debug test
					cpp += n.type + " ";
					for (var j=n.type.length; j<32; j++) cpp += " ";
					var name = make_name(n)
					cpp += name + ";\n";
					//for (var j=n.name.length; j<26; j++) cpp += " ";

					//cpp += "//xy=" + n.x + "," + n.y + "," + n.z; // now with JSON string at top xy not needed anymore

					//if (n.type == "TabInput" || n.type == "TabOutput") continue; // now with JSON string at top place-holders not needed anymore
					//	cpp += " // placeholder\n"; 
					//else
				}
				// generate code for all control nodes (no inputs or outputs)
				for (var i=0; i<nns.length; i++) {
					var n = nns[i];

					if (n.z != wns[wsi].id) continue;

					var node = RED.nodes.node(n.id);
					if (node && node.outputs == 0 && node._def.inputs == 0) {

						if (n.type == "Array") continue; // skip this, it's allready added above

						cpp += "    " + n.type + " ";
						for (var j=n.type.length; j<32; j++) cpp += " ";
						var name = make_name(n)
						cpp += name + ";\n";
						//for (var j=n.name.length; j<26; j++) cpp += " ";
						//cpp += "//xy=" + n.x + "," + n.y + "," + n.z + "\n"; // now with JSON string at top xy not needed anymore
						//cpp+= "\n";
					}
				}
				cpp+= "\n    " + wns[wsi].label + "() // constructor (this is called when class-object is created)\n    {\n";
				
				// generate code for all connections (aka wires or links)
				//var cordcount = 1;

				
				var ac = {
					base: "        AudioConnection        patchCord",
					srcName: "",
					srcPort: 0,
					dstName: "",
					dstPort: 0,
					count: 1,
					cppCode: "",
					appendToCppCode: function() {
						//if ((this.srcPort == 0) && (this.dstPort == 0))
						//	this.cppCode	+= "\n" + this.base + this.count + "(" + this.srcName + ", " + this.dstName + ");";
						//else
							this.cppCode	+= this.base + this.count + "(" + this.srcName + ", " + this.srcPort + ", " + this.dstName + ", " + this.dstPort + ");\n";
						this.count++;
					}
				};
				ac.count = 1;

				for (var i=0; i<nns.length; i++)
				{
					var n = nns[i];

					if (n.z != wns[wsi].id) continue; // workspace check
					
					RED.nodes.eachWire(n, function (pi, dstId, dstPortIndex)
					{
						var src = RED.nodes.node(n.id);
						var dst = RED.nodes.node(dstId);

						if (src.type == "TabInput" || dst.type == "TabOutput") return; // now with JSON string at top place-holders not needed anymore
							
						ac.cppCode = "";
						ac.srcName = make_name(src);
						ac.dstName = make_name(dst);
						ac.srcPort = pi;
						ac.dstPort = dstPortIndex;
						
						//cpp += "AudioConnection        patchCord" + ac.count + "(";

						if (isClass(n)) // if source is class
						{
							//console.log("root src is class:" + ac.srcName);

							if (!classOutputPortToCpp(nns, ac, n))
							{
								cpp+= "//Error generating AudioConnection for srcName:" + src.name + ", dstName:" + dst.name;
								return; // this only skip current node
							}
						}
						
						if (isClass(dst))
						{
							//console.log("dst is class:" + dst.name + " from:" + n.name);
							
							//ac.appendToCppCode(); // debug
							classInputPortToCpp(nns, ac.dstName , ac, dst);
						}
						else
						{
							ac.appendToCppCode(); // this don't return anything, the result is in ac.cppCode
						}
						cpp += ac.cppCode;
						
					});
				}
				cpp += "    }\n";
				cpp += "}\n";
			}
			cpp += "// GUItool: end automatically generated code\n";
			//console.log(cpp);

			RED.view.state(RED.state.EXPORT);
			RED.view.getForm('dialog-form', 'export-clipboard-dialog', function (d, f) {
				
				$("#node-input-export").val(cpp).focus(function() {
				var textarea = $(this);
				textarea.select();
				textarea.mouseup(function() {
					textarea.unbind("mouseup");
					return false;
				});
				}).focus();

				/*$("#node-input-export2").val("second text").focus(function() { // this can be used for custom mixer code in future
					var textarea = $(this);
					textarea.select();
					textarea.mouseup(function() {
						textarea.unbind("mouseup");
						return false;
					});
					}).focus();*/ 

			$( "#dialog" ).dialog("option","title","Export to Arduino").dialog( "open" );
			});
			//RED.view.dirty(false);
		} else {
			$( "#node-dialog-error-deploy" ).dialog({
				title: "Error exporting data to Arduino IDE",
				modal: true,
				autoOpen: false,
				width: 410,
				height: 245,
				buttons: [{
					text: "Ok",
					click: function() {
						$( this ).dialog( "close" );
					}
				}]
			}).dialog("open");
		}
	}
	function download(filename, text) {
		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);
	  
		element.style.display = 'none';
		document.body.appendChild(element);
	  
		element.click();
	  
		document.body.removeChild(element);
	}
	function readSingleFile(e) {
		var file = e.target.files[0];
		if (!file) {
		  return;
		}
		var reader = new FileReader();
		reader.onload = function(e) {
		  var contents = e.target.result;
		  // Display file content
		  displayContents(contents);
		};
		reader.readAsText(file);
	  }
	   
	  function displayContents(contents) {
		//var element = document.getElementById('file-content');
		RED.storage.loadFile(contents);
	  }
	   
	  document.getElementById('file-input').addEventListener('change', readSingleFile, false);

	  $('#btn-loadFromFile').click(function() { loadFromFile(); });
	  function loadFromFile()
	  {
		
	  }
	$('#btn-saveTofile').click(function() { saveAsFile(); });
	function saveAsFile()
	{
		var nns = RED.nodes.createCompleteNodeSet();
		var jsonString  = JSON.stringify(nns, null, 4);
		download("TeensyAudioDesign.json", jsonString);
	}
	

	function showExportDialog(cppCode)
	{

	}
	 

	$( "#node-dialog-confirm-deploy" ).dialog({
			title: "Confirm deploy",
			modal: true,
			autoOpen: false,
			width: 530,
			height: 230,
			buttons: [
				{
					text: "Confirm deploy",
					click: function() {
						save(true);
						$( this ).dialog( "close" );
					}
				},
				{
					text: "Cancel",
					click: function() {
						$( this ).dialog( "close" );
					}
				}
			]
	});

	// from http://css-tricks.com/snippets/javascript/get-url-variables/
	function getQueryVariable(variable) {
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		for (var i=0;i<vars.length;i++) {
			var pair = vars[i].split("=");
			if(pair[0] == variable){return pair[1];}
		}
		return(false);
	}

	function getClassNrOfInputs(nns, classUid)// Jannik add function
	{
		var count = 0;
		for (var i = 0; i  < nns.length; i++)
		{
			var n = nns[i];
			if (n.z == classUid)
			{
				if (n.type == "TabInput")
				{
					count++;
					//console.log("TabInput:" + n.name);
				}
			}
		}
		return count;
	}
	function getClassNrOfOutputs(nns, classUid)// Jannik add function
	{
		var count = 0;
		for (var i = 0; i  < nns.length; i++)
		{
			var n = nns[i];
			if (n.z == classUid)
			{
				if (n.type == "TabOutput")
				{
					count++;
					//console.log("TabOutput:" + n.name);
				}
			}
		}
		return count;
	}
	
	function refreshClassNodes()// Jannik add function
	{
	   var nns = RED.nodes.createCompleteNodeSet();
	   var wns = RED.nodes.getWorkspacesAsNodeSet(); // so that we can get class names
	   nns.sort(function(a,b){ return (a.x/250 + a.y/250) - (b.x/250 + b.y/250); });

	   for ( var wsi = 0; wsi < wns.length; wsi++)
	   {
		   var ws = wns[wsi];
		   //console.log("ws.label:" + ws.label); // debug
		   for ( var ni = 0; ni < nns.length; ni++)
		   {
			   var n = nns[ni];
			   //console.log("n.type:" + n.type); // debug
			   if (n.type == ws.label)
			   {
				   console.log("updating " + n.type);
					var node = RED.nodes.node(n.id); // debug
					node._def = RED.nodes.getType(n.type); // refresh type def
					//node._def.inputs = getClassNrOfInputs(nns, ws.id);
					node._def.outputs = getClassNrOfOutputs(nns, ws.id);
			   }
		   }
	   }
	}
	function addClassTabsToPalette()// Jannik add function
	{
		var wns = RED.nodes.getWorkspacesAsNodeSet();
		var nns = RED.nodes.createCompleteNodeSet();
		// sort by horizontal position, plus slight vertical position,
		// for well defined update order that follows signal flow
		nns.sort(function(a,b){ return (a.x/250 + a.y/250) - (b.x/250 + b.y/250); });

		for (var i=0; i < wns.length; i++)
		{
			var ws = wns[i];
			var inputCount = getClassNrOfInputs(nns, ws.id);
			var outputCount = getClassNrOfOutputs(nns, ws.id);

			if ((inputCount == 0) && (outputCount == 0)) continue; // skip adding class with no IO

			//var color = "#E6E0F8"; // standard
			var color = "#ccffcc"; // new
			//var data = $.parseJSON("{\"defaults\":{\"name\":{\"value\":\"new\"}},\"shortName\":\"" + ws.label + "\",\"inputs\":" + inputCount + ",\"outputs\":" + outputCount + ",\"category\":\"tabs-function\",\"color\":\"" + color + "\",\"icon\":\"arrow-in.png\"}");
			var data = $.parseJSON("{\"defaults\":{\"name\":{\"value\":\"new\"},\"id\":{\"value\":\"new\"}},\"shortName\":\"" + ws.label + "\",\"inputs\":" + inputCount + ",\"outputs\":" + outputCount + ",\"category\":\"tabs-function\",\"color\":\"" + color + "\",\"icon\":\"arrow-in.png\"}");

			RED.nodes.registerType(ws.label, data);
		}
	}

	function loadNodes() {
			$(".palette-scroll").show();
			$("#palette-search").show();
			RED.storage.load();
			addClassTabsToPalette();
			refreshClassNodes();
			RED.view.redraw();
			
			setTimeout(function() {
				$("#btn-deploy").removeClass("disabled").addClass("btn-danger");
				$("#btn-deploy2").removeClass("disabled").addClass("btn-danger");
				$("#btn-import").removeClass("disabled").addClass("btn-success");
			}, 1500);
			$('#btn-deploy').click(function() { save(); });
			$('#btn-deploy2').click(function() { save2(); });
			// if the query string has ?info=className, populate info tab
			var info = getQueryVariable("info");
			if (info) {
				RED.sidebar.info.setHelpContent('', info);
			}
	}

	$('#btn-node-status').click(function() {toggleStatus();});

	var statusEnabled = false;
	function toggleStatus() {
		var btnStatus = $("#btn-node-status");
		statusEnabled = btnStatus.toggleClass("active").hasClass("active");
		RED.view.status(statusEnabled);
	}
	
	function showHelp() {

		var dialog = $('#node-help');

		//$("#node-help").draggable({
		//        handle: ".modal-header"
		//});

		dialog.on('show',function() {
			RED.keyboard.disable();
		});
		dialog.on('hidden',function() {
			RED.keyboard.enable();
		});

		dialog.modal();
	}

	$(function() {
		$(".palette-spinner").show();

		// server test switched off - test purposes only
		var patt = new RegExp(/^[http|https]/);
		var server = false && patt.test(location.protocol);

		if (!server) {
			var data = $.parseJSON($("script[data-container-name|='NodeDefinitions']").html());
			var nodes = data["nodes"];
			$.each(nodes, function (key, val) {
				
				RED.nodes.registerType(val["type"], val["data"]);
			});
			RED.keyboard.add(/* ? */ 191, {shift: true}, function () {
				showHelp();
				d3.event.preventDefault();
			});
			loadNodes();
			
			

			$(".palette-spinner").hide();
		} else {
			$.ajaxSetup({beforeSend: function(xhr){
				if (xhr.overrideMimeType) {
					xhr.overrideMimeType("application/json");
				}
			}});
			$.getJSON( "resources/nodes_def.json", function( data ) {
				var nodes = data["nodes"];
				$.each(nodes, function(key, val) {
					RED.nodes.registerType(val["type"], val["data"]);
				});
				RED.keyboard.add(/* ? */ 191,{shift:true},function(){showHelp();d3.event.preventDefault();});
				loadNodes();
				$(".palette-spinner").hide();
			})
		}
		
	});

	return {
		addClassTabsToPalette:addClassTabsToPalette,
		refreshClassNodes:refreshClassNodes
	};
})();
