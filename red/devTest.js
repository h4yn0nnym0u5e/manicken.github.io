/** Added in addition to original Node-Red source, for audio system visualization
 * this file is intended for testing new functionality that is in development
 * when the functions are completed they should be removed from this file 
 * and put at the right file.
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

RED.devTest = (function() {
    
    function console_logColor(data)
    {
        console.log('%c' + typeof data + " %c"+ data, 'background: #bada55; color: #555 ', 'background: #555; color: #bada55 ');
    }
    

    function createAndPrintNewWsStruct()
	{
		console.warn("new ws struct:");
        
        for (var wsi = 0; wsi < RED.nodes.workspaces.length; wsi++)
        {
            var ws = RED.nodes.workspaces[wsi];
            ws.nodes = new Array();
            for (var ni = 0; ni < RED.nodes.nodes.length; ni++)
            {
                var n = RED.nodes.nodes[ni];
                if (n.z == ws.id)
                {
                    ws.nodes.push(RED.nodes.convertNode(n));
                    //ws.nodes.push(n); // this is only to see structure of raw nodes
                }
            }            
        }
        
        console.warn(RED["arduino"]["export"]);
        console.warn(RED["view"].settings);
        
		var project1 = {}
		project1.settings = RED.settings.getAsJSONobj();
		project1.workspaces = RED.nodes.workspaces;
        // SAVE test
		var project_jsonString = JSON.stringify(project1, null, 4);
		RED.arduino.export.showExportDialog("New Project JSON Test", project_jsonString);

        // LOAD test
        var projectLoadTest = JSON.parse(project_jsonString);
        RED.settings.setFromJSONobj(projectLoadTest.settings);
    }

    function testGetHelpFromServer()
    {
        var url = "https://raw.githubusercontent.com/PaulStoffregen/Audio/master/gui/index.html";

        var jsonFile = new XMLHttpRequest();
            jsonFile.open("GET",url,true);
            jsonFile.send();

        jsonFile.onreadystatechange = function() {
            if (jsonFile.readyState== 4 && jsonFile.status == 200) {
                var mywindow = window.open('Audio System Design Tool for Teensy Audio Library', 'PRINT', 'height=400,width=600');
                var rawHtml = jsonFile.responseText;
                localStorage.setItem("audio_library_guitool_help",rawHtml);
                    
                mywindow.document.write('<html><head>');
                mywindow.document.write("Hello World")
                mywindow.document.write('</head><body >');
                mywindow.document.write('</body></html>');
                mywindow.document.close(); // necessary for IE >= 10
		        mywindow.focus();
            }
        }
        //RED.bottombar.info.addContent("imageExists:" + imageExists(""));

        checkImage("img/adccircuit_.png", function(){ alert("good"); }, function(){ alert("bad"); } );
    }
    function checkImage(imageSrc, good, bad) {
        var img = new Image();
        img.onload = good; 
        img.onerror = bad;
        img.src = imageSrc;
    }
    /* this neat thing can trace changes of a variable
        node._w = 100;
    
        Object.defineProperty(node, 'w', {
            set: function(value) { console.trace(); this._w = value;  },
            get: function() { console.trace(); return this._w; }
            })
    
    }*/

    return {
        createAndPrintNewWsStruct:createAndPrintNewWsStruct,
        testGetHelpFromServer:testGetHelpFromServer,
        console_logColor:console_logColor,
        
	};
})();