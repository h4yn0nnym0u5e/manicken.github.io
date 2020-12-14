/** Modified from original Node-Red source, for audio system visualization
 * vim: set ts=4:
 * Copyright 2013, 2014 IBM Corp.
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
RED.editor = (function() {
	var editing_node = null;
	// TODO: should IMPORT/EXPORT get their own dialogs?

	var aceLangTools = ace.require("ace/ext/language_tools");
	var lang = ace.require("../lib/lang");
	var rootCompletions = [];
	var classCompletions = []; // TODO: replace static typed @ AceAutoCompleteKeywords.js to fetch data from built in help @ index.html
	var defaultCompleters = {};
	
	
	completer= {
		getCompletions: function(editor, session, pos, prefix, callback) {
				callback(null, rootCompletions);
			},
		getDocTooltip: function(item) {
			var caption = "";
			if (item.type != undefined) caption = item.type;			
			else if (item.name == undefined) caption = item.caption;
			else caption = item.name;
			item.docHTML = [
				"<b>", caption, "</b>", "<hr></hr>",
				item.html
			].join("");
			item.toolTipFixedWidth = "500px";
		}
	}
	classCompleter= {
		getCompletions: function(editor, session, pos, prefix, callback) {
			callback(null, classCompletions);
		},
		getDocTooltip: function(item) {
			var name = "";
			if (item.name == undefined) name = item.caption;
			else name = item.name;
			item.docHTML = [
				"<b>", name, "</b>", "<hr></hr>",
				item.meta
			].join("");
			item.toolTipFixedWidth = "300px";
		}
	}
	
	aceLangTools.addCompleter(completer);

	function initAceCodeEditor(node)
	{
		rootCompletions = RED.nodes.getWorkspaceNodesAsCompletions(node.z);
			
		classCompletions = AceAutoComplete.Extension;
		//classCompletions = ; // clear array, this also works: completionsSub.splice(0,completionsSub.length);
		//AceAutoCompleteKeywords.forEach(function(kw) { // AceAutoCompleteKeywords is in AceAutoCompleteKeywords.js
		//	classCompletions.push(kw);
		//}); // this is only development test it could search help for functions
		// of could have global function def list with typenames 
		// this global def could be used by the help tab to make sure
		// that there is only one text for each type

		currentCompletions = rootCompletions; // default

		var aceEditor = ace.edit("aceEditor");
		
		//aceEditor.completers = [completer];

		//editor.setTheme("ace/theme/iplastic");
		
		aceEditor.setOptions({
			enableBasicAutocompletion: true,
			enableSnippets: true,
			enableLiveAutocompletion: true,
		});
		
		
		if (node._def.useAceEditor == "javascript")
		{
			aceEditor.session.setMode("ace/mode/javascript");
			console.warn("ace editor in javascript mode");
		}
		else if (node._def.useAceEditor == "c_cpp")
		{
			aceEditor.session.setMode("ace/mode/c_cpp");
			init_aceEditor_c_cpp_mode(aceEditor);
			console.warn("ace editor in c_cpp mode");
		}

		if (node.comment == undefined) node.comment = new String("");
		aceEditor.setValue(node.comment);
		aceEditor.session.selection.clearSelection();
	}

	function init_aceEditor_c_cpp_mode(aceEditor)
	{
		defaultCompleters = aceEditor.completers;
		console.warn("aceEditor.completers:");
				console.warn(aceEditor.completers);

		aceEditor.commands.addCommand({
			name: "dotCommand",
			bindKey: { win: ".", mac: "." },
			exec: function () {
				var pos = aceEditor.selection.getCursor();
				var session = aceEditor.session;
				console.log(pos);
				var curLine = (session.getDocument().getLine(pos.row)).trim();
				var curTokens = curLine.slice(0, pos.column).split(/\s+/);
				var curCmd = curTokens[0];
				if (!curCmd) return;
				var lastToken = curTokens[curTokens.length - 1];
		
				aceEditor.insert(".");            
				lastToken = RED.nodes.getArrayDeclarationWithoutSizeSyntax(lastToken);
				var split = lastToken.split(".");
				console.error(split);
				if (split.length > 1) lastToken = split[split.length-1];

				// here it need also need to check the type
				// to get correct function list
				var tokenType = "";
				for (var i = 0; i < rootCompletions.length; i++) { // AceAutoCompleteKeywords is in AceAutoCompleteKeywords.js
					var kw = rootCompletions[i];
					if (kw.name == lastToken)
					{
						tokenType = kw.type;
						break;
					}
					else
					{
						console.warn("kw.name:" + kw.name);
					}
				}
				if (tokenType == "")
				{
					for (var i = 0; i < classCompletions.length; i++) { // AceAutoCompleteKeywords is in AceAutoCompleteKeywords.js
						var kw = classCompletions[i];
						if (kw.name == lastToken)
						{
							tokenType = kw.type;
							break;
						}
						else
						{
							console.warn("kw.name:" + kw.name);
						}
					}
				}
				console.log("lastToken:" + lastToken + " @ " + tokenType);
				defaultCompleters = aceEditor.completers; // save default
				
				var byToken = [];
				var wsId = RED.nodes.isClass(tokenType);
				if (wsId)
				{
					//byToken = RED.nodes.getAllFunctionNodeFunctions(wsId);
					byToken = RED.nodes.getWorkspaceNodesAsCompletions(wsId);
					// TODO: also make it fetch AudioObjects
				}
				else
				{
					// here we get data from html
					byToken = AceAutoComplete.getFromHelp(tokenType);
				}

				if (byToken == undefined) return;

				if (byToken.length != 0) // AceAutoComplete.ClassFunctions[tokenType] != null)
				{
					classCompletions = byToken;//AceAutoComplete.ClassFunctions[tokenType];
				}
				else
				{
					classCompletions = AceAutoComplete.Extension;
				}

				aceEditor.completers = [classCompleter]; // only show class objects

				aceEditor.execCommand("startAutocomplete");
				return lastToken;
			}
		});
		aceEditor.commands.on("afterExec", function (e) {
			console.log("afterExec:" + e.command.name + ":" + e.args + ":" + e.returnValue);
			if (e.command.name == "insertstring")
			{
				if (/^[\w.]$/.test(e.args)) {
					RED.console_ok("hello");
					aceEditor.execCommand("startAutocomplete");
				}
				if (e.args.endsWith(";"))
				{
					RED.console_ok("insertString ended");
					aceEditor.completers = defaultCompleters; // reset to default
				}
				else if (e.args == "\n")
				{
					console.log("newline");
				}
			}
			else if (e.command.name == "backspace")
			{
				aceEditor.completers = defaultCompleters; // reset to default
			}
			else if (e.command.name == "Return")
			{
				aceEditor.completers = defaultCompleters; // reset to default
			}
			else if (e.command.name == "Esc")
			{
				aceEditor.completers = defaultCompleters; // reset to default
			}
			else if (e.command.name == "dotCommand")
			{
				// e.returnValue is the last token
				//console.log(e.returnValue);
				//console.trace("dotCommand trace");
			}
			//
		});
	}

	function getCredentialsURL(nodeType, nodeID) {
		var dashedType = nodeType.replace(/\s+/g, '-');
		return  'credentials/' + dashedType + "/" + nodeID;
	}

	/**
	 * Validate a node 
	 * @param node - the node being validated
	 * @returns {boolean} whether the node is valid. Sets node.dirty if needed
	 */
	function validateNode(node) {
		var oldValue = node.valid;
		node.valid = validateNodeProperties(node, node._def.defaults, node);
		if (node._def._creds) {
			node.valid = node.valid && validateNodeProperties(node, node._def.credentials, node._def._creds);
		}
		if (oldValue != node.valid) {
			node.dirty = true;
		}
	}
	
	/**
	 * Validate a node's properties for the given set of property definitions
	 * @param node - the node being validated
	 * @param definition - the node property definitions (either def.defaults or def.creds)
	 * @param properties - the node property values to validate
	 * @returns {boolean} whether the node's properties are valid
	 */
	function validateNodeProperties(node, definition, properties) {
		var isValid = true;
		for (var prop in definition) {
			if (!validateNodeProperty(node, definition, prop, properties[prop])) {
				isValid = false;
			}
		}
		return isValid;
	}

	/**
	 * Validate a individual node property
	 * @param node - the node being validated
	 * @param definition - the node property definitions (either def.defaults or def.creds)
	 * @param property - the property name being validated
	 * @param value - the property value being validated
	 * @returns {boolean} whether the node proprty is valid
	 */
	function validateNodeProperty(node,definition,property,value) {
		var valid = true;
		if ("required" in definition[property] && definition[property].required) {
			valid = value !== "";
		}
		if (valid && "validate" in definition[property]) {
			valid = definition[property].validate.call(node,value);
		}
		if (valid && definition[property].type && RED.nodes.getType(definition[property].type) && !("validate" in definition[property])) {
			if (!value || value == "_ADD_") {
				valid = false;
			} else {
				var v = RED.nodes.node(value).valid;
				valid = (v==null || v);
			}
		}
		return valid;
	}

	/**
	 * Called when the node's properties have changed.
	 * Marks the node as dirty and needing a size check.
	 * Removes any links to non-existant outputs.
	 * @param node - the node that has been updated
	 * @returns {array} the links that were removed due to this update
	 */
	function updateNodeProperties(node) {
		node.resize = true;
		node.dirty = true;
		var removedLinks = [];
		if (node.outputs < node.ports.length) {
			while (node.outputs < node.ports.length) {
				node.ports.pop();
			}
			RED.nodes.eachLink(function(l) {
					if (l.source === node && l.sourcePort >= node.outputs) {
						removedLinks.push(l);
					}
			});
			for (var l=0;l<removedLinks.length;l++) {
				RED.nodes.removeLink(removedLinks[l]);
			}
		} else if (node.outputs > node.ports.length) {
			while (node.outputs > node.ports.length) {
				node.ports.push(node.ports.length);
			}
		}
		return removedLinks;
	}

	function editNode_dialog_OK_pressed()
	{
		var changes = {};
		var changed = false;
		var wasDirty = RED.view.dirty();
		var d;

		if (editing_node._def.oneditsave) {
			console.warn("editing_node._def.oneditsave");
			var oldValues = {};
			for (d in editing_node._def.defaults) {
				if (editing_node._def.defaults.hasOwnProperty(d)) {
					if (typeof editing_node[d] === "string" || typeof editing_node[d] === "number") {
						oldValues[d] = editing_node[d];
					} else {
						oldValues[d] = $.extend(true,{},{v:editing_node[d]}).v;
					}
				}
			}
			var rc = editing_node._def.oneditsave.call(editing_node);
			if (rc === true) {
				changed = true;
			}

			for (d in editing_node._def.defaults) {
				if (editing_node._def.defaults.hasOwnProperty(d)) {
					if (oldValues[d] === null || typeof oldValues[d] === "string" || typeof oldValues[d] === "number") {
						if (oldValues[d] !== editing_node[d]) {
							changes[d] = oldValues[d];
							changed = true;
						}
					} else {
						if (JSON.stringify(oldValues[d]) !== JSON.stringify(editing_node[d])) {
							changes[d] = oldValues[d];
							changed = true;
						}
					}
				}
			}
		}

		if (editing_node._def.defaults) {
			for (d in editing_node._def.defaults) {
				if (editing_node._def.defaults.hasOwnProperty(d)) {
					var input = $("#node-input-"+d);
					var newValue;
					if (input.attr('type') === "checkbox") {
						newValue = input.prop('checked');
					} else {
						newValue = input.val();
					}
					if (newValue != null) {
						if (editing_node[d] != newValue) {
							if (editing_node._def.defaults[d].type) {
								if (newValue == "_ADD_") {
									newValue = "";
								}
								// Change to a related config node
								var configNode = RED.nodes.node(editing_node[d]);
								if (configNode) {
									var users = configNode.users;
									users.splice(users.indexOf(editing_node),1);
								}
								configNode = RED.nodes.node(newValue);
								if (configNode) {
									configNode.users.push(editing_node);
								}
							}
							if (editing_node.type == "UI_ListBox" && d == "items")
							{
								var newItemCount = newValue.split("\n").length;
								var oldItemCount = editing_node.items.split("\n").length;

								if (newItemCount != oldItemCount) editing_node.itemCountChanged = true;
							}
							changes[d] = editing_node[d];
							editing_node[d] = newValue;
							changed = true;
						}
					}
				}
			}
		}
		if (editing_node._def.credentials) {
			var prefix = 'node-input';
			var credDefinition = editing_node._def.credentials;
			var credsChanged = updateNodeCredentials(editing_node,credDefinition,prefix);
			changed = changed || credsChanged;
		}

		if (editing_node.type == "UI_ListBox")
		{
			var items = editing_node.items.split("\n");
		}

		var removedLinks = updateNodeProperties(editing_node);
		if (changed) {
			var wasChanged = editing_node.changed;
			editing_node.changed = true;
			RED.view.dirty(true);
			RED.history.push({t:'edit',node:editing_node,changes:changes,links:removedLinks,dirty:wasDirty,changed:wasChanged});
		}
		editing_node.dirty = true;
		validateNode(editing_node);
		if (editing_node._def.useAceEditor != undefined)
		{ 
			var editor = ace.edit("aceEditor");
			editing_node.comment = editor.getValue();
		}
		
		
		
		editing_node.bgColor = $("#node-input-color").val();
		if (editing_node.type == "UI_ListBox")
			editing_node.itemBGcolor = $("#node-input-itemBGcolor").val();
		else if (editing_node.type == "UI_Piano")
		{
			editing_node.whiteKeysColor = $("#node-input-whiteKeysColor").val();
			editing_node.blackKeysColor = $("#node-input-blackKeysColor").val();
		}
		RED.view.redraw();
		console.log("edit node saved!");
		RED.storage.update();
	}
	function edit_dialog_apply()
	{
		if (editing_node) {
			editNode_dialog_OK_pressed(); // found above
		} else if (RED.view.state() == RED.state.EXPORT) {
			console.error("RED.view.state() == RED.state.EXPORT");
			if (/library/.test($( "#dialog" ).dialog("option","title"))) {
				//TODO: move this to RED.library
				var flowName = $("#node-input-filename").val();
				if (!/^\s*$/.test(flowName)) {
					$.post('library/flows/'+flowName,$("#node-input-filename").attr('nodes'),function() {
							RED.library.loadFlowLibrary();
							RED.notify("Saved nodes","success");
					});
				}
			}
		} else if (RED.view.state() == RED.state.IMPORT) {
			console.error("RED.view.state() == RED.state.IMPORT");
			RED.view.importNodes($("#node-input-import").val());
		}
		else
		{
			console.error("editor no mode");
		}
	}
	function init_edit_dialog()
	{
		$( "#dialog" ).dialog({
				modal: true,
				autoOpen: false,
				closeOnEscape: false,
				width: 500,
				buttons: [
					{
						id: "btnRunScript",
						text: "Run script",
						click: function() {
							var editor = ace.edit("aceEditor");
							RED.view.evalHere(editor.getValue(), editing_node);
						}
					},
					{
						text: "Apply",
						click: function() {
							edit_dialog_apply();
						}
					},
					{
						text: "Ok",
						click: function() {
							edit_dialog_apply();
							$( this ).dialog( "close" );
						}
					},
					{
						text: "Cancel",
						click: function() {
							$( this ).dialog( "close" );
						}
					}
				],
				resize: function(e,ui) {
					if (editing_node) {

						$(this).dialog('option',"sizeCache-"+editing_node.type,ui.size);
						//RED.console_ok("editor height:" + ui.size.height);
						//RED.console_ok("editor this height:"+$(this).height())
						var aceEditor = $("#aceEditor");
						if (aceEditor)
						{
							console.log("editor window height:"+$(this).height());
							$("#aceEditor").height($(this).height() - 120);
							var aceEditor = ace.edit("aceEditor");
							aceEditor.resize(true);
							$(this).scrollTop(aceEditor.scrollHeight);
						}
					}
				},
				open: function(e) {
					RED.keyboard.disable();
					if (editing_node) {
						
						var size = $(this).dialog('option','sizeCache-'+editing_node.type);
						if (size) {
							$(this).dialog('option','width',size.width);
							$(this).dialog('option','height',size.height);
						}
						var aceEditor = $("#aceEditor");
						if (aceEditor)
						{
							aceEditor.css("height", $(this).height() - 100);
							$(this).scrollTop(aceEditor.scrollHeight);
							
						}
						$("#node-input-color").val(editing_node.bgColor);
						if (editing_node.type == "UI_ListBox")
							$("#node-input-itemBGcolor").val(editing_node.itemBGcolor);
						else if (editing_node.type == "UI_Piano")
						{
							$("#node-input-whiteKeysColor").val(editing_node.whiteKeysColor);
							$("#node-input-blackKeysColor").val(editing_node.blackKeysColor);
						}
						jscolor.install();
					}

				},
				close: function(e) {
					RED.keyboard.enable();

					if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
						RED.view.state(RED.state.DEFAULT);
					}
					$( this ).dialog('option','height','auto');
					$( this ).dialog('option','width','500');
					if (editing_node) {
						RED.sidebar.info.refresh(editing_node);
						RED.view.resetMouseVars();
						console.log("edit node done!");
					}
					RED.sidebar.config.refresh();
					editing_node = null;
				}
		});
	}

	/**
	 * Create a config-node select box for this property
	 * @param node - the node being edited
	 * @param property - the name of the field
	 * @param type - the type of the config-node
	 */
	function prepareConfigNodeSelect(node,property,type) {
		var input = $("#node-input-"+property);
		var node_def = RED.nodes.getType(type);

		input.replaceWith('<select style="width: 60%;" id="node-input-'+property+'"></select>');
		updateConfigNodeSelect(property,type,node[property]);
		var select = $("#node-input-"+property);
		select.after(' <a id="node-input-lookup-'+property+'" class="btn"><i class="icon icon-pencil"></i></a>');
		$('#node-input-lookup-'+property).click(function(e) {
			showEditConfigNodeDialog(property,type,select.find(":selected").val());
			e.preventDefault();
		});
		var label = "";
		var configNode = RED.nodes.node(node[property]);
		if (configNode && node_def.label) {
			if (typeof node_def.label == "function") {
				label = node_def.label.call(configNode);
			} else {
				label = node_def.label;
			}
		}
		input.val(label);
	}

	/**
	 * Populate the editor dialog input field for this property
	 * @param node - the node being edited
	 * @param property - the name of the field
	 * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
	 */
	function preparePropertyEditor(node,property,prefix) {
		//console.error("preparePropertyEditor:" + node.type + ":" + prefix+"-"+property);
		var input = $("#"+prefix+"-"+property);
		if (input.attr('type') === "checkbox") {
			input.prop('checked',node[property]);
		} else {
			var val = node[property];
			if (val == null) {
				val = "";
			}
			input.val(val);
		}
	}

	/**
	 * Add an on-change handler to revalidate a node field
	 * @param node - the node being edited
	 * @param definition - the definition of the node
	 * @param property - the name of the field
	 * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
	 */
	function attachPropertyChangeHandler(node,definition,property,prefix) {
		$("#"+prefix+"-"+property).change(function() {
			if (!validateNodeProperty(node, definition, property,this.value)) {
				$(this).addClass("input-error");
			} else {
				$(this).removeClass("input-error");
			}
		});
	}

	/**
	 * Assign the value to each credential field
	 * @param node
	 * @param credDef
	 * @param credData
	 * @param prefix
	 */
	function populateCredentialsInputs(node, credDef, credData, prefix) {
		var cred;
		for (cred in credDef) {
			if (credDef.hasOwnProperty(cred)) {
				if (credDef[cred].type == 'password') {
					if (credData[cred]) {
						$('#' + prefix + '-' + cred).val(credData[cred]);
					} else if (credData['has_' + cred]) {
						$('#' + prefix + '-' + cred).val('__PWRD__');
					}
					else {
						$('#' + prefix + '-' + cred).val('');
					}
				} else {
					preparePropertyEditor(credData, cred, prefix);
				}
				attachPropertyChangeHandler(node, credDef, cred, prefix);
			}
		}
		for (cred in credDef) {
			if (credDef.hasOwnProperty(cred)) {
				$("#" + prefix + "-" + cred).change();
			}
		}
	}
	
	/**
	 * Update the node credentials from the edit form
	 * @param node - the node containing the credentials
	 * @param credDefinition - definition of the credentials
	 * @param prefix - prefix of the input fields
	 * @return {boolean} whether anything has changed
	 */
	function updateNodeCredentials(node, credDefinition, prefix) {
		var changed = false;
		if(!node.credentials) {
			node.credentials = {_:{}};
		}

		for (var cred in credDefinition) {
			if (credDefinition.hasOwnProperty(cred)) {
				var input = $("#" + prefix + '-' + cred);
				var value = input.val();
				if (credDefinition[cred].type == 'password') {
					node.credentials['has_' + cred] = (value !== "");
					if (value == '__PWRD__') {
						continue;
					}
					changed = true;
					
				}
				if (value != node.credentials._[cred]) {
					node.credentials[cred] = value;
					changed = true;
				}
			}
		}
		return changed;
	}

	/**
	 * Prepare all of the editor dialog fields
	 * @param node - the node being edited
	 * @param definition - the node definition
	 * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
	 */
	function prepareEditDialog(node,definition,prefix) {
		if (node._def.useAceEditor != undefined)
		{ 
			initAceCodeEditor(node);
		}
		
		for (var d in definition.defaults) {
			if (definition.defaults.hasOwnProperty(d)) {
				if (definition.defaults[d].type) {
					prepareConfigNodeSelect(node,d,definition.defaults[d].type);
				} else {
					preparePropertyEditor(node,d,prefix);
				}
				attachPropertyChangeHandler(node,definition.defaults,d,prefix);
			}
		}
		var completePrepare = function() {
			if (definition.oneditprepare) {
				definition.oneditprepare.call(node);
			}
			for (var d in definition.defaults) {
				if (definition.defaults.hasOwnProperty(d)) {
					$("#"+prefix+"-"+d).change();
				}
			}
		};
		
		if (definition.credentials) {
			if (node.credentials) {
				populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
				completePrepare();
			} else {
				$.getJSON(getCredentialsURL(node.type, node.id), function (data) {
					node.credentials = data;
					node.credentials._ = $.extend(true,{},data);
					populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
					completePrepare();
				});
			}
		} else {
			completePrepare();
		}
	}

	function showEditDialog(node) {
		editing_node = node;
		
		init_edit_dialog();

		if (node.type != "UI_ScriptButton")
			$("#btnRunScript").hide();
		RED.view.state(RED.state.EDITING);
		//$("#dialog-form").html(RED.view.getForm(node.type));
		//console.log("get form for type:" + node.type);
		var editorType = "";
		
		//console.log("showEditDialog"); // just to make it easier to find this function
		
		// Jannik add start
		// (this method is better because then we can define special edit for some types)
		// but we don't need to define for each new type we add, all those new types use
		// global edit by default
		var ifHaveOwnEditor = $("script[data-template-name|='" + node.type + "']");
		//console.warn("ifHaveOwnEditor:" + Object.getOwnPropertyNames(ifHaveOwnEditor.length)); // see properties of object
		//console.warn("ifHaveOwnEditor:" + ifHaveOwnEditor.length);
		if (ifHaveOwnEditor.length != 0) 
		{	editorType = node.type; console.log("use type editor:" + editorType);}
		else
		{	editorType = "NodesGlobalEdit"; console.log("use global editor");}
		// Jannik add end

		editing_node = node;
		
		//RED.view.getForm("dialog-form", node.type, function (d, f) {// Jannik remove
		RED.view.getForm("dialog-form", editorType, function (d, f) { // Jannik add (because see above)
			//console.log("node._def " + node._def.defaults);
			prepareEditDialog(node,node._def,"node-input");
			$( "#dialog" ).dialog("option","title","Edit "+node.type+" node").dialog( "open" );
		});
	}

	function showEditConfigNodeDialog(name,type,id) {
		var adding = (id == "_ADD_");
		var node_def = RED.nodes.getType(type);

		var configNode = RED.nodes.node(id);
		if (configNode == null) {
			configNode = {
				id: (1+Math.random()*4294967295).toString(16),
				_def: node_def,
				type: type
			};
			for (var d in node_def.defaults) {
				if (node_def.defaults[d].value) {
					configNode[d] = node_def.defaults[d].value;
				}
			}
		}

		//$("#dialog-config-form").html(RED.view.getForm(type));
		RED.view.getForm("dialog-config-form", type, function (d, f) {

		prepareEditDialog(configNode,node_def,"node-config-input");

		var buttons = $( "#node-config-dialog" ).dialog("option","buttons");
		if (adding) {
			if (buttons.length == 3) {
				buttons = buttons.splice(1);
			}
			buttons[0].text = "Add";
			$("#node-config-dialog-user-count").html("").hide();
		} else {
			if (buttons.length == 2) {
				buttons.unshift({
						class: 'leftButton',
						text: "Delete",
						click: function() {
							var configProperty = $(this).dialog('option','node-property');
							var configId = $(this).dialog('option','node-id');
							var configType = $(this).dialog('option','node-type');
							var configNode = RED.nodes.node(configId);
							var configTypeDef = RED.nodes.getType(configType);

							if (configTypeDef.ondelete) {
								configTypeDef.ondelete.call(RED.nodes.node(configId));
							}
							RED.nodes.remove(configId);
							for (var i=0;i<configNode.users.length;i++) {
								var user = configNode.users[i];
								for (var d in user._def.defaults) {
									if (user._def.defaults.hasOwnProperty(d) && user[d] == configId) {
										user[d] = "";
									}
								}
								validateNode(user);
							}
							updateConfigNodeSelect(configProperty,configType,"");
							RED.view.dirty(true);
							$( this ).dialog( "close" );
							RED.view.redraw();
						}
				});
			}
			buttons[1].text = "Update";
			$("#node-config-dialog-user-count").html(configNode.users.length+" node"+(configNode.users.length==1?" uses":"s use")+" this config").show();
		}
		$( "#node-config-dialog" ).dialog("option","buttons",buttons);

		$( "#node-config-dialog" )
			.dialog("option","node-adding",adding)
			.dialog("option","node-property",name)
			.dialog("option","node-id",configNode.id)
			.dialog("option","node-type",type)
			.dialog("option","title",(adding?"Add new ":"Edit ")+type+" config node")
			.dialog( "open" );
		});
	}

	function updateConfigNodeSelect(name,type,value) {
		var select = $("#node-input-"+name);
		var node_def = RED.nodes.getType(type);
		select.children().remove();
		RED.nodes.eachConfig(function(config) {
			if (config.type == type) {
				var label = "";
				if (typeof node_def.label == "function") {
					label = node_def.label.call(config);
				} else {
					label = node_def.label;
				}
				select.append('<option value="'+config.id+'"'+(value==config.id?" selected":"")+'>'+label+'</option>');
			}
		});

		select.append('<option value="_ADD_"'+(value===""?" selected":"")+'>Add new '+type+'...</option>');
		window.setTimeout(function() { select.change();},50);
	}

	$( "#node-config-dialog" ).dialog({
			modal: true,
			autoOpen: false,
			width: 500,
			closeOnEscape: false,
			buttons: [
				{
					text: "Ok",
					click: function() {
						var configProperty = $(this).dialog('option','node-property');
						var configId = $(this).dialog('option','node-id');
						var configType = $(this).dialog('option','node-type');
						var configAdding = $(this).dialog('option','node-adding');
						var configTypeDef = RED.nodes.getType(configType);
						var configNode;
						var d;
						
						if (configAdding) {
							configNode = {type:configType,id:configId,users:[]};
							for (d in configTypeDef.defaults) {
								if (configTypeDef.defaults.hasOwnProperty(d)) {
									configNode[d] = $("#node-config-input-"+d).val();
								}
							}
							configNode.label = configTypeDef.label;
							configNode._def = configTypeDef;
							RED.nodes.add(configNode);
							updateConfigNodeSelect(configProperty,configType,configNode.id);
						} else {
							configNode = RED.nodes.node(configId);
							for (d in configTypeDef.defaults) {
								if (configTypeDef.defaults.hasOwnProperty(d)) {
									configNode[d] = $("#node-config-input-"+d).val();
								}
							}
							updateConfigNodeSelect(configProperty,configType,configId);
						}
						if (configTypeDef.credentials) {
							updateNodeCredentials(configNode,configTypeDef.credentials,"node-config-input");
						}
						if (configTypeDef.oneditsave) {
							configTypeDef.oneditsave.call(RED.nodes.node(configId));
						}
						validateNode(configNode);

						RED.view.dirty(true);
						$(this).dialog("close");

					}
				},
				{
					text: "Cancel",
					click: function() {
						var configType = $(this).dialog('option','node-type');
						var configId = $(this).dialog('option','node-id');
						var configAdding = $(this).dialog('option','node-adding');
						var configTypeDef = RED.nodes.getType(configType);

						if (configTypeDef.oneditcancel) {
							// TODO: what to pass as this to call
							if (configTypeDef.oneditcancel) {
								var cn = RED.nodes.node(configId);
								if (cn) {
									configTypeDef.oneditcancel.call(cn,false);
								} else {
									configTypeDef.oneditcancel.call({id:configId},true);
								}
							}
						}
						$( this ).dialog( "close" );
					}
				}
			],
			resize: function(e,ui) {
			},
			open: function(e) {
				if (RED.view.state() != RED.state.EDITING) {
					RED.keyboard.disable();
				}
			},
			close: function(e) {
				$("#dialog-config-form").html("");
				if (RED.view.state() != RED.state.EDITING) {
					RED.keyboard.enable();
				}
				RED.sidebar.config.refresh();
			}
	});


	return {
		init_edit_dialog:init_edit_dialog,
		edit: showEditDialog,
		editConfig: showEditConfigNodeDialog,
		validateNode: validateNode,
		updateNodeProperties: updateNodeProperties, // TODO: only exposed for edit-undo
		editing_node:editing_node
	}
})();
