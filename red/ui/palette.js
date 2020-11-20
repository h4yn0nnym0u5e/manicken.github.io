/**  Modified from original Node-Red source, for audio system visualization
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
 
RED.palette = (function() {

	var _settings = {
		categoryHeaderTextSize: 12,
		onlyShowOne: true,
	};

	var settings = {
		set categoryHeaderTextSize(size) { _settings.categoryHeaderTextSize = size; setCategoryHeaderTextSize(size); },
		get categoryHeaderTextSize() {return _settings.categoryHeaderTextSize;},
		set onlyShowOne(state) { _settings.onlyShowOne = state; },
		get onlyShowOne() { return _settings.onlyShowOne; },
	};

	var settingsCategoryTitle = "Palette";

	var settingsEditorLabels = {
		categoryHeaderTextSize: "Header Text Size",
		onlyShowOne: "Only show one category at a time.",
	};

	function setCategoryHeaderTextSize(size) // this is to make above "setter" cleaner
	{
		$(".palette-header").each( function(i,e) { $(e).attr("style", "font-size:" + size + "px");});
	}

	var exclusion = ['config','unknown','deprecated'];

	function createCategoryContainer(category, destContainer, expanded, isSubCat){ 
		console.warn("@createCategoryContainer category:" + category + ", destContainer:" + destContainer + ", isSubCat:" + isSubCat);
		var chevron = "";
		var displayStyle = "";
		if (!destContainer)	destContainer = "palette-container"; // failsafe
		var palette_category = "palette-category";
		
		var header = category;
		var palette_header_class = "palette-header";
		if (isSubCat)
		{
			displayStyle = "block";
			palette_category += "-sub-cat";
			header = header.substring(header.indexOf('-')+1);
			palette_header_class += "-sub-cat";
		}
		//else
		//{
			if (expanded == true)
			{
				chevron = '<i class="icon-chevron-down expanded"></i>';
				displayStyle = "block";
			}
			else
			{
				chevron = '<i class="icon-chevron-down"></i>';
				displayStyle = "none";
			}
		//}
		$("#" + destContainer).append('<div class="' + palette_category + '">'+
			'<div class="'+palette_header_class+'" id="header-'+category+'">'+chevron+'<span>'+header+'</span></div>'+
			'<div class="palette-content" id="palette-base-category-'+category+'" style="display: '+displayStyle+';">'+
			 // '<div id="palette-'+category+'-input" class="palette-sub-category"><div class="palette-sub-category-label">in</div></div>'+ // theese are never used
			 // '<div id="palette-'+category+'-output" class="palette-sub-category"><div class="palette-sub-category-label">out</div></div>'+ // theese are never used
			  //'<div id="palette-'+category+'-function"></div>'+
			 // '<div id="palette-'+category+'"></div>'+
			'</div>'+
			'</div>');
	}
	function doInit(categories)
	{
		for (var i = 0; i < categories.length; i++)
		{
			var cat = categories[i];
			createCategoryContainer(cat.name, "palette-container", cat.expanded, false); 
			setCategoryClickFunction(cat.name, "palette-container", "palette-header");
			if (cat.subcats != undefined)
				addSubCats("palette-base-category-" + cat.name , cat.name + "-", cat.subcats);
		}
		//setCategoryClickFunction('input');
		//setCategoryClickFunction('output');

	}
	function addSubCats(destContainer, catPreName, categories)
	{
		for (var i = 0; i < categories.length; i++)
		{
			createCategoryContainer(catPreName + categories[i],destContainer, false, true);
			setCategoryClickFunction(catPreName + categories[i], destContainer, "palette-header-sub-cat");
		}
	}

	function setCategoryClickFunction(category,destContainer, headerClass)
	{
		console.warn("@setCategoryClickFunction category:" +category + ", destContainer:" + destContainer + ", headerClass:" + headerClass);
		$("#header-"+category).off('click').on('click', function(e) {
			
			//console.log("onlyShowOne:" + _settings.onlyShowOne);
			var catContentElement = $(this).next();
			var displayStyle = catContentElement.css('display');
			if (displayStyle == "block")
			{
				catContentElement.slideUp();
				$(this).children("i").removeClass("expanded"); // chevron
			}
			else
			{

				if (/*!isSubCat(catContentElement.attr('id')) && */(_settings.onlyShowOne == true)) // don't run when collapsing sub cat
				{
					setShownStateForAll(false,destContainer, headerClass);
				}
				catContentElement.slideDown();
				$(this).children("i").addClass("expanded"); // chevron
			}
		});
	}
	function setShownStateForAll(state,container,headerClass)
	{
		console.warn("@setShownStateForAll container:" +container+ ", headerClass:"+headerClass);
		//var otherCat = $("#"+container);
		var otherCat = $("#"+container).find("." + headerClass);

		console.error(otherCat);
		for (var i = 0; i < otherCat.length; i++)
		{
			if (otherCat[i].id.startsWith("set-")){ continue; }// never collapse settings
			//console.warn("setShownStateForAll:" + otherCat[i].id);
			if (state)
			{
				$(otherCat[i]).next().slideDown();
				$(otherCat[i]).children("i").addClass("expanded");
			}
			else
			{
				$(otherCat[i]).next().slideUp();
				$(otherCat[i]).children("i").removeClass("expanded");
			}
		}
	}
	function isSubCat(id)
	{
		if (id.startsWith("palette-base-category-input-")) { return true; }
		if (id.startsWith("palette-base-category-output-")) { return true; }
		//console.warn(id + " is not subcat");
		return false;
	}
	//doInit(core);
	
	function clearCategory(category)
	{
		$("#palette-base-category-"+ category ).empty();
	}

	/**
	 * add new node type to the palette
	 * @param {*} nt  node type
	 * @param {*} def node type def
	 * 	 */
	function addNodeType(nt,def, category) { // externally RED.palettte.add
		//if (exclusion.indexOf(def.category)!=-1) return;
		var defCategory = "";
		if (!category)
		{
			category = def.category;
			//console.warn("add to " + category);
			defCategory = def.category + "";
		}
		else
		{
			//console.error("add to " + category);
			defCategory = category;// + "-function";
		}
		//console.warn("add addNodeType:@" + category + ":" + def.shortName);
		if ($("#palette_node_"+category +"_"+nt).length)	return;		// avoid duplicates

			var d = document.createElement("div");
			d.id = "palette_node_"+category +"_"+nt;
			d.type = nt;

			//var label = /^(.*?)([ -]in|[ -]out)?$/.exec(nt)[1];
			var label = (def.shortName) ? def.shortName : nt;

			d.innerHTML = '<div class="palette_label">'+label+"</div>";
			d.className="palette_node";// cat_" + category;
			if (def.icon) {
				d.style.backgroundImage = "url(icons/"+def.icon+")";
				if (def.align == "right") {
					d.style.backgroundPosition = "95% 50%";
				} else if (def.inputs > 0) {
					d.style.backgroundPosition = "10% 50%";
				}
			}
			
			d.style.backgroundColor = def.color;
			if (def.textColor != undefined)
			d.style.color = def.textColor;
			
			if (def.outputs > 0) {
				var portOut = document.createElement("div");
				portOut.className = "palette_port palette_port_output";
				d.appendChild(portOut);
			}

			var reqError = document.createElement("div");
			reqError.className = "palette_req_error hidden";

			d.appendChild(reqError);
			
			if (def.inputs > 0) {
				var portIn = document.createElement("div");
				portIn.className = "palette_port palette_port_input";
				d.appendChild(portIn);
			}
			
			if ($("#palette-base-category-"+category).length === 0){
				createCategoryContainer(category, "palette-container");
			}
			
			/*if ($("#palette-"+defCategory).length === 0) {          
				$("#palette-base-category-"+category).append('<div id="palette-'+defCategory+'"></div>');            
			}*/

			$("#palette-base-category-"+defCategory).append(d);
			//$("#palette-"+defCategory).append(d);
			d.onmousedown = function(e) { e.preventDefault(); };

			setTooltipContent('', nt, d);

		    $(d).click(function() {
			  	console.warn("palette node click:" + d.type);
				RED.nodes.selectNode(d.type);
			  	RED.sidebar.info.setHelpContent('', d.type);
		    });
		    $(d).draggable({
			   helper: 'clone',
			   appendTo: 'body',
			   revert: true,
			   revertDuration: 50,
			   start: function(e, ui)
			   {
				$(ui.helper).addClass("palette_node_drag");
			   }
		    });
		    
			//setCategoryClickFunction(category);
		
	}
	
	

	function setTooltipContent(prefix, key, elem) {
		// server test switched off - test purposes only
		var patt = new RegExp(/^[http|https]/);
		var server = false && patt.test(location.protocol);

		var options = {
			title: elem.type,
			placement: "right",
			trigger: "hover",
			delay: { show: 750, hide: 50 },
			html: true,
			container:'body',
			content : ""
		};

		if (!server) {
			data = $("script[data-help-name|='" + key + "']").html();
			var firstP = $("<div/>").append(data).children("div").first().html();
			options.content = firstP;
			$(elem).popover(options);
		} else {
			$.get( "resources/help/" + key + ".html", function( data ) {
				var firstP = $("<div/>").append(data).children("div").first().html();
				options.content = firstP;
				$(elem).popover(options);
			});
		}
	}
	
	function removeNodeType(type) {
		$("#palette_node_"+type).remove();
	}
	
	function filterChange() {
		var val = $("#palette-search-input").val();
		if (val === "") {
			$("#palette-search-clear").hide();
		} else {
			$("#palette-search-clear").show();
		}
		
		var re = new RegExp(val, "i");
		$(".palette_node").each(function(i,el) {
			var label = $(el).find(".palette_label").html(); // fixed this so that it searches for the label 
			if (val === "" || re.test(label))
				$(this).show();
			else
				$(this).hide();
		});
	}
	
	$("#palette-search-input").focus(function(e) {
		RED.keyboard.disable();
	});
	$("#palette-search-input").blur(function(e) {
		RED.keyboard.enable();
	});
	
	$("#palette-search-clear").on("click",function(e) {
		e.preventDefault();
		$("#palette-search-input").val("");
		filterChange();
		$("#palette-search-input").focus();
	});
	
	$("#palette-search-input").val("");
	$("#palette-search-input").on("keyup",function() {
		filterChange();
	});

	$("#palette-search-input").on("focus",function() {
		$("body").one("mousedown",function() {
			$("#palette-search-input").blur();
		});
	});
	
	return {
		settings:settings,
		settingsCategoryTitle:settingsCategoryTitle,
		settingsEditorLabels:settingsEditorLabels,
		doInit:doInit,
		add:addNodeType,
		clearCategory:clearCategory,
		remove:removeNodeType,
	};
})();
