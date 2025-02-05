// for future extract of dialog stuff

RED.view.dialogs = (function() {
    function getForm(formId, key, callback) {
		// server test switched off - test purposes only
		var patt = new RegExp(/^[http|https]/);
		var server = false && patt.test(location.protocol);
		var form = $("<h2>No form found.</h2>");

		if (!server) {
			data = $("script[data-template-name|='" + key + "']").html();
			//console.log('%c' + typeof data + "%c"+ data, 'background: #bada55; color: #555 ', 'background: #555; color: #bada55 ');
			form = $("#" + formId);
			$(form).empty();
			$(form).append(data);
			if(typeof callback == 'function') {
				callback.call(this, form);
			}
		} else {
			var frmPlugin = "resources/form/" + key + ".html";
			$.get(frmPlugin, function(data) {
				form = $("#" + formId);
				$(form).empty();
				$(form).append(data);
				if(typeof callback == 'function') {
					callback.call(this, form);
				}
			});
		}

		return form;
	}

	$('#btn-import-json').click(function() {showImportNodesDialog(false);});
	$('#btn-import-arduino').click(function() {showImportNodesDialog(true);});
	$('#btn-export-clipboard').click(function() {showExportNodesDialog();});
	$('#btn-export-library').click(function() {showExportNodesLibraryDialog();});
    
	function showExportNodesDialog() {
		RED.editor.init_edit_dialog();
		RED.view.state = RED.state.EXPORT;
		var nns = RED.nodes.createExportableNodeSet(RED.view.moving_set);
		//$("#dialog-form").html(getForm("dialog-form", "export-clipboard-dialog"));
		var frm = getForm("dialog-form", "export-clipboard-dialog", function (d, f) {
			$("#node-input-export").val(JSON.stringify(nns)).focus(function() {
				var textarea = $(this);
				textarea.select();
				textarea.mouseup(function() {
						textarea.unbind("mouseup");
						return false;
				});
			}).focus();
		$( "#dialog" ).dialog("option","title","Export nodes to clipboard").dialog( "open" );
		});
	}

	function showExportNodesLibraryDialog() {
		RED.editor.init_edit_dialog();
		RED.view.state = RED.state.EXPORT;
		var nns = RED.nodes.createExportableNodeSet(RED.view.moving_set);
		//$("#dialog-form").html(this.getForm('export-library-dialog'));
		getForm("dialog-form", "export-library-dialog", function(d, f) {
		$("#node-input-filename").attr('nodes',JSON.stringify(nns));
		$( "#dialog" ).dialog("option","title","Export nodes to library").dialog( "open" );
		});
	}

	function showImportNodesDialog(is_arduino_code) {
		RED.editor.init_edit_dialog();
		$("#btnEditorRunScript").hide();
		$("#btnEditorApply").hide();
		RED.view.state = RED.state.IMPORT;
		//$("#dialog-form").html(this.getForm('import-dialog'));
		getForm("dialog-form", "import-dialog", function(d, f) {
		$("#node-input-import").val("");
		$( "#node-input-arduino" ).prop('checked', is_arduino_code);
		var title = "";
		if (is_arduino_code)
		{
			title = "Import Arduino Code";
			$("#node-input-import").prop('placeholder', "Paste Arduino Code here.");
			$("#import-dialog-textarea-label").text(" Code:");
		}			
		else
		{
			title = "Import JSON";
			$("#node-input-import").prop('placeholder', "Paste JSON string here.\nOr paste a http url to a JSON here.");
			$("#import-dialog-textarea-label").text(" JSON/URL:");
		}
			
		$( "#dialog" ).dialog("option","title",title).dialog( "open" );
		});
	}

	function showRenameWorkspaceDialog(id,workspace_tabs_count) {
		var ws = RED.nodes.workspace(id);
		$( "#node-dialog-rename-workspace" ).dialog("option","workspace",ws);

		if (workspace_tabs_count == 1) {
			$( "#node-dialog-rename-workspace").next().find(".leftButton")
				.prop('disabled',true)
				.addClass("ui-state-disabled");
		} else {
			$( "#node-dialog-rename-workspace").next().find(".leftButton")
				.prop('disabled',false)
				.removeClass("ui-state-disabled");
        }
        $( "#node-input-workspace-name" ).val(ws.label);
        $( "#node-input-workspace-id" ).val(ws.id);

        $( "#node-input-export-workspace" ).prop('checked',  ws.export);
        $("#node-input-generateCppDestructor-workspace").prop('checked', ws.generateCppDestructor);
        $("#node-input-workspace-extraClassDeclarations").val(ws.extraClassDeclarations);

        RED.main.SetPopOver("#node-input-workspace-extraClassDeclarations", "sets the extra class declarations <br> example (everything after the class name):<br>class ClassName final : Inheritance")

        RED.main.SetPopOver("#node-input-export-workspace-checkbox", "uncheck this if you don't want to export this workspace tab", "left");

        RED.main.SetPopOver("#node-input-export-isMain-settings", "This defines which file-name to use when exporting as main.", "left");
        RED.main.SetPopOver("#node-input-generateCppDestructor-workspace", "This autogenerates the C++ destructor function that will disconnect and destroy all AudioConnections", "left");
        $( "#node-input-export-isMain" ).prop('checked',  ws.isMain);
        $( "#node-input-export-isAudioMain" ).prop('checked',  ws.isAudioMain);
        chk_exportIsMain_OnClick();

        var otherMain = getOtherMain(ws)
        if (otherMain == undefined){
            $( "#node-input-export-isMain" ).prop('disabled' , false);
            RED.main.SetPopOver("#node-input-export-isMain-checkbox", "when checked this defines the <b>main</b> c++/ino file.<br><br>note. If <b>Audio Objects</b> (any object that have any IO)<br>exists in the main they will be ignored by the export,<br>however <b>control</b> nodes will be exported.<br><br>note. there can only be one <b>main</b> in the project", "left");
            $( "#node-input-export-isMain" ).click(chk_exportIsMain_OnClick);
            $( "#node-input-export-mainNameType" ).val(ws.mainNameType);
            $( "#node-input-export-mainNameExt" ).val(ws.mainNameExt);
            
        }
        else {
            $( "#node-input-export-isMain" ).prop('disabled' , true);
            RED.main.SetPopOver("#node-input-export-isMain-checkbox", otherMain + "<br>is allready defined as the 'Main File'", "left");
        }

        //var otherAudioMain = getOtherAudioMain(ws);
        //if (otherAudioMain == undefined){
            $( "#node-input-export-isAudioMain" ).prop('disabled' , false);
            RED.main.SetPopOver("#node-input-export-isAudioMain-checkbox", "when checked this defines the <b>Audio Main Entry</b>.<br>(currently only used by <b>OSC group export</b>)<br><br>note. if multiple audio main:s are set only the first one are used", "left");
        //    $( "#node-input-export-isAudioMain" ).click(chk_exportIsMain_OnClick);
            
        /*}
        else {
            console.error("this happen");
            $( "#node-input-export-isAudioMain" ).prop('disabled' , true);
            RED.main.SetPopOver("#node-input-export-isAudioMain-checkbox", otherAudioMain + "<br>is allready defined as the 'Audio Main File'", "left");
        }*/

		$( "#node-dialog-rename-workspace" ).dialog("open");
    }
    
    function chk_exportIsMain_OnClick() {
        // Get the checkbox
        var isMainChk = document.getElementById("node-input-export-isMain");
        var isMainSettings = document.getElementById("node-input-export-isMain-settings");
        if (isMainChk.checked == true)
            isMainSettings.style.display = "table-row";
        else
            isMainSettings.style.display = "none";
    }
    function getOtherMain(ws)
    {
        for (var i = 0; i < RED.nodes.workspaces.length; i++)
        {
            if (RED.nodes.workspaces[i] == ws) continue;

            if (RED.nodes.workspaces[i].isMain == true)
            {
                //RED.notify("<strong>Warning</strong> "+RED.nodes.workspaces[i].label  + " is allready defined as the main file.<br> there can only be one main file,<br>If you want this to be the new main first you have to uncheck the 'Main File' of " + RED.nodes.workspaces[i].label,"warning");
                return RED.nodes.workspaces[i].label;
            }
        }
        return undefined;
    }
    function getOtherAudioMain(ws)
    {
        for (var i = 0; i < RED.nodes.workspaces.length; i++)
        {
            if (RED.nodes.workspaces[i] == ws) continue;

            if (RED.nodes.workspaces[i].isAudioMain == true)
            {
                //RED.notify("<strong>Warning</strong> "+RED.nodes.workspaces[i].label  + " is allready defined as the main file.<br> there can only be one main file,<br>If you want this to be the new main first you have to uncheck the 'Main File' of " + RED.nodes.workspaces[i].label,"warning");
                return RED.nodes.workspaces[i].label;
            }
        }
        return undefined;
    }

	$("#node-dialog-rename-workspace form" ).submit(function(e) { e.preventDefault();});
	$( "#node-dialog-rename-workspace" ).dialog({
		modal: true,
		autoOpen: false,
		width: 500,
		title: "Workspace/Tab properties",
		buttons: [
			{
				class: 'leftButton',
				text: "Delete",
				click: function() {
					var workspace = $(this).dialog('option','workspace');
					$( this ).dialog( "close" );
					RED.view.deleteWorkspace(workspace.id);
				}
			},
			{
				text: "Ok",
				click: function() {
					var workspace = $(this).dialog('option','workspace');
					
                    var exportNew = $( "#node-input-export-workspace" ).prop('checked')
                    // TODO proper changed check
                    workspace.generateCppDestructor = $("#node-input-generateCppDestructor-workspace").prop('checked');
                    workspace.extraClassDeclarations = $("#node-input-workspace-extraClassDeclarations").val();
                    workspace.isMain = $( "#node-input-export-isMain" ).prop('checked');
                    workspace.isAudioMain = $( "#node-input-export-isAudioMain" ).prop('checked');
                    workspace.mainNameType = $( "#node-input-export-mainNameType" ).val();
                    workspace.mainNameExt = $( "#node-input-export-mainNameExt" ).val();
					if (workspace.export != exportNew)
					{
						workspace.export = exportNew;
                        if (exportNew == true)
                            RED.workspaces.enable(workspace.id);
                        else
                            RED.workspaces.disable(workspace.id);
					}
                    //console.warn("exportWorkspace:"+workspace.export);

                    var label = $( "#node-input-workspace-name" ).val();
                    if (workspace.label != label) {

                        if (label.trim().length == 0) // Jannik add
						{
							RED.notify("<strong>Warning</strong>:<br>Name cannot be empty,<br>please enter a name.","warning");
							return; // abort name change 
                        }
						if (RED.nodes.workspaceNameCheck(label)) // Jannik add
						{
							RED.notify("<strong>Warning</strong>:<br>Name:"+label + " allready exist,<br>choose annother name.","warning");
							return; // abort name change if name allready exist
                        }
                        if (RED.nodes.getType(label) != undefined) // Jannik add
						{
                            RED.notify("<strong>Warning</strong>:<br>Name:"+label + " Is the name of a Existing object type,<br>choose annother name.","warning");
							return; // abort name change if name allready exist
                        }
                        if (label.endsWith(".")) // Jannik add
						{
							RED.notify("<strong>Warning</strong>:<br>Cannot use dots in the end of the name,<br>choose annother name.","warning");
							return; // abort name change 
                        }
                        var isUpperCase = (label[0] >= 'A' && label[0] <= 'Z');
                        //var isLowerCase = (label[0] >= 'a' && label[0] <= 'z') && (RED.main.settings.AllowLowerCaseWorkspaceName == false);
                        //var isLetter = (isUpperCase == true) && (isLowerCase == true);
                        if (isUpperCase == false) // Jannik add
						{
							RED.notify("<strong>Warning</strong>:<br>Name should begin with a Uppercase letter A-Z,<br>choose annother name.","warning");
                            if ((label[0] >= 'a' && label[0] <= 'z')) {// only change if first is a letter 
                                label = label[0].toUpperCase() + label.substring(1);
                                $( "#node-input-workspace-name" ).val(label);
                            }
							return; // abort name change 
                        }
  
                        if (isValidIdentifierName(label) == false)
                        {
                            RED.notify("<strong>Warning</strong>:<br>Cannot use this name because it contains invalid characters,<br>choose annother name.","warning");
							return; // abort name change 
                        }
                        
						
						RED.view.dirty(true);
						var oldLabel = workspace.label;
						workspace.label = label;
						//RED.nodes.workspaceNameChanged(oldLabel, label); // no need anymore RED.events take care of it now
                        RED.events.emit("flows:renamed", oldLabel, label);
						

						// update the tab text
						var link = $("#workspace-tabs a[href='#"+workspace.id+"']");
						link.attr("title",label);
						link.text(label);
						// update the menu item text
						var menuItem = $("#workspace-menu-list a[href='#"+workspace.id+"']");
						menuItem.attr("title",label);
						menuItem.text(label);

                        RED.view.workspace_tabs.resize(); // internally it's updateTabWidths
                        
                        
					}
                    RED.events.emit("flows:change",workspace);

                    RED.storage.update();

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
		open: function(e) {
			RED.keyboard.disable();
		},
		close: function(e) {
			RED.keyboard.enable();
		}
	});
	$( "#node-dialog-delete-workspace" ).dialog({
		modal: true,
		autoOpen: false,
		width: 500,
		title: "Confirm delete",
		buttons: [
			{
				text: "Ok",
				click: function() {
					var workspace = $(this).dialog('option','workspace');
					RED.view.removeWorkspace(workspace);
					var historyEvent = RED.nodes.removeWorkspace(workspace.id);
					historyEvent.t = 'delete';
					historyEvent.dirty = RED.view.dirty();
					historyEvent.workspace = workspace;
					RED.history.push(historyEvent);
					RED.view.dirty(true);
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
		open: function(e) {
			RED.keyboard.disable();
		},
		close: function(e) {
			RED.keyboard.enable();
		}

	});

    function showExportDialog(title, text, textareaLabel,overrides,okPressedCb) {
        if (overrides == undefined) var overrides = {};
        if (overrides.okText == undefined) overrides.okText = "Ok";

        var box = document.querySelector('.ui-droppable'); // to get window size
        function float2int(value) {
            return value | 0;
        }
        RED.view.state = RED.state.EXPORT;
        var t2 = performance.now();
        RED.view.dialogs.getForm('dialog-form', 'export-clipboard-dialog', function (d, f) {
            if (textareaLabel != undefined)
                $("#export-clipboard-dialog-textarea-label").text(textareaLabel);
                if (overrides.tips != undefined)
                    $("#export-clipboard-dialog-tips").text(overrides.tips);
            $("#node-input-export").val(text).focus(function () {
                var textarea = $(this);

                //textarea.select();
                //console.error(textarea.height());
                var textareaNewHeight = float2int((box.clientHeight - 220) / 20) * 20;// 20 is the calculated text line height @ 12px textsize, 220 is the offset
                textarea.height(textareaNewHeight);

                textarea.mouseup(function () {
                    textarea.unbind("mouseup");
                    return false;
                });
            }).focus();



            //console.warn(".ui-droppable.box.clientHeight:"+ box.clientHeight);
            //$( "#dialog" ).dialog("option","title","Export to Arduino").dialog( "open" );
            $("#dialog").dialog({
                title: title,
                width: box.clientWidth * 0.60, // setting the size of dialog takes ~170mS
                height: box.clientHeight,
                buttons: [
                    {
                        text: overrides.okText,
                        click: function () {
                            RED.console_ok("Export dialog OK pressed!");
                            $(this).dialog("close");
                            if (okPressedCb != undefined)
                                okPressedCb();
                        }
                    },
                    {
                        text: "Cancel",
                        click: function () {
                            RED.console_ok("Export dialog Cancel pressed!");
                            $(this).dialog("close");
                        }
                    }
                ],
            }).dialog("open");

        });
        //RED.view.dirty(false);
        const t3 = performance.now();
        console.log('arduino-export-save-show-dialog took: ' + (t3 - t2) + ' milliseconds.');
    }

    return {
        getOtherMain,
        getForm,
        showExportDialog,
        showExportNodesDialog,
        showExportNodesLibraryDialog,
        showImportNodesDialog,
        showRenameWorkspaceDialog
        

    };
})();