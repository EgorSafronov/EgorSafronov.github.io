const INTERVAL = 5; //интервал обновления анимации
const TIME_FOR_MEANING = 700; //время между двумя действиями при анимации, ms

const CELL_INSIDE_COLOR = "#00FF00"; //цвет заливки ячейки
const CELL_BORDER_COLOR = "#000000"; //цвет границы ячейки
const TEXT_COLOR = "#000000"; //цвет текста
const BACKGROUND_COLOR = "#FFFFE0"; //цвет фона
// F5FFFA
const TEXT_FONT = "14pt Arial"; //стиль текста

const SPEED = 0.2; //скорость передвижения вершины при factor=1, px/ms

//расположение первого элемента массива
const INITIAL_X = 50;
const INITIAL_Y = 50;

const LEVEL_DIFF = 60; //расстояние между уровнями (начальный уровень, уровень, где элементы сравниваются друг с другом и
// уровень, из которого элементы попадают на сравнение)
const EPS = 3;

const CELL_INDENT = 60; //расстоние между элементами массива
const CELL_RADIUS = 17; //радиус вершины
const MAX_OF_CELL = 16; //лимит вершин
/*холст*/
let canvas = document.getElementById("myCanvas");
let context = canvas.getContext('2d');

let factor = 1; //множитель для скорости

let isPause = false;
let isStarted = false;

let cells = [],
    initCells;

let actions = [],
    actionsInd = -1; // события

/*Создание ячеек*/
//x, y - координаты центра ячейки (Number), value - значение (Number)
function Cell(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
}
//отображение одной ячейки на canvas
Cell.prototype.display = function() {
    context.beginPath();
    context.fillStyle = CELL_INSIDE_COLOR;
    context.lineWidth = 2;
    context.arc(this.x, this.y, CELL_RADIUS, 0, 2 * Math.PI, true);
    context.fill();
    context.beginPath();
    context.arc(this.x, this.y, CELL_RADIUS, 0, 2 * Math.PI, true);
    context.strokeStyle = CELL_BORDER_COLOR;
    context.stroke();
    displayText(this.value, this.x, this.y)
};

//функция отображающая text (String) по координатам x, y (Number)
function displayText(text, x, y) {
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = TEXT_FONT;
    context.fillStyle = TEXT_COLOR;
    context.fillText(text, x, y);
}

/*Рассчитываем расстояние*/
//x1, y1, x2, y2 - кооринаты двух точек (Number)

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

//проверяет, находится ли ячейка в заданной точке
//x, y - координаты точки (Number), c - ячейка (Cell)
function isCellOnPlace(c, x, y) {
    return distance(x, y, c.x, c.y) <= EPS;
}

//Таймаут для нового действия
function nextAction() {
    let oldTime = Date.now(),
        time = oldTime;
    let timer = setInterval(function() {
        if (!isStarted) {
            clearInterval(timer);
            return;
        }
        if (time - oldTime >= TIME_FOR_MEANING) {
            clearInterval(timer);
            if (actionsInd + 1 < actions.length) {
                actions[++actionsInd].doIt();
            }
        }
        time += INTERVAL * factor;
    }, INTERVAL);
}

//при вызове отображает все элементы
function displayElements() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
    cells.forEach(function(q) {
        q.display();
    });
}

//событие, смещающее элементы массива cells с indBegin по indEnd вниз на 2 * LEVEL_DIFF px
function MovingCellsDown(indBegin, indEnd) {
    this.first = indBegin;
    this.second = indEnd;
}

MovingCellsDown.prototype.doIt = function() {
    displayElements();
    let tmp = cells.slice(this.first, this.second);
    let animation = setInterval(function() {
        if (!isStarted) {
            clearInterval(animation);
            return;
        }
        if (isCellOnPlace(tmp[0], tmp[0].x, INITIAL_Y + LEVEL_DIFF * 2)) {
            clearInterval(animation);
            displayElements();
            nextAction();
            return;
        }
        tmp.forEach(function(c) {
            c.y += factor * SPEED * INTERVAL;
        });
        displayElements();
    }, INTERVAL);
};

//событие перемещает указанную ячейку cell (Cell) на точку x, y (Number)
function MovingCell(cell, x, y) {
    this.cell = cell;
    this.x = x;
    this.y = y;
}

MovingCell.prototype.doIt = function() {
    displayElements();
    let tmp = this.cell;
    let x = this.x,
        y = this.y;
    let animation = setInterval(function() {
        if (!isStarted) {
            clearInterval(animation);
            return;
        }
        if (isCellOnPlace(tmp, x, y)) {
            clearInterval(animation);
            displayElements();
            nextAction();
            return;
        }
        let angle = Math.atan2(x - tmp.x, y - tmp.y);
        let r = INTERVAL * SPEED * factor;
        tmp.x += r * Math.sin(angle);
        tmp.y += r * Math.cos(angle);
        displayElements();
    }, INTERVAL);
};

