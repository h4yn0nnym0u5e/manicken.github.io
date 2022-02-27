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
RED.arduino = (function() {
	var serverIsActive = false;
	
    var defSettings = {
        ZipExportUseSubFolder: false,
        ZipExportCompress: true,
        UseAudioMixerTemplate: false,
		UseVariableMixers: true,
        useExportDialog: false,
		IOcheckAtExport: true,
		WriteJSONtoExportedFile: true,
		WebServerPort: 8080,
		WebSocketServerPort: 3000,
        ProjectName: "TeensyAudioDesign",
        Board: {},
		CodeIndentations: 4,
		StandardIncludeHeader: "#include <Arduino.h>\n"
							  +	"#include <Audio.h>\n"
							  + "#include <Wire.h>\n"
							  + "#include <SPI.h>\n"
							  + "#include <SD.h>\n"
                              + "#include <SerialFlash.h>\n",
                              
                
    }
    // Object.assign({}, ) is used to ensure that the defSettings is not overwritten
	var _settings = {
        ZipExportUseSubFolder:defSettings.ZipExportUseSubFolder,
        ZipExportCompress:defSettings.ZipExportCompress,
        UseAudioMixerTemplate: defSettings.UseAudioMixerTemplate,
		UseVariableMixers: defSettings.UseVariableMixers,
		useExportDialog: defSettings.useExportDialog,
		IOcheckAtExport: defSettings.IOcheckAtExport,
		WriteJSONtoExportedFile: defSettings.WriteJSONtoExportedFile,
		WebServerPort: defSettings.WebServerPort,
		WebSocketServerPort: defSettings.WebSocketServerPort,
        ProjectName: defSettings.ProjectName,
        Board: {Platform: "", Board: "", Options: ""},
        
		CodeIndentations: defSettings.CodeIndentations,
		StandardIncludeHeader: defSettings.StandardIncludeHeader,
    }
    var boardSettings = { 
        get Platform() { return _settings.Board.Platform; },
        set Platform(value) { _settings.Board.Platform = value; RED.arduino.board.readFromIndexedDB(); RED.storage.update(); },

        get Board() { return _settings.Board.Board; },
        set Board(value) { _settings.Board.Board = value; RED.arduino.board.boardSelected(); RED.storage.update(); },

        get Options() { return _settings.Board.Options; },
        set Options(value) { _settings.Board.Options = value;  RED.storage.update(); },
        /*
        //  theese are only for the development demo
        // and are autogenerated depending on wich platform and board that is selected
        get UsbType() { return _settings.Board.UsbType; },
        set UsbType(value) { _settings.Board.UsbType = value; RED.storage.update();},

        get CpuSpeed() { return _settings.Board.CpuSpeed; },
        set CpuSpeed(value) { _settings.Board.CpuSpeed = value; RED.storage.update();},

        get Optimize() { return _settings.Board.Optimize; },
        set Optimize(value) { _settings.Board.Optimize = value; RED.storage.update();},

        get Keyboard() { return _settings.Board.Keyboard; },
        set Keyboard(value) { _settings.Board.Keyboard = value; RED.storage.update(); },
        */
    }
	var settings = {
        get UseAudioMixerTemplate() { return _settings.UseAudioMixerTemplate; },
		set UseAudioMixerTemplate(state) { _settings.UseAudioMixerTemplate = state; RED.storage.update();},

        get UseVariableMixers() { return _settings.UseVariableMixers; },
		set UseVariableMixers(state) { _settings.UseVariableMixers = state; RED.storage.update();},

        get ZipExportUseSubFolder() { return _settings.ZipExportUseSubFolder; },
		set ZipExportUseSubFolder(state) { _settings.ZipExportUseSubFolder = state; RED.storage.update();},

        get ZipExportCompress() { return _settings.ZipExportCompress; },
		set ZipExportCompress(state) { _settings.ZipExportCompress = state; RED.storage.update();},

		get useExportDialog() { return _settings.useExportDialog; },
		set useExportDialog(state) { _settings.useExportDialog = state; RED.storage.update();},

		get IOcheckAtExport() { return _settings.IOcheckAtExport; },
		set IOcheckAtExport(state) { _settings.IOcheckAtExport = state; RED.storage.update();},

		get WriteJSONtoExportedFile() { return _settings.WriteJSONtoExportedFile; },
		set WriteJSONtoExportedFile(state) { _settings.WriteJSONtoExportedFile = state; RED.storage.update();},

		get WebServerPort() { return parseInt(_settings.WebServerPort); },
		set WebServerPort(value) { _settings.WebServerPort = parseInt(value);RED.storage.update(); },

		get WebSocketServerPort() { return parseInt(_settings.WebSocketServerPort); },
		set WebSocketServerPort(value) { _settings.WebSocketServerPort = parseInt(value); StartWebSocketTerminal_Connection(); RED.storage.update();},

		get ProjectName() { return _settings.ProjectName; },
		set ProjectName(value) { _settings.ProjectName = value;  RED.storage.update(); RED.main.updateProjectsMenu();},

		get CodeIndentations() { return parseInt(_settings.CodeIndentations); },
		set CodeIndentations(value) { _settings.CodeIndentations = parseInt(value); RED.storage.update();},

		get StandardIncludeHeader() { return _settings.StandardIncludeHeader; },
        set StandardIncludeHeader(value) { _settings.StandardIncludeHeader = value; RED.storage.update();},

        get Board() { return boardSettings; },
        set Board(value) { boardSettings = value; console.error(" set boardSettings(value)");},

	};

	var settingsCategory = { label:"Teensy/C++", expanded:false, popupText: "Currently only Teensy/C++ Export Settings", bgColor:"#E6E0F8", headerBgColor:"#D0E0FF", headerTextColor:"#000", menuItems:[{label:"saveSettingsEditorAsJson",iconClass:"fa fa-copy", action:saveSettingsEditorAsJson}] };

	var settingsEditor = {
		export: {label:"Export", expanded:true, bgColor:"#D0E0FF",
			items: {
                ProjectName:             { label:"Project Name", type:"string", popupText: "Project Name is used as the default file names for zip-file export and JSON-save to file.<br>"+
																						"It's also used at the default savename for the autosave function,<br>when replacing the whole design with a template design.<br>"+
																						"<br>When naming a tab with  [ProjectName].ino (not including the []),<br>that defines it's the main ino-file when it's exported to Arduino IDE."},
                ZipExportUseSubFolder:         { label:"Zip file subfolder", type:"boolean", popupText:"When exporting as zip,<br> if this is checked then the files in the zip will be put into a sub folder,<br> this is intended for complete Arduino Sketch exports."},
                ZipExportCompress:         { label:"compress Zip file", type:"boolean", popupText:"Whenever to compress the exported zip file, a uncompressed file should generate faster<br> but timing tests show that the times are almost the same."},
                
                board: {label:"Board settings", expanded:true, bgColor:"#E6E0F8", 
                    items: {
                        "Board.Platform":           { label:"Platform", type:"combobox", actionOnChange:true, options:["teensy", "arduino", "esp8266", "esp32", "stm32f1", "stm32f4"], optionTexts:["Teensy", "Arduino", "ESP8266 series", "ESP32 series", "STM32F1 series", "STM32F4 series"], popupText:"Note. Teensy is the only platform that have support for the Audio Nodes,<br><br> to use this functionality,<br> first the different board files needs to 'imported' into the tool,<br>the files are then stored into the browser indexedDB<br>so that they can be easly read when the tool starts." },
                        importBoardsFile:        { label:"Import Boards File", type:"button", isFileInput:true, buttonClass:"btn-primary btn-sm", action: importBoardFileCurrentPlatform, popupText:"import the boards.txt required by the selected platform,<br>this is only needed to be done the first time the tool is started<br>as the imported file is saved to the browser IndexedDB<br><br>but there will be default embedded boards files for Teensy 1.54-beta5, Arduino 1.8.13 and ESP8266 ver2.7.4<br>bu they will not be maintained and also is maybe imcompatible with the installed versions<br><br>this function needs a platform manager as there is many platforms"},
                        "Board.Board":           { label:"Board", type:"combobox", actionOnChange:true, options:["teensy30", "teensy40", "teensy41"], optionTexts:["Teensy 3.0", "Teensy 4.0", "Teensy 4.1"] },
                        options: {label:"Options", expanded:true, bgColor:"#E6E0F8", 
                            items: {
                                /* 
                                // theese are only for the development demo
                                // and are autogenerated depending on wich platform and board that is selected
                                "Board.UsbType":         { label:"USB Type", type:"combobox", actionOnChange:true, options:["Serial", "Midi"], popupText: "this is just a demo and have no functionality" },
                                "Board.CpuSpeed":        { label:"CPU Speed", type:"combobox", actionOnChange:true, options:["600", "500"] , popupText: "this is just a demo and have no functionality"},
                                "Board.Optimize":        { label:"Optimize", type:"combobox", actionOnChange:true, options:["o2std", "osstd"], optionTexts:["Faster", "Smallest Code"], popupText: "this is just a demo and have no functionality"},
                                "Board.Keyboard":        { label:"Keyboard Layout", type:"combobox", actionOnChange:true, popupText: "this is just a demo and have no functionality"},
                                */
                            },
                        },
                    },
                },
                StandardIncludeHeader:   { label:"Global Includes", type:"multiline", useAceEditor:true,aceEditorMode:"c_cpp", popupText: "Here is the global export includes<br>This text is included at the top of every autogenerated code-file"},
                servers: {label:"Server settings", expanded:false, bgColor:"#E6E0F8", 
                    items: {
                        WebServerPort:           { label:"Web Server Port", type:"number"},
				        WebSocketServerPort:     { label:"Terminal Capture Web Socket Server Port", type:"number"},
                    },
                },
                otherSettings: {label:"Other settings", expanded:false, bgColor:"#E6E0F8", 
                    items: {
                        UseAudioMixerTemplate:   { label:"Use C++ Template Mixer (obsolete)", type:"boolean", popupText: "This functionality is now obsolete<br>as the Tool now generates the needed code for the different mixer variants.<br>The template based mixer had some issues and sometimes did not work."},
                        UseVariableMixers:   	 { label:"Use built in variable-width mixers", type:"boolean", popupText: "Assume Audio library provides<br>variable-width mono<br>and stereo mixers"},
                        useExportDialog:         { label:"Force Show export dialog", type:"boolean"},
                        IOcheckAtExport:         { label:"IO check At Export", type:"boolean"},
                        WriteJSONtoExportedFile: { label:"Write JSON at exported file", type:"boolean"},
                        
                        CodeIndentations:        { label:"export code indentations", type:"number", popupText: "Defines the 'base' number of indentations that is used when exporting to class structure."},
                    },
                },
			}
		},
		
    };

    function importBoardFileCurrentPlatform(e)
    {
        for (var fi = 0; fi < e.target.files.length; fi++) {
            var file = e.target.files[fi];
            if (!file) { return; }
            console.warn("uploadBoardFileCurrentPlatform", file);
            var reader = new FileReader();
            reader.onload = function(e) {
            var contents = e.target.result;
            console.warn(settings.Board.Platform + "." + file.name);
            RED.arduino.board.writeToIndexedDB(settings.Board.Platform + "." + file.name, contents);
            };
            reader.readAsText(file);
        }
    }
    
    function saveSettingsEditorAsJson() {
        RED.main.download("arduino.settingsEditor.json", JSON.stringify(settingsEditor, null, 4));
    }

	function startConnectedChecker()
	{
		checkIfServerIsActive(); // run once first
		window.setInterval(function () {
			checkIfServerIsActive();
	    }, 10000);
	}
	function checkIfServerIsActive()
	{
		httpGetAsync("cmd=ping", 
			function(rt) {
				serverIsActive = true;
				//console.log("serverIsActive" + rt);
			},
			function(st) {
				serverIsActive = false;
				//console.log("serverIsNotActive" + st);
			});
	}

    function httpPostAsync(data)
	{
		const t0 = performance.now();
		var xhr = new XMLHttpRequest();
		//console.warn("httpPostAsync:" + data);
		const url = 'http://localhost:' + settings.WebServerPort;
		xhr.open("POST", url, true);
		xhr.onloadend = function () {
			console.warn("response:" + xhr.responseText);
			const t1 = performance.now();
			console.log('httpPostAsync took: ' + (t1-t0) +' milliseconds.');
		  };
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.timeout = 2000;
		xhr.send(data); 
	}
	function httpGetAsync(queryString, cbOnOk, cbOnError, timeout)
	{
		var xmlHttp = new XMLHttpRequest();
		const url = 'http://localhost:' + settings.WebServerPort;
		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState != 4) return; // wait for timeout or response
			if (xmlHttp.status == 200)
			{
				if (cbOnOk != undefined)
					cbOnOk(xmlHttp.responseText);
				else
					console.warn(cbOnOk + "response @ " + queryString + ":\n" + xmlHttp.responseText);
			}
			else if (cbOnError != undefined)
				cbOnError(xmlHttp.status);
			else
				console.warn(queryString + " did not response = " + xmlHttp.status);
		};
		xmlHttp.open("GET", url + "?" + queryString, true); // true for asynchronous 
        if (timeout != undefined)
		    xmlHttp.timeout = timeout;
        else
            xmlHttp.timeout = 2000;
		xmlHttp.send(null);
	}

	var wsClientTerminal;
    function StartWebSocketTerminal_Connection()
    {
		if (!('WebSocket' in window)){ console.error('Upgrade your browser. This Browser is NOT supported WebSocket (used by terminal capture)'); return;}

		if (wsClientTerminal != null)
			wsClientTerminal.close();
		wsClientTerminal = new WebSocket("ws://127.0.0.1:" + settings.WebSocketServerPort);
		wsClientTerminal.onmessage = function (msg) {
			if (msg.data == 'reload') window.location.reload();
			else
			{
				//console.log(msg.data);
				RED.bottombar.show('output'); // '<span style="color:#000">black<span style="color:#AAA">white</span></span>' + 
				var dataToAdd = msg.data.replace('style="color:#FFF"', 'style="color:#000"');//.replace("[CR][LF]", "<br>").replace("[CR]", "<br>").replace("[LF]", "<br>");
				//console.warn(dataToAdd);
				RED.bottombar.info.addContent(dataToAdd);
			}
		};
		wsClientTerminal.onopen = function (ev) {
			RED.bottombar.info.setContent("");
		};
	}
	

    $('#btn-verify-compile').click(function() {RED.bottombar.info.setContent(""); httpGetAsync("cmd=compile"); });
	$('#btn-compile-upload').click(function() {RED.bottombar.info.setContent(""); httpGetAsync("cmd=upload"); });
	//$('#btn-get-design-json').click(function() { httpGetAsync("cmd=getFile&fileName=GUI_TOOL.json", GetGUI_TOOL_JSON_response,NOtresponse); });
	$('#btn-get-design-json').click(function() { httpGetAsync("cmd=getFile&fileName=GUI_TOOL.json", GetGUI_TOOL_JSON_response,NOtresponse); });
	function GetGUI_TOOL_JSON_response(responseText) { RED.storage.loadContents(responseText); }
	function NOtresponse(text) {console.log("GetGUI_TOOL_JSON_ not response"); }
    
    return {
        defSettings:defSettings,
		settings:settings,
		settingsCategory:settingsCategory,
        settingsEditor:settingsEditor,
        
        serverIsActive: function() { return serverIsActive;},
		startConnectedChecker:startConnectedChecker,
		httpPostAsync:httpPostAsync,
		httpGetAsync:httpGetAsync,
		StartWebSocketConnection:StartWebSocketTerminal_Connection,
	};
})();