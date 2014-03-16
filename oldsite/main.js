/*
 * Author: Greg Zynda
 *
 * This work is licensed under the Creative Commons 
 * Attribution-NonCommercial-ShareAlike 4.0 International License. 
 * To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-nc-sa/4.0/deed.en_US.
*/

var rows = 9;
var cols = 29;

//var on = "#ADFF2F";
//var off = "#DCDCDC";

var black = "#1E1F1D";
var lGreen = "#D6E0C2";
var dGreen = "#91AA9D";
var lBlue = "#3E606F";
var dBlue = "#193441";

var on = "#99173C";
var off = "#555152";

var numEntries;
var entriesPerPage = 3;
var pageNum;

function tableCreate(){
	//var body=document.getElementsByTagName('body')[0];
	var bannerDiv = document.getElementById('banner');
	var tbl=document.createElement('table');
	tbl.setAttribute('id','lifeTable');
	tbl.setAttribute('border','0');
	tbl.setAttribute('cellspacing','2');
	tbl.setAttribute('cellpadding','0');
	tbl.setAttribute('align','center');
	for(var i=0;i<rows;i++){
		var tr=document.createElement('tr');
		for(var j=0;j<cols;j++){
			var td = document.createElement('td');
			tr.appendChild(td);
		}
		tbl.appendChild(tr);
	}
	bannerDiv.appendChild(tbl);
}

function makeMatrix(){
	var M = new Array(rows);
	for(var i=0; i<rows; i++) {
		M[i] = new Array(cols);
		for(var j = 0; j<cols; j++) {
			M[i][j] = 0;
		}
	}
	return M;
}

function updateTable(M){
	var lifeTable = document.getElementById("lifeTable");
	for(var i=0; i<rows; i++) {
		for(var j=0; j<cols; j++) {
			if(M[i][j] == 1) {
				lifeTable.rows[i].cells[j].style.backgroundColor = on;
			} else {
				lifeTable.rows[i].cells[j].style.backgroundColor = off;
			}
		}
	}
	lifeTable = null;
}

function populateMatrix(M){
	for(var i=0; i<rows; i++) {
		for(var j=0; j<cols; j++) {
			if(Math.random() > 0.7){
				M[i][j] = 1;
			}
		}
	}
}

function calcLiveNeighbors(M,i,j){
	var numLive = 0;
	var yMax = Math.min(rows-1,i+1);
	var yMin = Math.max(0,i-1);
	var xMax = Math.min(cols-1,j+1);
	var xMin = Math.max(0,j-1);
	for(var y=yMin; y<=yMax; y++) {
		for(var x=xMin; x<=xMax; x++) {
			if(y != i || x != j) {
				numLive += M[y][x];
			}
		}
	}
	return numLive;
}

function liveUpdate(liveNeighbors) {
	if(liveNeighbors == 2 || liveNeighbors == 3) {
		return 1;
	} else {
		return 0;
	}
}

function deadUpdate(liveNeighbors) {
	if(liveNeighbors == 3) {
		return 1;
	} else {
		return 0;
	}
}

function step(OldM, NewM){
	//var newMatrix = makeMatrix();
	for(var i=0; i<rows; i++) {
		for(var j=0; j<cols; j++) {
			var liveNeighbors = calcLiveNeighbors(OldM,i,j);
			if(OldM[i][j] == 1) {
				NewM[i][j] = liveUpdate(liveNeighbors);
			} else {
				NewM[i][j] = deadUpdate(liveNeighbors);
			}
		}
	}
}

function getUrlVars() { //makes a dictionary for URL parameters
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}

function writeEntries() {
	pageNum = parseInt(getUrlVars()["page"]);
	if(!pageNum) {
		pageNum = 1;
	}
	var pageBodyDiv = document.getElementById("pageBody");
	var atomXML = new XMLHttpRequest();
	atomXML.open("GET", "https://spreadsheets.google.com/feeds/cells/0At6CHNWr-J1FdEdoZzVzNE5OM0MwSDR0WXdKSG1COWc/od6/public/basic", false);
	atomXML.send();
	var atomDoc = atomXML.responseXML;
	var entries = atomDoc.getElementsByTagName("entry");
	//totalEntries = parseInt(atomDoc.getElementsByTagNameNS("http://a9.com/-/spec/opensearchrss/1.0/","totalResults")[0].childNodes[0].nodeValue)/3;
	numEntries = entries.length/3;
	for(var i=(pageNum-1)*entriesPerPage; i<Math.min(pageNum*entriesPerPage,numEntries); i++) {
		var entry=document.createElement('div');
		entry.setAttribute('id','Entry');
		//
		var title=document.createElement('div');
		title.setAttribute('class','Title');
		title.innerHTML = entries[3*i+0].getElementsByTagName("content")[0].childNodes[0].nodeValue;
		//
		var date=document.createElement('div');
		date.setAttribute('class','Date');
		date.innerHTML = entries[3*i+1].getElementsByTagName("content")[0].childNodes[0].nodeValue;
		//
		var body=document.createElement('div');
		body.setAttribute('class','Body');
		body.innerHTML = entries[3*i+2].getElementsByTagName("content")[0].childNodes[0].nodeValue;
		//
		entry.appendChild(title);
		entry.appendChild(body);
		entry.appendChild(date); //put date last
		pageBodyDiv.appendChild(entry);
	}
	makePageLinks()
}

function currentPage() {
	var curPage;
	var nav = document.getElementsByTagName("ul")[0];
	var urlArray = document.URL.split("/");
	var page = urlArray[urlArray.length-1].split("?")[0];
	page = page.split("#")[0];
	if(page == "index.html" || page == "") {
		curPage = nav.getElementsByTagName("a")[0];
	}
	if(page == "about.html") {
		curPage = nav.getElementsByTagName("a")[1];
	}
	curPage.style.pointerEvents="none";
	curPage.style.cursor="default";
	curPage.style.backgroundColor = "#555152";
}

function makePageLinks() {
	var numPages = Math.ceil(numEntries/entriesPerPage);
	var midStr = "";
	for(var i=0; i<numPages; i++) {
		if(pageNum-1 == i) {
			//midStr += " <span class='wBoxed'>"+(i+1)+"</span>";
			midStr += '<td bgcolor="#99173C">'+(i+1)+"</td>";
		} else {
			//midStr += " "+"<a href=index.html?page="+(i+1)+">"+(i+1)+"</a>";
			midStr += "<td><a href=index.html?page="+(i+1)+">"+(i+1)+"</a></td>";
		}
	}
	midStr += " ";
	var outStr = ""
	document.getElementById("links").innerHTML = midStr;
}

MatrixA = makeMatrix();
populateMatrix(MatrixA);
MatrixB = makeMatrix();

/*var converter = new Markdown.Converter();
var mdFile = new XMLHttpRequest();
//mdFile.open("GET", "file:///home/chronos/user/Downloads/website/test.md", false);
mdFile.open("GET", "test.md", false);
var textDiv = document.getElementById('textBody');
mdFile.send();
textDiv.innerHTML = coverter.makeHtml(mdFile.responseText);*/