//событие сравнивает две ячейки first, second (Cell) и выдаёт ответ по координатам x (Number), INITIAL_Y + LEVEL_DIFF
function Compare(first, second, x) {
    this.first = first;
    this.second = second;
    this.x = x;
}

Compare.prototype.doIt = function() {
    let f = this.first,
        s = this.second;
    //alert(f.value + " " + s.value);
    displayText(f.value <= s.value ? "<=" : ">", this.x, INITIAL_Y + LEVEL_DIFF);
    nextAction();
};

//функция, добавляющая элементов в массив, который будет сортироваться
function addCell() {
    for (let i in arguments) {
        cells.push(new Cell(INITIAL_X + CELL_INDENT * cells.length, INITIAL_Y, arguments[i]));
    }
}

//функция слияния
function merge(begin, tmp1, tmp2) {
    function addAction(tmp, ind, k) {
        actions.push(new MovingCell(tmp[ind], INITIAL_X + begin * CELL_INDENT, INITIAL_Y));
        cells[begin++] = tmp[ind];
        if (ind + 1 < tmp.length)
            actions.push(new MovingCell(tmp[ind + 1], x + k * CELL_INDENT / 2, y));
    }

    let x = (tmp1[0].x + tmp2[tmp2.length - 1].x) / 2,
        y = LEVEL_DIFF + INITIAL_Y;
    actions.push(new MovingCell(tmp1[0], x - CELL_INDENT / 2, y), new MovingCell(tmp2[0], x + CELL_INDENT / 2, y));
    let i = 0,
        j = 0;
    while (i < tmp1.length || j < tmp2.length) {
        if (i >= tmp1.length) {
            addAction(tmp2, j++, 1);
            continue;
        }
        if (j >= tmp2.length) {
            addAction(tmp1, i++, -1);
            continue;
        }
        actions.push(new Compare(tmp1[i], tmp2[j], x));
        if (tmp1[i].value <= tmp2[j].value) {
            addAction(tmp1, i++, -1);
        } else {
            addAction(tmp2, j++, 1);
        }
    }
}

//сортировка
function mergeSort(begin, end) {
    if (begin === end - 1)
        return;
    let mid = Math.floor((begin + end) / 2);
    mergeSort(begin, mid);
    mergeSort(mid, end);
    actions.push(new MovingCellsDown(begin, end));
    merge(begin, cells.slice(begin, mid), cells.slice(mid, end));
}

//функция, запускающая сортировку
function mergeSortBegin() {
    createMas.disabled = true;
    randomDate.disabled = true;
    isStarted = true;
    displayElements();
    initCells = cells.map(c => c);
    mergeSort(0, cells.length);
    cells = initCells;
    nextAction();
}

let buttonPause = document.getElementById("pause");
let buttonStart = document.getElementById("start");
let buttonStop = document.getElementById("stop");
let inputSpeed = document.getElementById("speed_factor");
let inputDate = document.getElementById("input_mas");
let createMas = document.getElementById("create");
let randomDate = document.getElementById("random");

createMas.onclick = function() {
    cells = [];
    addCell.apply(null, inputDate.value.split(" ")
        .filter(a => a !== '').map(a => parseInt(a)).filter(a => !isNaN(a) && a > -100 && a < 100).slice(0, MAX_OF_CELL));
    inputDate.value = "";
    displayElements();
};

inputSpeed.oninput = setSpeed;

function setSpeed() {
    if (isPause) {
        factor = 0;
        return;
    }
    let val = inputSpeed.value;
    factor = Math.pow(2, val);
}

buttonPause.onclick = function() {
    buttonPause.src = "pauseen.png";
    buttonStart.disabled = false;
    buttonStart.src = "startdis.png";
    isPause = true;
    setSpeed();
};

buttonStart.onclick = function() {
    buttonStart.src = "starten.png";
    buttonPause.src = "pausedis.png";
    buttonPause.disabled = false;
    buttonStart.disabled = true;
    if (isPause)
        isPause = !isPause;
    else
        mergeSortBegin();
    setSpeed();
};

buttonStop.onclick = function() {
    isStarted = false;
    initCells.forEach(function(cell, ind) {
        cell.x = INITIAL_X + ind * CELL_INDENT;
        cell.y = INITIAL_Y;
    });
    cells = initCells;
    buttonStop.src = "stopen.png";
    buttonStart.src = "startdis.png";
    buttonStart.disabled = false;
    buttonPause.disabled = true;
    buttonPause.src = "pausedis.png";
    isPause = false;
    displayElements();
    actions = [];
    actionsInd = -1;
    createMas.disabled = false;
    randomDate.disabled = false;
    setTimeout(function() {
        buttonStop.src = "stopdis.png";
    }, 300);
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate() {
    let n = getRandomInt(1, MAX_OF_CELL);
    cells = [];
    for (i = 0; i < n; i++) {
        addCell(getRandomInt(-25, 99));
    }
    displayElements();
}
getRandomDate();

randomDate.onclick = getRandomDate;