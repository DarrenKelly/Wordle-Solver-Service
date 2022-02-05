let domain="";
let rowCount = 1;
let selectedCell = 'A0101';

function getCellId(i, j){
  row = "" + i;
  row = row.padStart(2, "0")
  column = "" + j;
  column = column.padStart(2, "0")
  return "A" + row + column;
}


function postLetters(str, row) {
  for (let i = 1; i <= str.length; i++) {
    var cellId = getCellId(row, i);
    document.getElementById(cellId).innerHTML = str[i-1];
  }
}


function postSuggestion(str) {
  rowCount = rowCount + 1;
  addRowToHTML(rowCount);
  postLetters(str, rowCount);
}


function postCandidates(candidatesObj) {
  var toDisplay = ""
  for (i=0; i < candidates.length; i=i+1){
    toDisplay = toDisplay + candidates[i];
    if (i != candidates.length -1){
      toDisplay = toDisplay + ', ';
    }
    if (i % 9 == 0 && i > 0){
      toDisplay = toDisplay +'<br>';
    }
  }
  document.getElementById("remaining_words").innerHTML = toDisplay;
}


function postCandidateCount(count) {
  document.getElementById("remaining_word_count").innerHTML = count;
}


function addRowToHTML(newRowNumber) {
  var table=document.getElementById("guess_table");

  var row = table.insertRow(newRowNumber -1);
  for (let i = 1; i <= 5; i++) {
    var cell = row.insertCell(i-1);
    cell.className = "solvurdle__guess-box solvurdle__guess-box--input";
    cell.id = getCellId(newRowNumber,i);
    cell.addEventListener("click", onClick);
  }
}


function postResponses(responses) {
  var responseArray = []
  if (responses.includes(',')){
    responseArray = responses.split(',');
  } else {
    responseArray.push(responses);
  }
  revisedRowCount = responseArray.length;
  if(revisedRowCount > rowCount){
    addRowToHTML(revisedRowCount);
    rowCount = revisedRowCount;
  }
  for (var i = 0; i < rowCount; i++) {
    var responsePair = responseArray[i].split('=');
    var word = responsePair[0];
    var state = responsePair[1];
    for (let j = 1; j <= 5; j++) {
      cellId = getCellId(i+1,j);
      var element=document.getElementById(cellId);
      element.innerHTML = word[j-1];

      setExactState(element, state[j-1])
    }
  }
}

function setExactState(element, accuracy) {
  var newClass = " solvurdle__guess-box solvurdle__guess-box--input ";
  if (accuracy == "@") {
    newClass = newClass + "solvurdle__button--exact";
  } else if (accuracy == "O") {
    newClass = newClass + "solvurdle__button--inexact";
  }
  element.className = newClass;
}

function onNewLetter(l) {
  var element=document.getElementById(selectedCell);
  element.innerHTML = l;

  setExactState(element, 'X');

  selectedCellI = parseInt(selectedCell.slice(1,3));
  selectedCellJ = parseInt(selectedCell.slice(3,5));
  if (selectedCellJ == 5 && selectedCellI == rowCount){
    selectedCellI = 1;
    selectedCellJ = 1;
  } else if (selectedCellJ == 5 ){
    selectedCellI = selectedCellI + 1;
    selectedCellJ = 1;
  } else {
    selectedCellJ = selectedCellJ + 1;
  }

  selectedCell = getCellId(selectedCellI, selectedCellJ);
}

function onKeypress(e) {
  onNewLetter(`${e.code}`.slice(-1));
}


function onKeyboard(e) {
  onNewLetter(`${e.target.innerText}`);
}


function onClick() {
  selectedCell = this.id;
  var element=document.getElementById(selectedCell)
  var className = element.className;
  var newClass = " solvurdle__guess-box solvurdle__guess-box--input "

  if (!className.includes("exact")) {
  	newClass = newClass + "solvurdle__button--inexact"
  } else if (className.includes("-inexact")) {
    newClass = newClass + "solvurdle__button--exact"
  }
  element.className = newClass;
}


function processResponse(json){
  suggestion = json.suggestion;
  candidate_count = json.candidate_count;
  responses = json.responses;
  candidates = json.candidates;
  if (candidates == null) {
    candidates = [];
  }
  postCandidateCount(candidate_count);
  postResponses(responses);
  postCandidates(candidates);
  postSuggestion(suggestion);
}

function onSubmit(){
  site = domain + "/solve_wordle/5/"

  for (let i = 1; i <= rowCount; i++) {
    word = "";
    evaluation=""
    for (let j = 1; j <= 5; j++) {
      var cellId = getCellId(i,j);
      var element=document.getElementById(cellId)
      var className = element.className;
      var cellValue = element.innerHTML;

      word = word + cellValue;
      if (!className.includes("exact")) {
      	evaluation = evaluation + "X"
      } else if (className.includes("-inexact")) {
        evaluation = evaluation + "O"
      } else {
        evaluation = evaluation + "@"
      }
    }
    site = site + word + "=" + evaluation;
    if (i != rowCount) {
      site = site + "," ;
    }
  }

  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onload = function() {
    processResponse(JSON.parse(this.responseText));
  }
  xmlhttp.open("GET", site);
  xmlhttp.send();
}

function onLoad() {
  site = domain + "/solve_wordle/5"

  document.getElementById("A0101").addEventListener("click", onClick);
  document.getElementById("A0102").addEventListener("click", onClick);
  document.getElementById("A0103").addEventListener("click", onClick);
  document.getElementById("A0104").addEventListener("click", onClick);
  document.getElementById("A0105").addEventListener("click", onClick);

  document.onkeypress = onKeypress
  document.getElementById("solvurdle_submit_button").addEventListener("click", onSubmit);

  keys = document.getElementsByClassName("solvurdle__key");
  for (key of keys){
    key.addEventListener("click", onKeyboard);
  }

  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onload = function() {
    const suggestionObj = JSON.parse(this.responseText);
    suggestion = suggestionObj.suggestion;
    candidate_count = suggestionObj.candidate_count;
    responses = suggestionObj.responses;
    postLetters(suggestion, 1);
    postCandidateCount(candidate_count);
  }
  xmlhttp.open("GET", site);
  xmlhttp.send();
}
