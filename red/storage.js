/* public domain
 * vim: set ts=4:
 */

RED.storage = (function() {

	var dontSave = false;

	function update() {
		if (dontSave == true) return; // this prevents saves while applying settings
		 
		//RED.nodes.addClassTabsToPalette(); //Jannik
		//RED.nodes.refreshClassNodes(); //Jannik
		
		// TOOD: use setTimeout to limit the rate of changes?
		// (Jannik say that is not needed because it's better to save often, not to loose any changes)
		// it's only needed when we move objects with keyboard, 
		// but then the save timeOut should be at keyboard move function not here.
		// TODO: save when using keyboard to move nodes.
		
		if (localStorage)
		{
			var nns = RED.nodes.createCompleteNodeSet(true);
            var JSON_string = JSON.stringify(nns);
            localStorage.setItem("audio_library_guitool", JSON_string);
            RED.IndexedDBfiles.fileWrite("projects", RED.arduino.settings.ProjectName + ".json", JSON_string);
            //console.trace("localStorage write");
            RED.notify("<strong>Saved..</strong>", "success", null, 2000, 30);
		}
	}
	function allStorage() {

		var archive = [],
			keys = Object.keys(localStorage),
			i = 0, key;
	
		for (; key = keys[i]; i++) {
			archive.push( key + '=' + localStorage.getItem(key));
		}
	
		return archive;
	}
	function load() {

		//const t0 = performance.now();
		if (localStorage) {
			//console.warn(allStorage());
			var json_string = localStorage.getItem("audio_library_guitool");
			//console.log("localStorage read: " );//+ json_string);

			if (json_string != undefined && (json_string.trim().length != 0))
			{
				RED.nodes.import(json_string, false, true);
			}
			else
			{
				RED.nodes.createNewDefaultWorkspace();
			}
		}
		//const t1 = performance.now();
		//console.log('storage-load took: ' + (t1-t0) +' milliseconds.');
	}
    

	function loadContents(json_string) {
		console.log("loadContents:" +json_string);
		localStorage.setItem("audio_library_guitool", json_string);
		window.location.reload();
		
				
	}
	function clear() {
		// TOOD: use setTimeout to limit the rate of changes?
		if (localStorage)
		{
			localStorage.removeItem("audio_library_guitool");
			//console.log("localStorage write");
		}
	}

    
	return {
		get dontSave() { return dontSave; },
		set dontSave(state) { dontSave = state; },
		update: update,
		load: load,
		loadContents:loadContents, 
		clear: clear
	}
})();
