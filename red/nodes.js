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
RED.nodes = (function() {

	var node_defs = {};
	var nodes = [];
	var configNodes = {};
	var links = []; // link structure {source:,sourcePort:,target:,targetPort:};
	var workspaces = [];
	var currentWorkspace = {};
    var iconSets = {};
    
	function getNode()
	{
		return {id: id , type:type, name:name, x: xpos, y:ypos, z:ws, wires:[], _def:{}};
	}
	/**
	 * 
	 * @param {getNode} node ignore ():
	 */
	function gotNode(node)
	{

	}
	function useNode()
	{
		var node = getNode();
	}
	/**
	 * this creates a workspace object
	 */
	function createWorkspaceObject(id, label, inputs, outputs, _export, isMain, mainNameType, mainNameExt, settings) // export is a reserved word
	{
        // first set all default values if inputs are undefined
        if (_export == undefined) _export = true;
        if (isMain == undefined) isMain = false;
        if (mainNameType == undefined) mainNameType = "tabName";
        if (mainNameExt == undefined) mainNameExt = ".ino";
        if (settings == undefined){ settings = RED.settings.getChangedSettings(RED.view); console.warn("Converting old global workspace settings to new individual:" + label + " " + id); }
        // return new structure
		return { type:"tab", id:id, label:label, inputs:inputs, outputs:outputs, export:_export, isMain:isMain, mainNameType:mainNameType, mainNameExt:mainNameExt, nodes:[], settings:settings};
	}
	function moveNodeToEnd(node)
	{
		nodes.push(nodes.splice(nodes.indexOf(node), 1)[0]);
	}
	$('#btn-moveWorkSpaceLeft').click(function() { moveWorkSpaceLeft(); });
	$('#btn-moveWorkSpaceRight').click(function() { moveWorkSpaceRight();  });
	function moveWorkSpaceLeft()
	{
		var index = getWorkspaceIndex(RED.view.getWorkspace());
		if (index == 0) return;

		let wrapper=document.querySelector(".red-ui-tabs");
		let children=wrapper.children;
		
		wrapper.insertBefore(children[index], children[index-1]); // children[index] is inserted before children[index-1]
		var wsTemp = workspaces[index-1];
		workspaces[index-1] = workspaces[index];
		workspaces[index] = wsTemp;
		RED.storage.update();
	}
	function moveWorkSpaceRight()
	{
		var index = getWorkspaceIndex(RED.view.getWorkspace());
		if (index == (workspaces.length-1)) return;

		let wrapper=document.querySelector(".red-ui-tabs");
		let children=wrapper.children;
		
		wrapper.insertBefore(children[index+1], children[index]); // children[index+1] is inserted before children[index]

		var wsTemp = workspaces[index+1];
		workspaces[index+1] = workspaces[index];
		workspaces[index] = wsTemp;
		RED.storage.update();
    }
    
	function arraySpliceExample()
	{
		var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
		console.error("original:" + arr);
		var removed = arr.splice(2,2,4,3);
		console.error("removed:" + removed);
		console.error("modified:" + arr);
	}		
	function registerType(nt,def) {
        node_defs[nt] = def;
        def.defaults.color = {value:def.color};
       // console.warn(def);

        try{
		// TODO: too tightly coupled into palette UI
		if (def.dontShowInPalette == undefined)
            RED.palette.add(nt,node_defs[nt]);
        }
        catch (ex) { RED.notify("<strong>Warning</strong>: Fail to add this type to the palette<br>" + nt,"warning");} // failsafe
	}

	function getID() {
		var str = (1+Math.random()*4294967295).toString(16);
		console.log("getID = " + str);
		return str;
	}

	function checkID(id) {
		var i;
		for (i=0;i<nodes.length;i++) {
			//console.log("checkID, nodes[i].id = " + nodes[i].id);
			if (nodes[i].id == id) return true;
		}
/*
		for (i in workspaces) {
			if (workspaces.hasOwnProperty(i)) { }
		}
		for (i in configNodes) {
			if (configNodes.hasOwnProperty(i)) { }
		}
*/
		return false;
	}
	function checkName(name, wsId) { // jannik add
		var i;
		for (i=0;i<nodes.length;i++) {
			//console.log("checkID, nodes[i].id = " + nodes[i].id);
			if (wsId && (wsId != nodes[i].z)) continue; // skip nodes that is not in current workspace
			if (nodes[i].name == name) return true;
		}
/*
		for (i in workspaces) {
			if (workspaces.hasOwnProperty(i)) { }
		}
		for (i in configNodes) {
			if (configNodes.hasOwnProperty(i)) { }
		}
*/
		return false;
	}

	function createUniqueCppName(n, wsId) {
		//console.log("getUniqueCppName, n.type=" + n.type + ", n.name=" + n.name + ", n._def.shortName=" + n._def.shortName);
		var basename = n.name; //(n._def.shortName) ? n._def.shortName : n.type.replace(/^Analog/, "");
		if (!checkName(basename, wsId)) return basename; // no need to change
		
		//console.log("getUniqueCppName, using basename=" + basename);
		var count = 1;
		var sep = /[0-9]$/.test(basename) ? "_" : ""; // expression checks if basename ends with a number, sep = seperator
		var name;
		while (1) {
			name = basename + sep + count;
			if (!checkName(name, wsId)) break;
			count++;
		}
		//console.log("getUniqueCppName, unique name=" + name);
		return name;
	}
	
	function createUniqueCppId(n, workspaceName) {
		//console.log("getUniqueCppId, n.type=" + n.type + ", n.name=" + n.name + ", n._def.shortName=" + n._def.shortName);
		var basename = (n._def.shortName) ? n._def.shortName : n.type.replace(/^Analog/, "");
		
		if (workspaceName)
			basename = workspaceName + "_" + basename; // Jannik added

		//console.log("getUniqueCppId, using basename=" + basename);
		var count = 1;
		var sep = /[0-9]$/.test(basename) ? "_" : "";
		var name;
		while (1) {
			name = basename + sep + count;
			if (!checkID(name)) break;
			count++;
		}
		//console.log("getUniqueCppId, unique id=" + name);
		return name;
	}

	function getUniqueName(n) {
		var newName = n.name;
		if (typeof newName === "string") {
			var parts = newName.match(/(\d*)$/);
			var count = 0;
			var base = newName;
			if (parts) {
				count = isNaN(parseInt(parts[1])) ? 0 : parseInt(parts[1]);
				base = newName.replace(count, "");
			}
			while (RED.nodes.namedNode(newName) !== null) {
				count += 1;
				newName = base + count;
			}
		}
		return newName;
	}

	function getType(type) {
		return node_defs[type];
	}
	function selectNode(name) {
        var info = "";
        if (name.trim() != "") info = '?info=' + name;
		if (!((document.origin == 'null') && (window.chrome))) {
			window.history.pushState(null, null, window.location.protocol + "//"
				+ window.location.host + window.location.pathname + info);
		}
	}
	/**
	 * 
	 * @param {Node} n 
	 */
	function addNode(n,index) {
		if (n.type == "AudioMixerX")
		{
			if (!n.inputs)
				n.inputs = n._def.inputs;
		}
		/*if (n._def.category == "config") {
			configNodes[n.id] = n;
			RED.sidebar.config.refresh();
		} else {*/
		if (n._def.category != "config") { // config nodes is not used in this GUI
			n.dirty = true;
			if (index == undefined)
				nodes.push(n);
			else
				nodes.splice(index,1,n);
			
			//console.warn("addNode:");
			//console.warn(n);
			
			/*var updatedConfigNode = false; // config nodes is not used in this GUI
			for (var d in n._def.defaults) {
				if (n._def.defaults.hasOwnProperty(d)) {
					var property = n._def.defaults[d];
					if (property.type) {
						var type = getType(property.type);
						if (type && type.category == "config") {
							var configNode = configNodes[n[d]];
							if (configNode) {
								updatedConfigNode = true;
								configNode.users.push(n);
							}
						}
					}
				}
			}
			if (updatedConfigNode) {
				RED.sidebar.config.refresh();
			}*/
        }
        RED.events.emit('nodes:add',n);
	}
	function addLink(l) {
		links.push(l);
	}
/*
	function addConfig(c) {
		configNodes[c.id] = c;
	}
*/
	function checkForIO() {
		var hasIO = false;
		RED.nodes.eachNode(function (node) {

			if (node._def.category.startsWith("input-") ||
				node._def.category.startsWith("output-")) {
				hasIO = true;
			}
		});
		return hasIO;
	}

	function getNode(id) {
		if (id in configNodes) {
			return configNodes[id];
		} else {
			for (var n in nodes) {
				if (nodes[n].id == id) {
					return nodes[n];
				}
			}
		}
		return null;
	}

	function getNodeByName(name) {
		for (var n in nodes) {
			if (nodes[n].name == name) {
				return nodes[n];
			}
		}
		return null;
	}
	

	function removeNode(id) {
		var removedLinks = [];
		if (id in configNodes) {
			delete configNodes[id];
			RED.sidebar.config.refresh();
		} else {
            var node = getNode(id);
            RED.events.emit('nodes:remove',node);
			if (!node) return removedLinks; // cannot continue if node don't exists

			if (node.type == "TabInput" || node.type == "TabOutput")
			{
				//TODO: do the removal of external connected wires
				console.warn("TODO: do the removal of external connected wires");
				var wsLabel = getWorkspaceLabel(RED.view.getWorkspace());
				RED.console_ok("workspace label:" + wsLabel);
				refreshClassNodes();
			}
			nodes.splice(nodes.indexOf(node),1);
			removedLinks = links.filter(function(l) { return (l.source === node) || (l.target === node); });
			removedLinks.map(function(l) {links.splice(links.indexOf(l), 1); });
			
			var updatedConfigNode = false;
			for (var d in node._def.defaults) {
				if (node._def.defaults.hasOwnProperty(d)) {
					var property = node._def.defaults[d];
					if (property.type) {
						var type = getType(property.type);
						if (type && type.category == "config") {
							var configNode = configNodes[node[d]];
							if (configNode) {
								updatedConfigNode = true;
								var users = configNode.users;
								users.splice(users.indexOf(node),1);
							}
						}
					}
				}
			}
			if (updatedConfigNode) {
				RED.sidebar.config.refresh();
			}
		}
		return removedLinks;
	}

	function removeLink(l) {
		var index = links.indexOf(l);
		if (index != -1) {
			links.splice(index,1);
		}
	}

	function refreshValidation() {
		for (var n=0;n<nodes.length;n++) {
			RED.editor.validateNode(nodes[n]);
		}
	}

	function addWorkspace(ws) {
		workspaces.push(ws);
		currentWorkspace = ws;
        addClassTabsToPalette();
        RED.events.emit('flows:add',ws);
	}
	function getWorkspaceLabel(id)
	{
		//console.warn("getWorkspaceLabel:" +id);
		for (var i = 0; i < workspaces.length; i++)
		{
			if (workspaces[i].id == id)
				return workspaces[i].label;
		}
		return undefined;
	}
	function getWorkspaceIndex(id)
	{
		for (var i = 0; i < workspaces.length; i++)
		{
			if (workspaces[i].id == id)
				return i;
		}
		return -1;
	}
	function getWorkspace(id) {
		for (var i = 0; i < workspaces.length; i++)
		{
			if (workspaces[i].id == id)
				return workspaces[i];
		}
		return null;
	}
	function removeWorkspace(id) {
		console.trace("workspace removed " + id);
        var index = getWorkspaceIndex(id);
        var ws = workspaces[index];
		var wsLbl = ws.label;
		if (index != -1) workspaces.splice(index, 1);
		
		var removedNodes = [];
		var removedLinks = [];
		var n;
		for (n=0;n<nodes.length;n++) {
			var node = nodes[n];
			if (node.z == id) {
				removedNodes.push(node);
			}
		}
		for (n=0;n<removedNodes.length;n++) {
			var rmlinks = removeNode(removedNodes[n].id);
			removedLinks = removedLinks.concat(rmlinks);
		}
		if (node_defs[wsLbl] != undefined)
		{
			delete node_defs[wsLbl];
			console.log("class type deleted "+ wsLbl);
		}
		removeClassNodes(wsLbl);
		addClassTabsToPalette();
        refreshClassNodes();
        RED.events.emit('flows:remove',ws);
		return {nodes:removedNodes,links:removedLinks};
	}

	function getAllFlowNodes(node) {
		var visited = {};
		visited[node.id] = true;
		var nns = [node];
		var stack = [node];
		while(stack.length !== 0) {
			var n = stack.shift();
			var childLinks = links.filter(function(d) { return (d.source === n) || (d.target === n);});
			for (var i=0;i<childLinks.length;i++) {
				var child = (childLinks[i].source === n)?childLinks[i].target:childLinks[i].source;
				if (!visited[child.id]) {
					visited[child.id] = true;
					nns.push(child);
					stack.push(child);
				}
			}
		}
		return nns;
	}
	function getNodesIds(nodes)
	{
		if (nodes == undefined) return [];
		var nids = [];
		for (var i = 0; i < nodes.length; i++)
		{
			if (nodes[i] == undefined) continue;
			nids.push(nodes[i].id);
		}
		return nids;
	}
	/**
	 * Converts a node to an exportable JSON Object
	 **/
	function convertNode(n, exportCreds) {
		exportCreds = exportCreds || false;
		var node = {};
		node.id = n.id;
		node.type = n.type;

		for (var d in n._def.defaults) {
			if (n._def.defaults.hasOwnProperty(d)) {
				if (d === "nodes")
					node[d] = getNodesIds(n[d]);
				else if (d != "color")
					node[d] = n[d];
			}
		}
		if (n.parentGroup != undefined)
		{
			node.parentGroup = n.parentGroup.id;
		}
		/*if(exportCreds && n.credentials) {
			node.credentials = {};
			for (var cred in n._def.credentials) {
				if (n._def.credentials.hasOwnProperty(cred)) {
					if (n.credentials[cred] != null) {
						node.credentials[cred] = n.credentials[cred];
					}
				}
			}
		}*/
		if (n._def.category != "config") {
			node.x = n.x;
			node.y = n.y;
			node.z = n.z;
			node.bgColor = n.bgColor;
			node.wires = [];
			for(var i=0;i<n.outputs;i++) {
				node.wires.push([]);
			}
			var wires = links.filter(function(d){return d.source === n;});
			for (var j=0;j<wires.length;j++) {
				var w = wires[j];
				try{
				node.wires[w.sourcePort].push(w.target.id + ":" + w.targetPort);
				}
				catch (e)
				{
					// when a TabInput/TabOutput is removed and that pin is connected to parent flow

				}
			}
		}
		
		//console.warn("convert node: " + n.name);
		//console.warn("from:" + Object.getOwnPropertyNames(n._def));
		//console.warn("to:" + Object.getOwnPropertyNames(node));
		return node;
	}

	/**
	 * Converts the current node selection to an exportable JSON Object
	 **/
	function createExportableNodeSet(set) {
		var nns = [];
		var exportedConfigNodes = {};
		for (var n=0;n<set.length;n++) {
			var node = set[n].n;
			var convertedNode = RED.nodes.convertNode(node);
			for (var d in node._def.defaults) {
				if (node._def.defaults[d].type && node[d] in configNodes) {
					var confNode = configNodes[node[d]];
					var exportable = getType(node._def.defaults[d].type).exportable;
					if ((exportable == null || exportable)) {
						if (!(node[d] in exportedConfigNodes)) {
							exportedConfigNodes[node[d]] = true;
							nns.unshift(RED.nodes.convertNode(confNode));
						}
					} else {
						convertedNode[d] = "";
					}
				}
			}

			nns.push(convertedNode);
		}
		return nns;
	}
	//TODO: rename this (createCompleteNodeSet)
	function createCompleteNodeSet(dontSaveSettings) {
		var nns = [];
        var i;
        if (dontSaveSettings == undefined || dontSaveSettings == false)
		nns.push({"type":"settings", "data":RED.settings.getAsJSONobj()});

		/*for (i in configNodes) {
			if (configNodes.hasOwnProperty(i)) {
				nns.push(convertNode(configNodes[i], true));
			}
		}*/
		

		// development debug
		//console.warn("@createCompleteNodeSet\n  absoluteXposMax:" + absoluteXposMax +
		//								  "\n  absoluteYposMax:" + absoluteYposMax +
		//								  "\n  workspaceColSize:" + workspaceColSize);
		var ws = {};
		// sort nodes by workspace
		for (wsi=0;wsi<workspaces.length;wsi++)
		{
			ws = workspaces[wsi];
            nns.push(ws);
            
            var absoluteXposMax = 0;
            var absoluteYposMax = 0;
            var workspaceColSize = RED.view.defSettings.gridVmajorSize;
            
            // if the ws.settings.gridVmajorSize is defined then use that instead
            if (ws.settings.gridVmajorSize != undefined) workspaceColSize = ws.settings.gridVmajorSize;
            
            for (var ni = 0; ni < nodes.length; ni++)
            {
                var n = nodes[ni];
                if (node.z != ws.id) continue; // workspace filter
                if (n.x > absoluteXposMax) absoluteXposMax = n.x;
                if (n.y > absoluteYposMax) absoluteYposMax = n.y;
            }
            // ensure that every node is included 
            absoluteXposMax += workspaceColSize*2; 
            absoluteYposMax += RED.view.node_def.height*2;

            
			// sort nodes by columns (xpos)
			for (var xPosMin = 0; xPosMin < absoluteXposMax; xPosMin+=workspaceColSize)
			{
				var nnsCol = []; // current column
				var xPosMax = xPosMin+workspaceColSize;

				for (ni=0;ni<nodes.length;ni++)
				{
					var node = nodes[ni];
					if (node.z != ws.id) continue; // workspace filter

					if (node._def.uiObject != undefined) continue; // skip ui nodes they are added above (and should never be sorted because then it will mess up ui)

					if ((node.x >= xPosMin) && (node.x < xPosMax))
						nnsCol.push(convertNode(node, true));
				}
				// sort "new" nodes by ypos
				nnsCol.sort(function(a,b){return(a.y-b.y);});
				// push the "new" nodes to final array
				for (var nni = 0; nni < nnsCol.length; nni++)
				{
					nns.push(nnsCol[nni]);
				}
            }
            // add ui nodes last and as they are in draw order
			for (ni=0;ni<nodes.length;ni++)
			{
				var node = nodes[ni];
				if (node.z != ws.id) continue; // workspace filter
				if (node._def.uiObject == undefined) continue; // skip non ui nodes
				nns.push(convertNode(node, true)); // just add ui nodes as is
			}
		}
		return nns;
	}
	
	
	function createNewDefaultWorkspace() // Jannik Add function
	{
		console.trace();
		if (workspaces.length != 0) return;
		var newWorkspace = createWorkspaceObject("Main","Main",0,0);
		console.warn("add new default workspace Main");
		addWorkspace(newWorkspace);
		RED.view.addWorkspace(newWorkspace);
	}
	function convertWorkspaceToNewVersion(nns, ws)
	{
		// TODO: fix so that getClassIOportCounts is only used on old versions, so that load time is increased
		// but in order to do that wee need the workspace inputs and outputs to update when adding/removing workspace IO:s
		// we could insert references to TabInputs/TabOutputs in workspace
		// that would make some things go faster as well

		//if (ws.inputs != undefined && ws.outputs != undefined) // (no update from GUI yet) see above
		//	console.warn("inputs && outputs is defined @ workspace load");

		

		
	}

	function importWorkspaces(newWorkspaces)
	{
		for (var i = 0; i < newWorkspaces.length; i++)
		{
			currentWorkspace = newWorkspaces[i];
			importNodes(newWorkspaces[i].nodes, false);
		}
	}

	function importNodes(newNodesObj,createNewIds,clearCurrentFlow) {
		console.trace("@ importNodes - createNewIds:" + createNewIds);
		var i;
		var n;
		var newNodes;
		if (createNewIds == undefined)
			createNewIds = false; // not really necessary?
		if (clearCurrentFlow)
		{
			//console.trace("clear flow");
			//node_defs = {};
			nodes.length = 0;
			//configNodes = {};
			links.length = 0; // link structure {source:,sourcePort:,target:,targetPort:};
			workspaces.length = 0;
			currentWorkspace = {};
		}
		try {
			if (typeof newNodesObj === "string") {
				if (newNodesObj === "") {
					//console.trace("newNodexObj == null create");
					createNewDefaultWorkspace();
					return;
				}
				newNodes = JSON.parse(newNodesObj);
			} else {
				newNodes = newNodesObj;
			}

			if (!$.isArray(newNodes)) { // if only one node is imported
				console.warn("@ !$.isArray(newNodes)");
				newNodes = [newNodes];
			}
            var newWorkspaces = [];
			// scan and load workspaces and settings first
			for (i=0;i<newNodes.length;i++) { 
				n = newNodes[i];
				// TODO: not remove workspace because it's now used
				if (n.type === "tab" || n.type === "workspace") {
					if (n.type === "workspace") {
						n.type = "tab";
					}
                    var cIOs = getClassIOportCounts(n.id, newNodes);
                    var ws = createWorkspaceObject(n.id, n.label, cIOs.inCount, cIOs.outCount, n.export, n.isMain, n.mainNameType, n.mainNameExt, n.settings);
                    
                    addWorkspace(ws);
                    newWorkspaces.push(ws);
					
					//console.warn("added new workspace lbl:" + ws.label + ",inputs:" + ws.inputs + ",outputs:" + ws.outputs + ",id:" + ws.id);
                    var color = RED.main.classColor;
					var data = $.parseJSON("{\"defaults\":{\"name\":{\"value\":\"new\"},\"id\":{\"value\":\"new\"}},\"shortName\":\"" + ws.label + "\",\"inputs\":" + ws.inputs + ",\"outputs\":" + ws.outputs + ",\"category\":\"tabs\",\"color\":\"" + color + "\",\"icon\":\"arrow-in.png\"}");
					RED.nodes.registerType(ws.label, data);
                }
                else if (n.type === "settings")
				{
                    console.warn('Loading Project Settings');
					RED.settings.setFromJSONobj(n.data);
					continue;
				}
            }
            RED.storage.dontSave = true; // prevent save between tab switch
            for (i=0; i < newWorkspaces.length; i++) {
                RED.view.addWorkspace(newWorkspaces[i]); // "final" function is in tabs.js
            }
            RED.storage.dontSave = false;

			if (workspaces.length == 0) {
				createNewDefaultWorkspace(); // jannik changed to function
			}

			// scan and display list of unknown types
			var unknownTypes = [];
			for (i=0;i<newNodes.length;i++) {
				n = newNodes[i];
				if (n.type == "AudioMixerX") n.type = "AudioMixer"; // type conversion
				else if (n.type == "Array") n.type = "PointerArray"; // type conversion
				// TODO: remove workspace in next release+1(Node-Red team comment)
				if (n.type != "workspace" && n.type != "tab" && n.type != "settings" && !getType(n.type)) {
					// TODO: get this UI thing out of here! (see below as well) (Node-Red team comment)
					//n.name = n.type;
					//n.type = "unknown";
					//n.unknownType = true;
					if (unknownTypes.indexOf(n.type + ":" + n.name)==-1) {
						unknownTypes.push(n.type + ":" + n.name);
					}
					if (n.x == null && n.y == null) {
						// config node - remove it
						newNodes.splice(i,1);
						i--;
					}
				}
			}
			if (unknownTypes.length > 0) {
				var typeList = "<ul><li>"+unknownTypes.join("</li><li>")+"</li></ul>";
				var type = "type"+(unknownTypes.length > 1?"s":"");
				RED.notify("<strong>Imported unrecognised "+type+":</strong>"+typeList,"error",false,10000);
				//"DO NOT DEPLOY while in this state.<br/>Either, add missing types to Node-RED, restart and then reload page,<br/>or delete unknown "+n.name+", rewire as required, and then deploy.","error");
			}

			var node_map = {};
			var new_nodes = [];
			var new_links = [];

			for (i=0;i<newNodes.length;i++) {
				n = newNodes[i];
                
                // not TODO: remove workspace in next release+1 (Node-Red team comment)
                
				if (n.type === "workspace" || n.type === "tab") continue;
				else if (n.type === "settings") continue
					
				if (n.type == "AudioMixerX") n.type = "AudioMixer"; // type conversion
				//console.warn(n);

				var def = getType(n.type);
				if (def && def.category == "config") {
					if (!RED.nodes.node(n.id)) {
						var configNode = {id:n.id,type:n.type,users:[]};
						for (var d in def.defaults) {
							if (def.defaults.hasOwnProperty(d)) {
								configNode[d] = n[d];
							}
						}
						configNode.label = def.label;
						configNode._def = def;
						RED.nodes.add(configNode);
					}
				} else if (def != undefined) {
					if (def.uiObject == undefined)
						var node = {x:n.x,y:n.y,z:n.z,type:n.type,_def:def,wires:n.wires,changed:false};
					else
						var node = {x:n.x,y:n.y,z:n.z,w:n.w,h:n.h,type:n.type,_def:def,wires:n.wires,changed:false};

					if (n.parentGroup != undefined)
					{
						node.parentGroup = n.parentGroup;
					}
					//console.log(node);
					
						/*Object.defineProperty(node, 'selected', {
							_selected: false,
							set: function(value) { console.trace(value); this._selected = value;  },
							get: function() { return this._selected; }
							})*/
					//console.log("new node:" + n.name + ":" + n.id);

					if (!node._def) {
						
						node._def = {
							color:"#fee",
							defaults: {"name":{"value":"new"},"id":{"value":"new"},"comment":{"value":""}},
							label: n.name,
							labelStyle: "node_label_italic",
							icon:"arrow-in.png",
							outputs: n.outputs||n.wires.length,
							inputs: getNodeInputCount(newNodes, n.z, n.id)
						}
						node.unknownType = true;
						n.bgColor = undefined;
						node.name = n.name;
					}

					if (createNewIds) { // this is only used by import dialog and paste function
						node.name = n.name; // set temporary
						//console.log("@createNewIds srcnode: " + n.id + ":" + n.name);
						if (n.z == RED.view.getWorkspace())	{ // only generate new names on currentWorkspace
							node.name = createUniqueCppName(node, n.z); // jannik add
							//console.warn("make new name: n.name=" + node.name);
						}
						else {// this allow different workspaces to have nodes that have same name
							node.name = n.name;
							//console.trace("keep name:" + n.name);
						}
						// allways create unique id:s
						node.id = RED.nodes.cppId(node, getWorkspace(RED.view.getWorkspace()).label); // jannik add

					} else {
						node.name = n.name;
						node.id = n.id;
						if (node.z == null || node.z == "0") { //!workspaces[node.z]) {
							var currentWorkspaceId = RED.view.getWorkspace();
							console.warn('node.z == null || node.z == "0" -> add node to current workspace ' + currentWorkspaceId);
							
							node.z = currentWorkspaceId; // failsafe to set node workspace as current
						}
						else if (getWorkspaceIndex(node.z) == -1)
						{
							var currentWorkspaceId = RED.view.getWorkspace();
							console.warn("getWorkspaceIndex("+node.z+") == -1 -> add node to current workspace " + currentWorkspaceId);
							//console.error(workspaces);
							node.z = currentWorkspaceId; // failsafe to set node workspace as current
						}
					}
					for (var d2 in node._def.defaults) {
						if (node._def.defaults.hasOwnProperty(d2)) {
							if (d2 == "name" || d2 == "id") continue;
							node[d2] = n[d2];
							
						}
					}
					if (n.bgColor == undefined)	node.bgColor = node._def.color; 
					else node.bgColor = n.bgColor;

					/*if (n.type == "Ui_ListBox")
					{
						if (n.itemBGcolor == undefined)	node.itemBGcolor = node._def.color; 
						else node.itemBGcolor = n.itemBGcolor;
					}
					else if (n.type == "Ui_Piano")
					{
						if (n.whiteKeysColor == undefined)	node.whiteKeysColor = node._def.color; 
						else node.whiteKeysColor = n.whiteKeysColor;
						if (n.blackKeysColor == undefined)	node.blackKeysColor = node._def.color; 
						else node.blackKeysColor = n.blackKeysColor;
					}*/
					node.outputs = n.outputs||node._def.outputs;

					addNode(node);
					//if (node._def.uiObject != undefined) console.log("node.w:" + node.w + ", node.h:"+ node.h);
					RED.editor.validateNode(node);
					//if (node._def.uiObject != undefined) console.log("node.w:" + node.w + ", node.h:"+ node.h);
					node_map[n.id] = node; // node_map is used for simple access to destinations when generating wires
					new_nodes.push(node);
				}
				
			}
			// adding the links (wires)
			for (i=0;i<new_nodes.length;i++)
			{
				n = new_nodes[i];
				for (var w1=0;w1<n.wires.length;w1++)
				{
					var wires = (n.wires[w1] instanceof Array)?n.wires[w1]:[n.wires[w1]]; // if not array then convert to array

					for (var w2=0;w2<wires.length;w2++)
					{
						if (wires[w2] != null) {
							var parts = wires[w2].split(":");
							if (parts.length == 2 && parts[0] in node_map) {
								var dst = node_map[parts[0]];
								var link = {source:n,sourcePort:w1,target:dst,targetPort:parts[1]};
								addLink(link);
								new_links.push(link);
							}
						}
					}
				}
				if (n.nodes != undefined)
				{
					var newNodesList = [];
					for (var ni = 0; ni < n.nodes.length; ni++)
					{
						var nodeRef = node_map[n.nodes[ni]];
						if (nodeRef != undefined) newNodesList.push(nodeRef);
					}
					n.nodes = newNodesList;
				}
				if (n.parentGroup != undefined)
				{
					n.parentGroup = node_map[n.parentGroup]; // convert id to ref
				}
				
				delete n.wires;
			}
			return [new_nodes,new_links];
		}
		catch(error) { // hijack import errors so that a notification can be shown to the user
			createNewDefaultWorkspace();
			var newException = error.message + " " +  error.stack;
			RED.notify("<strong>import nodes Error</strong>: " + newException, "error",null,false,20000); // better timeout
			throw newException; // throw exception so it can be shown in webbrowser console
		}

	}
	function findNodeById(newNodes, id)
	{
		for (var i = 0; i < newNodes.length; i++)
		{
			if (newNodes[i].id == id) return newNodes[i];
		}
		return undefined;
	}
	/**
		 * this function checks for !node.wires at beginning and returns if so.
		 * @param {*} srcNode 
		 * @param {*} cb is function pointer with following format cb(srcPortIndex,dstId,dstPortIndex);
		 */
	function eachwire(srcNode, cb) {
		if (!srcNode.wires){ console.log("!node.wires: " + srcNode.type + ":" + srcNode.name); return;}

		//if (srcNode.wires.length == 0) console.log("port.length == 0:" + srcNode.type + ":" + srcNode.name)

		for (var pi=0; pi<srcNode.wires.length; pi++) // pi = port index
		{
			var port = srcNode.wires[pi];
			if (!port){ /*console.log("!port(" + pi + "):" + n.type + ":" + n.name);*/ continue;} // failsafe
			//if (port.length == 0) console.log("portWires.length == 0:"+n.type + ":" + n.name) // debug check
			for (var pwi=0; pwi<port.length; pwi++) // pwi = port wire index
			{
				var wire = port[pwi];
				if (!wire){ /*console.log("!wire(" + pwi + "):" + n.type + ":" + n.name);*/ continue;} // failsafe

				var parts = wire.split(":");
				if (parts.length != 2){ /*console.log("parts.length != 2 (" + pwi + "):" + n.type + ":" + n.name);*/ continue;} // failsafe
				
				var retVal = cb(pi,parts[0],parts[1]);

				if (retVal) return retVal; // only abort/return if cb returns something, and return the value
			}
		}
	}
	/**
	 * 
	 * @param {*} srcNode 
	 * @param {*} cb is function pointer with following format cb(link);
	 */
	function getEachLink(srcNode, cb)
	{
		for (var li = 0; li < links.length; li++)
		{
			var link = links[li];
			if (link.source === srcNode)
			var retVal = cb(link);
			if (retVal) return retVal; // only abort/return if cb returns something, and return the value
		}
	}

	function workspaceNameChanged(oldName, newName)
	{
		var changedCount = 0;
		for (var ni=0;ni<nodes.length;ni++) {
			if (nodes[ni].type == oldName)
			{
				nodes[ni].type = newName;
				changedCount++;
			}
		}
		
		addClassTabsToPalette();
		refreshClassNodes();
		//RED.palette.remove(oldName);
		delete node_defs[oldName];

		console.log("workspaceNameChanged:" + oldName + " to " + newName + " with " + changedCount + " objects changed");

		//RED.arduino.httpGetAsync("renameFile:" + oldName + ".h:" + newName + ".h");
	}
	function workspaceNameCheck(newName)
	{
		for (var wsi=0; wsi < workspaces.length; wsi++)
		{
			if (workspaces[wsi].label == newName)
				return true;
		}
		return false;
	}
	/**
	 * this is the internal type,  different from the saved one which is smaller
	 * @typedef {"id":"Main_Array_"+type+"_"+name ,
				 "type":"PointerArray",
				 "name":type + " " + name + " " + cppString,
				 "x":500,"y":55,"z":items[0].n.z,
				 "wires":[],
				 "_def":node_defs["PointerArray"]} Node 
	 */

	/**
	 * this autogenerate a array-node from same-type selection
	 * caller class is tab-info
	 * @param {*} items is of type moving_set from view
	 */
	function generateArrayNode(items)
	{
		var arrayItems = "{";
		var type = items[0].n.type;
		//var name = type.toLowerCase();
		var name = items[0].n.name + "s"

		for (var i = 0; i < items.length ; i++)
		{
			arrayItems += items[i].n.name;
			if (i < (items.length-1)) arrayItems += ",";
		}
		arrayItems += "}";
		addNode({"id":"Main_pArray_"+type+"_"+name ,
				 "type":"PointerArray",
				 "name":name,
				 "objectType":type,
				 "arrayItems":arrayItems,
				 "x":500,"y":500,"z":items[0].n.z,
				 "wires":[],
				 "_def":node_defs["PointerArray"]});
				 RED.view.redraw();
				 RED.storage.update();
	}
	/**
	 * Gets all TabInput and TabOutputs, and then sorting them vertically top->bottom (normal view)
	 * @param {String} wsId workspace id, if this is not passed then all nodes is returned
	 * @returns {tabOutNodes:outNodes, tabInNodes:inNodes}
	 */
	function getClassIOportsSorted(wsId, nns)
	{
		var inNodes = [];
		var outNodes = [];
		if (!nns)
			nns = nodes;
		for (var i = 0; i < nns.length; i++)
		{
			var node = nns[i];
			if (wsId && (node.z != wsId)) continue;

			if (node.type == "TabInput") inNodes.push(convertNode(node, true));
			else if (node.type == "TabOutput") outNodes.push(convertNode(node, true));
		}
		inNodes.sort(function(a,b){ return (a.y - b.y); });
		outNodes.sort(function(a,b){ return (a.y - b.y); });

		return {outputs:outNodes, inputs:inNodes};
	}
	/**
	 * Gets all TabInput and TabOutputs, and then sorting them vertically top->bottom (normal view)
	 * @param {String} wsId workspace id, if this is not passed then all nodes is returned
	 * @returns {outCount:outNodesCount, inCount:inNodesCount}
	 */
	function getClassIOportCounts(wsId, nns)
	{
		var inNodesCount = 0;
		var outNodesCount = 0;
		if (!nns)
			nns = nodes;
		for (var i = 0; i < nns.length; i++)
		{
			var node = nns[i];
			if (wsId && (node.z != wsId)) continue;

			if (node.type == "TabInput") inNodesCount++;
			else if (node.type == "TabOutput") outNodesCount++;
		}
		return {outCount:outNodesCount, inCount:inNodesCount};
	}
	/**
	 * Gets all TabInput or TabOutput belonging to a class, and then sorting them vertically top->bottom (normal view)
	 * then the correct port-node based by index is returned
	 * @param {String} wsId workspace id
	 * @param {String} type "TabInput" or "TabOutput"
	 * @returns {tabOutNodes:outNodes, tabInNodes:inNodes}
	 */
	function getClassIOportName(wsId, type, index) // this 
	{
		var retNodes = [];
		if (!wsId) return
		for (var i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];
			if (node.z != wsId) continue;
			if (node.type == type) retNodes.push(node);
		}
		retNodes.sort(function(a,b){ return (a.y - b.y); }); // this could be avoided if the io nodes where automatically sorted by default
		return retNodes[index].name;
	}
	function getClassComments(wsId)
	{
		var comment = "";
		for (var i = 0; i < nodes.length; i++)
		{
			var node = nodes[i];
			if (wsId && (node.z != wsId)) continue;

			if (node.type != "ClassComment") continue;

			comment += node.name;
		}
		return comment;
	}

	function printLinks() // debug to see links contents
	{
		// link structure {source:n,sourcePort:w1,target:dst,targetPort:parts[1]};
		for (var i = 0; i < links.length; i++)
		{
			var link = links[i];
			console.log("createCompleteNodeSet links["+i+"]: " + 
				link.source.name + ":" + link.sourcePort + ", " + link.target.name + ":" + link.targetPort); 
		}
	}
	function isClass(type)
	{
		for (var wsi = 0; wsi < workspaces.length; wsi++)
		{
			var ws = workspaces[wsi];
			if (type == ws.label) return ws.id;
			//console.log(node.type  + "!="+ ws.label);
		}
		return undefined;
	}
	
	function getWorkspaceIdFromClassName(type)
	{
		for (var wsi = 0; wsi < workspaces.length; wsi++)
		{
			var ws = workspaces[wsi];
			if (type == ws.label)  return ws.id;
		}
		return "";
	}
	
	/**
	 * This is used to find what is connected to a input-pin
	 * @param {Array} nns array of all nodes
	 * @param {String} wsId workspace id
	 * @param {String} nId node id
	 * @returns {*} as {node:n, srcPortIndex: srcPortIndex}
	 */
	function getWireInputSourceNode(nns, wsId, nId)
	{
		//console.log("try get WireInputSourceNode:" + wsId + ":" + nId);
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
					return {node:n, srcPortIndex: srcPortIndex}; // this is returned inside RED.nodes.eachWire function
				}
			});
			if (retVal) return retVal;
		}
	}
	/**
	 * This is used to count the amount of inputs that a unknown type has
	 * @param {Array} nns array of all nodes
	 * @param {String} wsId workspace id
	 * @param {String} nId node id
	 * @returns {*} as {node:n, srcPortIndex: srcPortIndex}
	 */
	function getNodeInputCount(nns, wsId, nId)
	{
		var count = 0;
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
					return true; // this is returned inside RED.nodes.eachWire function
				}
			});
			if (retVal == true) count++;
		}
		return count;
	}
	
	/**
	 * the name say it all
	 * @param {Array} tabIOnodes array of specific ClassPort nodes
	 * @param {node} classNode as nodeType
	 * @param {Number} portIndex
	 * @returns {node} the TabInput or TabOutput node
	 */
	function getClassPortNode(tabIOnodes, classNode, portIndex)
	{
		var wsId = getWorkspaceIdFromClassName(classNode.type);
		var portType;
		if (tabIOnodes.length > 0)
			portType = tabIOnodes[0].type;
		var currIndex = 0;
		//console.log("getClassPortNode classNode:" + classNode.name + ", portType: " + portType + ", portIndex:" + portIndex);
		for (var i = 0; i < tabIOnodes.length; i++)
		{
			var n = tabIOnodes[i];
			if (n.z != wsId) continue;
			if (currIndex == portIndex) // we found the port
			{
				//console.log("getClassPortNode found port:" + n.name);
				return n;
			}
			currIndex++;
		}
		var port
		console.log("ERROR! could not find the class, portType:" + portType + " with portIndex:" + portIndex);
	}
	
	function classOutputPortToCpp(nns, tabOutNodes, ac, classNode)
	{
		var outputNode = getClassPortNode(tabOutNodes, classNode, ac.srcPort);
		if (!outputNode)
		{
			 console.log("could not getClassPortNode:" + classNode.name + ", ac.srcPort:" + ac.srcPort);
			 return false;
		} // abort

		// if the portNode is found, next we get what is connected to that port inside the class
		var newSrc = getWireInputSourceNode(nns, getWorkspaceIdFromClassName(classNode.type), outputNode.id); // this return type {node:n, srcPortIndex: srcPortIndex};

		ac.srcName += "." + make_name(newSrc.node);
		ac.srcPort = newSrc.srcPortIndex;

		if (isClass(newSrc.node.type))
		{
			//console.log("isClass(" + newSrc.node.name + ")");

			// call this function recursive until non class is found
			if (!classOutputPortToCpp(nns, tabOutNodes, ac, newSrc.node))
				return false; // failsafe
		}
		return true;
	}

	function classInputPortToCpp(tabInNodes, currRootName, ac, classNode)
	{
		var inputNode = getClassPortNode(tabInNodes, classNode, ac.dstPort);
		if (!inputNode) return false; // abort

		// here we need to go througt all wires of that virtual port
		var retVal = RED.nodes.eachWire(inputNode, function(srcPortIndex,dstId,dstPortIndex)
		{
			var dst = RED.nodes.node(dstId);
			//console.log("found dest:" + dst.name);
			ac.dstPort = dstPortIndex;
			ac.dstName = currRootName + "." + make_name(dst);

			if (dst._def.isClass != undefined) // isClass(dst.type))
			{
				// call this function recursive until non class is found
				classInputPortToCpp(tabInNodes, ac.dstName, ac, dst);
			}
			else
			{
				ac.appendToCppCode(); // this don't return anything, the result is in ac.cppCode
			}					
		});
		return true;
	}
	function isNameDeclarationArray(name,wsId,replaceConstWithValue)
	{
		var value = 0;
		//console.warn("isNameDeclarationArray: " + name);
		var startIndex = name.indexOf("[");
		if (startIndex == -1) return undefined;
		var endIndex = name.indexOf("]");
		if (endIndex == -1){ console.log("isNameDeclarationArray: missing end ] in " + name); return undefined;}
		var arrayDef = name.substring(startIndex,endIndex+1); // this includes the []
		var valueDef = name.substring(startIndex+1,endIndex)
		if (isNaN(valueDef))
		{
			value = Number(getConstantNodeValue(valueDef, wsId));
			if (replaceConstWithValue)
			{
				name = name.replace(arrayDef, "[" + Number(value) + "]");
			}
			else
				name = name.replace(arrayDef, "[i]");
		} 
		else
		{
			value = Number(valueDef);
			if (replaceConstWithValue)
			{
				name = name.replace(arrayDef, "["+value+"]");
			}
			else
				name = name.replace(arrayDef, "[i]");
		}
		//console.log("NameDeclaration is Array:" + name);
		return {newName:name, arrayLength:value};
	}
	function getArrayDeclarationWithoutSizeSyntax(name)
	{
		var value = 0;
		//console.warn("isNameDeclarationArray: " + name);
		var startIndex = name.indexOf("[");
		if (startIndex == -1) return name;
		var endIndex = name.indexOf("]");
		if (endIndex == -1){ console.log("isNameDeclarationArray: missing end ] in " + name); return name;}
		var arrayDef = name.substring(startIndex,endIndex+1); // this includes the []
		//var valueDef = name.substring(startIndex+1,endIndex)
		return name.replace(arrayDef, "[]");
	}
	
	function getConstantNodeValue(name, wsId)
	{
		for (var i = 0; i < nodes.length; i++)
		{
			var n = nodes[i];
			if (n.z != wsId) continue; // workspace filter
			if (n.type != "ConstValue") continue; // type filter
			if (n.name === name)
			{
				return Number(n.value);
			}
		}
		console.error("did not found ConstantNodeValue:" + name + " @ wsId:" + wsId);
		return 0;
	}
	//var AceAutoCompleteKeywords = null;
	/**
	 * this takes both the current workspace node-names and also the external AceAutoCompleteKeywords
	 * @param {String} wsId 
	 */
	function getWorkspaceNodesAsCompletions(wsId) // this is used by ace editor for autocompletions
	{
		/*if (AceAutoCompleteKeywords == null) // if not allready loaded the data
		{
			var aackw_json = $("script[data-container-name|='AceAutoCompleteKeywordsMetadata']").html(); // this cannot happen globally because of the load order in html
			//console.log(aackw_json);
			var aackw_metaData = $.parseJSON(aackw_json);
			AceAutoCompleteKeywords = aackw_metaData["AceAutoCompleteKeywords"];
		}*/

		var items = []; // here we will append current workspace node names
		for (var ni = 0; ni < nodes.length; ni++)
		{
			var n = nodes[ni];
			if (n.z != wsId) continue; // workspace filter
			//if (RED.arduino.export.isSpecialNode(n.type)) continue;
			if (n.type == "Function")
			{
				getFunctions(n, items);
			}
			if (n._def.nonObject != undefined) continue;
			var data = $("script[data-help-name|='" + n.type + "']").html();
			//var firstP = $("<div/>").append(data).children("div").first().html();
			if (data == undefined) data = n.type;
			else
			{
				var div = document.createElement('div');
				
				div.innerHTML = data.trim();
				var headerElements = div.getElementsByTagName("h3");
				var notes = "<h4>Notes</h4>";
				for (var i2 = 0; i2 < headerElements.length; i2++)
				{
					if (headerElements[i2].textContent == "Notes")
					{
						var eleSibl = headerElements[i2].nextElementSibling;
						while(eleSibl)
						{
							notes += eleSibl.outerHTML;
							eleSibl = eleSibl.nextElementSibling;
						}
						//notes = headerElements[i2].nextElementSibling.innerHTML;
						//console.log("notes:" + notes);
						break;
					}
				}
				var summary = "<h4>Summary</h4>" + $("<div/>").append(data).children("div").first().html();
				data = summary +"<br>"+ notes;
			}
			
			var name = getArrayDeclarationWithoutSizeSyntax(n.name);
			if (name.endsWith("]"))
				items.push({ name:name, snippet:name.replace("[]","[${1}]"), value:name, type:n.type, html: data, meta: n.type, score:(1000)  });
			else
				items.push({ name:name, value:name, type:n.type, html: data, meta: n.type, score:(1000)  });
		}
		AceAutoComplete.Extension.forEach(function(kw) { // AceAutoCompleteKeywords is in AceAutoCompleteKeywords.js
			items.push(kw);
		});
		return items;
	}
	function getAllFunctionNodeFunctions(wsId)
	{
		var items = [];
		for (var ni = 0; ni < nodes.length; ni++)
		{
			var n = nodes[ni];
			if (n.z != wsId) continue; // workspace filter
			//if (RED.arduino.export.isSpecialNode(n.type)) continue;
			if (n.type == "Function")
			{
				getFunctions(n, items);
			}
		}
		return items;
	}
	function getFunctions(functionNode, completeItems)
	{
		var functions = [...functionNode.comment.matchAll(/\s*(unsigned|signed)?\s*(void|int|byte|char|short|long|float|double|bool)\s+(\w+)\s*(\([^)]*\))\s*/g)];
		//var functionsStr = "Functions("+functions.length+"):\n";
		//console.error("functions.length:" + functions.length + ' @ "' + n.name + '"');
		for (var fi = 0; fi < functions.length; fi++)
		{					
			//if (functions[fi] == undefined) continue;
			if (functions[fi][1] == undefined) functions[fi][1] = "";
			var returnType = functions[fi][1] + " " + functions[fi][2].trim();
			var name = functions[fi][3].trim();
			var param = functions[fi][4].trim();
			//console.error(functions[fi]);
			completeItems.push({ name:(name+param), value:(name+param), type:returnType, html: "@ " + functionNode.name + "<br> returns" + returnType, meta: returnType, score:(1000)  });
		}
	}
	/**
	 * function used by addClassTabsToPalette()
	 */
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
	/**
	 * function used by addClassTabsToPalette()
	 */
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

	function removeClassNodes(type)
	{
		for ( var ni = 0; ni < nodes.length; ni++)
		{
			var n = nodes[ni];
			//console.log("n.type:" + n.type); // debug
			if (n.type != type)  continue;

			removeNode(n.id);
		}
	}
	
	function refreshClassNodes()// Jannik add function
	{
	    //console.warn("refreshClassNodes");
	    for ( var wsi = 0; wsi < workspaces.length; wsi++)
	    {
		    var ws = workspaces[wsi];
		    //console.log("ws.label:" + ws.label); // debug
		    for ( var ni = 0; ni < nodes.length; ni++)
		    {
			    var n = nodes[ni];
			    //console.log("n.type:" + n.type); // debug
			    if (n.type != ws.label)  continue;
			   
			    // node is class
				//console.log("updating " + n.type);
				var node = RED.nodes.node(n.id);
				var def = RED.nodes.getType(n.type); // refresh type def
				if (def == undefined)
				{
					console.error("@refreshClassNodes: node._def is undefined!!!")
					continue;
				}
				//else
				//	console.error(def);
				node._def = def;
				var newInputCount = getClassNrOfInputs(nodes, ws.id);
				var newOutputCount = getClassNrOfOutputs(nodes, ws.id); 
				
				//var doRemoveUnusedWires = false;
				//if ((newInputCount < node._def.inputs) || (newOutputCount < node._def.outputs)) // this dont work at the moment
				//	doRemoveUnusedWires = true;
				//console.error("newInputCount:" + newInputCount + " oldInputCount:" + node._def.inputs);
				//console.error("newOutputCount:" + newOutputCount + " oldOutputCount:" + node._def.outputs);

				// set defaults
				node._def.inputs = newInputCount;
				node._def.outputs = newOutputCount;
				// update this because that is whats used in view redraw
				node.outputs = node._def.outputs;

				//if (doRemoveUnusedWires)// this dont work at the moment
					removeUnusedWires(node); // so updating all for now

				node.resize = true; // trigger redraw of ports
				node.dirty = true;
			   
		    }
		}
		
	}
	function getJunctionSrcNode(junctionNode)
	{
		for (var i = 0; i < links.length; i++)
		{
			var lnk = links[i];
			if (lnk.target === junctionNode)
			{
				if (lnk.source.type.startsWith("Junction"))
					return getJunctionSrcNode(lnk.source);
				else
					return lnk.source;
			}
		}
		return null;
	}
	function getJunctionDstNodeEquals(junctionNode, dstNode)
	{
		var found = false;
		for (var i = 0; i < links.length; i++)
		{
			var lnk = links[i];
			if (lnk.source === junctionNode)
			{
				if (lnk.target.type.startsWith("Junction"))
					found = getJunctionDstNodeEquals(lnk.target, dstNode);
				else
					found = lnk.target == dstNode;

				if (found) return true;
			}
		}
		return false;
	}
	function removeUnusedWires(node)
	{
		//console.log("check and remove Unused Wires: " + node.type);
		for (var i = 0; i < links.length; i++)
		{
			if (links[i].source == node)
			{
				if (links[i].sourcePort > (node._def.outputs - 1))
				{
					links.splice(i, 1);
				}
			} 
			else if (links[i].target == node)
			{
				if (links[i].targetPort > (node._def.inputs - 1))
				{
					links.splice(i, 1);
				}
			}
		}
	}
	function addClassTabsToPalette()// Jannik add function
	{
		//console.warn("addClassTabsToPalette");
		RED.palette.clearCategory("tabs");
		for (var i=0; i < workspaces.length; i++)
		{
            var ws = workspaces[i];
            if (ws.isMain == true) continue; // never add main file to tabs cat.
			var inputCount = getClassNrOfInputs(nodes, ws.id);
			var outputCount = getClassNrOfOutputs(nodes, ws.id);

			//if ((inputCount == 0) && (outputCount == 0)) continue; // skip adding class with no IO
			var classColor = RED.main.classColor;
			//var data = $.parseJSON("{\"defaults\":{\"name\":{\"value\":\"new\"}},\"shortName\":\"" + ws.label + "\",\"inputs\":" + inputCount + ",\"outputs\":" + outputCount + ",\"category\":\"tabs-function\",\"color\":\"" + classColor + "\",\"icon\":\"arrow-in.png\"}");
			//var data = $.parseJSON('{"defaults":{"name":{"value":"new"},"id":{"value":"new"}},"shortName":"' + ws.label + '","isClass":"","inputs":' + inputCount + ',"outputs":' + outputCount + ',"category":"tabs","color":"' + classColor + '","icon":"arrow-in.png" + }');

			var data = {
				defaults:{
					name:{value:"new"},id:{value:"new"}
				},shortName: ws.label, isClass:"",inputs:inputCount, outputs:outputCount ,category:"tabs",color: classColor ,icon:"arrow-in.png"};

			registerType(ws.label, data);
		}
	}
	/*function checkIfTypeShouldBeAddedToUsedCat(nt)
	{
		if (nt == "TabInput") return false;
		else if (nt == "TabOutput") return false;
		else if (nt == "Comment") return false;
		else if (nt == "ClassComment") return false;
		else if (nt == "PointerArray") return false;
		else if (nt == "Function") return false;
		else if (nt == "AudioStreamObject") return false;
		else if (nt == "CodeFile") return false;
		else if (nt == "unknown") return false;
		else if (isClass(nt)) return false;
		return true;
	}*/
	function addUsedNodeTypesToPalette()
	{
		//console.trace("addUsedNodeTypesToPalette");
		RED.palette.clearCategory("used");
		for (var i = 0; i < nodes.length; i++)
		{
			var n = nodes[i];
			if (n._def.nonObject != undefined) continue; // _def.nonObject is defined in index.html @ NodeDefinitions only for special nodes
			if (n._def.isClass != undefined) continue;
			if (n.unknownType != undefined) continue;
			if (n._def.category == undefined) {console.error("error at addUsedNodeTypesToPalette(): nodes[i].type=" + n.type); continue;}
			if (n._def.category.startsWith("input")) continue;
			if (n._def.category.startsWith("output")) continue;
			if (n._def.category.startsWith("control")) continue;

			RED.palette.add(n.type, n._def, "used");
				//console.error(nodes[i].type);
		}
	}
	function make_name(n) {
		var name = (n.name ? n.name : n.id);
		name = name.replace(" ", "_").replace("+", "_").replace("-", "_");
		return name
	}
	return {
        moveWorkspace: function(start, end) {
            if (start > end)
            {
                workspaces.splice(end,0,workspaces[start]);
                workspaces.splice(start+1,1);
                RED.storage.update();
            }
            else if (start < end)
            {

                workspaces.splice(end+1,0,workspaces[start]);
                workspaces.splice(start,1);
                RED.storage.update();
            }
            
            //workspaces[index+1] = workspaces[index];
		    //workspaces[index] = wsTemp;
        },
		moveNodeToEnd:moveNodeToEnd,
		createWorkspaceObject:createWorkspaceObject,
		createNewDefaultWorkspace: createNewDefaultWorkspace,
		registerType: registerType,
		getType: getType,
		convertNode: convertNode,
		selectNode: selectNode,
		getJunctionSrcNode:getJunctionSrcNode,
		getJunctionDstNodeEquals:getJunctionDstNodeEquals,
		add: addNode,
		addLink: addLink,
		remove: removeNode,
		removeLink: removeLink,
		addWorkspace: addWorkspace,
		removeWorkspace: removeWorkspace,
		workspace: getWorkspace,
		eachNode: function(cb) {
			for (var n=0;n<nodes.length;n++) {
				cb(nodes[n]);
			}
		},
		eachLink: function(cb) {
			for (var l=0;l<links.length;l++) {
				cb(links[l]);
			}
		},
		getEachLink:getEachLink,
		eachConfig: function(cb) {
			for (var id in configNodes) {
				if (configNodes.hasOwnProperty(id)) {
					cb(configNodes[id]);
				}
			}
		},
		eachWire: eachwire,
		workspaceNameChanged:workspaceNameChanged,
		workspaceNameCheck:workspaceNameCheck,
		node: getNode,
		namedNode: getNodeByName,
		importWorkspaces:importWorkspaces, // new structure
		import: importNodes,
		refreshValidation: refreshValidation,
		getAllFlowNodes: getAllFlowNodes,
		createExportableNodeSet: createExportableNodeSet,
		createCompleteNodeSet: createCompleteNodeSet,
		id: getID,
		getUniqueName:getUniqueName,
		cppName: createUniqueCppName,
		cppId: createUniqueCppId,
		hasIO: checkForIO,
		generateArrayNode:generateArrayNode,
		isClass:isClass,
		getClassComments:getClassComments,
		getWorkspaceIdFromClassName:getWorkspaceIdFromClassName,
		getWorkspace:getWorkspace,
		getClassPortNode:getClassPortNode,
		getWireInputSourceNode:getWireInputSourceNode,
		getClassIOportsSorted:getClassIOportsSorted,
		getClassIOportName:getClassIOportName, // used by node port tooltip popup
		classOutputPortToCpp:classOutputPortToCpp,
		classInputPortToCpp:classInputPortToCpp,
		isNameDeclarationArray:isNameDeclarationArray,
		getWorkspaceNodesAsCompletions:getWorkspaceNodesAsCompletions,
		getAllFunctionNodeFunctions:getAllFunctionNodeFunctions,
		getArrayDeclarationWithoutSizeSyntax:getArrayDeclarationWithoutSizeSyntax,
		updateClassTypes: function () {addClassTabsToPalette(); refreshClassNodes(); console.warn("@updateClassTypes");},
		addUsedNodeTypesToPalette: addUsedNodeTypesToPalette,
		addClassTabsToPalette:addClassTabsToPalette,
		refreshClassNodes:refreshClassNodes,
		make_name:make_name,
		selectWorkspace: function (id)
		{
			var ws = getWorkspace(id);
			if (ws != undefined)
			{
				currentWorkspace = ws;
				console.warn("workspace selected: "+ ws.label + " " + ws.id);
			}
        },
        getCurrentWorkspace: function() { return currentWorkspace},
		nodes: nodes, // TODO: exposed for d3 vis
		workspaces:workspaces,
		links: links,  // TODO: exposed for d3 vis
        node_defs: node_defs,
        setIconSets: function(sets) {
            iconSets = sets;
            iconSets["font-awesome"] = RED.nodes.fontAwesome.getIconList();
        },
        getIconSets: function() {
            return iconSets;
        }
	};
})();
