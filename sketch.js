let data; 
let minLat, minLon, maxLat, maxLon;
let minElev, maxElev; 
let margin = 40;

let mapW, mapH, panelW, panelX, panelH;
const DETAIL_BAR_H = 120;
const MARGIN_RATIO = 0.04;

let typeCounts = {};
let filterButtons = {};
let currentFilter = 'All';


function preload() {
  data = loadTable("data.csv", "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Futura");

  // Definizione delle aree
  margin = Math.max(20, windowWidth * MARGIN_RATIO);
  mapW = windowWidth * 0.7 - margin;
  panelW = windowWidth * 0.3;
  panelX = windowWidth * 0.7;
  mapH = windowHeight - 280;
  panelH = windowHeight - margin;

  let allLat = [];
  let allLon = [];
  let allElev = []; 

  for (let i = 0; i < data.getRowCount(); i++) {
    let lat = parseFloat(data.getString(i, "Latitude"));
    let lon = parseFloat(data.getString(i, "Longitude"));
    let elev = parseFloat(data.getString(i, "Elevation (m)"));
    let type = data.getString(i, "TypeCategory"); // Prende il tipo per il conteggio

    if (!isNaN(lat) && !isNaN(lon)) {
      allLat.push(lat);
      allLon.push(lon);
      if (!isNaN(elev)) {
          allElev.push(elev);
      }
      // Contiamo i tipi per i filtri
      if (type && type !== 'Unknown') {
          typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    }
  }

  // Valori minimi e massimi per la mappatura
  minLat = min(allLat);
  maxLat = max(allLat);
  minLon = min(allLon);
  maxLon = max(allLon);
  minElev = min(allElev);
  maxElev = max(allElev);
}


function draw() {
  background(10); // Sfondo scuro
  const TITLE_Y = margin;
  const MAP_Y_START = TITLE_Y + 70
  const MAP_Y_END = MAP_Y_START + mapH;
  const INFO_Y_START = MAP_Y_END + 10;

  // PANNELLO (Sfondo e separatore)
  fill(25); // Colore leggermente più chiaro per il pannello
  rect(panelX, 0, panelW, height);
  stroke(100);
  strokeWeight(1);
  line(panelX, 0, panelX, height);
  noStroke();

  // TITOLO
  fill(251, 86, 7);
  textSize(32);
  textStyle(BOLD);
  textAlign(LEFT);
  text("VOLCANOES OF THE WORLD", margin, TITLE_Y); 
  textStyle(NORMAL);
  textSize(14);
  text("Size by Elevation, Color by Activity Status. Click filters on the right.", margin, TITLE_Y + 25);


  // let mapYOffset = titleY + 60; // Inizio della mappa (Visione d'Insieme)
  
  // Colori per lo Status
  let activeColor = color(255, 89, 94, 200);   // Arancione/Rosso (Attivo/Historical/D1/D2/D3)
  let dormantColor = color(138, 201, 38, 200); // Blu (Holocene/U)
  let otherColor = color(150, 150, 150, 200);  // Grigio (Sconosciuto/Altro)

  // Disegno della Mappa dei Vulcani
  let closestDist = Infinity;
  let closestRow = null;
  let closestX, closestY, closestSize;

  for (let i = 0; i < data.getRowCount(); i++) {
    let lat = parseFloat(data.getString(i, "Latitude"));
    let lon = parseFloat(data.getString(i, "Longitude"));
    let elev = parseFloat(data.getString(i, "Elevation (m)"));
    let status = data.getString(i, "Status");
    let type = data.getString(i, "TypeCategory");

    if (isNaN(lat) || isNaN(lon) || isNaN(elev)) continue;
    
    // Controlla il filtro: se non è 'All' e il tipo non corrisponde, salta
    if (currentFilter !== 'All' && type !== currentFilter) continue;

    // Mappa Lat/Lon a coordinate X/Y all'interno dell'area mappa (mapW)
    let x = map(lon, minLon, maxLon, margin, mapW - margin);
    let y = map(lat, minLat, maxLat, MAP_Y_END - margin, MAP_Y_START);
    
    // Mappa Altitudine alla Dimensione del Quadrato
    let size = map(elev, minElev, maxElev, 4, 20); 
    
    // Determina il Colore in base allo Status
    let vulcColor;
    if (status.includes("Historical") || status.startsWith("D")) {
        vulcColor = activeColor;
    } else if (status.includes("Holocene") || status === "U") {
        vulcColor = dormantColor;
    } else {
        vulcColor = otherColor;
    }
    
    // Distanza dal mouse (solo sull'area mappa)
    if (mouseX < panelX && mouseX > 0 && mouseY > MAP_Y_START && mouseY < MAP_Y_END) {
        let d = dist(x, y, mouseX, mouseY);
        if (d < size * 0.7 && d < closestDist) {
            closestDist = d; 
            closestRow = i;
            closestX = x;
            closestY = y;
            closestSize = size;
        }
    }

    // Disegna il quadrato del vulcano
    fill(vulcColor);
    rectMode(CENTER);
    rect(x, y, size, size);
  }

  // Se c'è un vulcano in hover, evidenzialo
  if (closestRow !== null) {
    // Evidenziazione: bordo giallo attorno al quadrato
    stroke("white");
    strokeWeight(3);
    noFill();
    rect(closestX, closestY, closestSize + 5, closestSize + 5); 
    noStroke();
    
    // info vulcano (sotto mappa)
    drawVolcanoInfo(closestRow, margin, INFO_Y_START, panelX - margin * 2);
  }

  // Disegno Legenda e Filtri (pannello di destra)
  drawLegend(activeColor, dormantColor, minElev, maxElev, panelX + 20, TITLE_Y + 60);
  drawFilters(panelX + 20, TITLE_Y + 300);
}

// --- DETTAGLI A RICHIESTA (INFO VULCANO) ---
function drawVolcanoInfo(row, infoX, infoY, maxWidth) {
    
    let name = data.getString(row, "Volcano Name");
    let country = data.getString(row, "Country");
    let type = data.getString(row, "Type");
    let status = data.getString(row, "Status");
    let erup = data.getString(row, "Last Known Eruption");
    let elev = data.getString(row, "Elevation (m)");
    let lat = data.getString(row, "Latitude");
    let lon = data.getString(row, "Longitude");

    const BOX_H = DETAIL_BAR_H - 10;

    // Sfondo per la sezione info
    // fill(10, 10, 10);
    rect(infoX, infoY, maxWidth, BOX_H, 5);

    // Testo vulcano
    fill(251, 86, 7);
    textSize(18);
    textStyle(BOLD);
    text(infoX, infoY);
    textSize(16);
    text(name, infoX, infoY + 25);
    textStyle(NORMAL);
    textSize(12);
    fill(255);
    text("Country: " + country, infoX, infoY + 50);
    text("Status: " + status, infoX, infoY + 70);
    text("Type: " + type, infoX, infoY + 90);
    text("Elevation: " + elev + " m", infoX, infoY + 110);
    text("Last Eruption: " + erup, infoX, infoY + 130);
}

// --- LEGENDA ---
function drawLegend(activeCol, dormantCol, minE, maxE, legendX, legendY) {
  rectMode(CORNER);

  fill(251, 86, 7);
  textSize(18);
  textStyle(BOLD);
  text("MAP LEGEND", legendX, legendY);
  textStyle(NORMAL);
  textSize(14);
  
  // 1. Legenda Colore (Status)
  fill(255);
  text("COLOR (Activity Status)", legendX, legendY + 30);
  
  // ATTIVO
  fill(activeCol);
  rect(legendX, legendY + 45, 15, 15);
  fill(255);
  text("Active / Historical (D)", legendX + 25, legendY + 57);
  
  // DORMIENTE
  fill(dormantCol);
  rect(legendX, legendY + 70, 15, 15);
  fill(255);
  text("Dormant / Holocene (U)", legendX + 25, legendY + 82);
  
  // 2. Legenda Dimensione (Elevation)
  fill(255);
  text("SIZE (Elevation in meters)", legendX, legendY + 120);
  
  fill(150);
  rect(legendX + 5, legendY + 140, 5, 5); // Piccolo
  fill(255);
  text(nf(minE, 0, 0) + " m (Min)", legendX + 25, legendY + 145);
  
  fill(150);
  rect(legendX, legendY + 170, 20, 20); // Grande
  fill(255);
  text(nf(maxE, 0, 0) + " m (Max)", legendX + 25, legendY + 182);
}

// --- FILTRI INTERATTIVI  ---
function drawFilters(filterX, filterY) {
    let yPos = filterY;
    
    fill(251, 86, 7);
    textSize(18);
    textStyle(BOLD);
    text("FILTERS", filterX, yPos);
    yPos += 30;

    // Ordina i tipi per conteggio (dal più comune al meno comune)
    let sortedTypes = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]);
    
    // Disegna il pulsante 'All'
    drawFilterButton('All', yPos);
    yPos += 30;

    // Disegna i pulsanti per i tipi di vulcano
    for (let type of sortedTypes) {
        if (typeCounts[type] > 1) {
            drawFilterButton(type, yPos);
            yPos += 30;
        }
    }
}

// Funzione helper per disegnare e registrare i pulsanti filtro
function drawFilterButton(label, y) {
    const PADDING = 20;
    const BOX_W = panelW - PADDING * 2;
    const BOX_H = 25;
    const x = panelX + PADDING;

    let count = label === 'All' ? data.getRowCount() : typeCounts[label];
    let isActive = currentFilter === label;

    // Controllo hover (solo sul pannello)
    let isHover = mouseX > x && mouseX < x + BOX_W && mouseY > y && mouseY < y + BOX_H;
    
    if (isActive) {
        fill(251, 86, 7); // Colore attivo (Arancione)
    } else if (isHover) {
        fill(50, 50, 50); // Grigio scuro per hover
    } else {
        fill(20, 20, 20); // Sfondo scuro normale
    }
    
    rect(x, y, BOX_W, BOX_H, 5); // Pulsante arrotondato

    fill(255);
    textSize(14);
    textAlign(LEFT, CENTER);
    text(`${label} (${count})`, x + 10, y + BOX_H / 2 + 2); // Il +2 corregge leggermente la posizione verticale del testo

    // Registra l'area del pulsante per la gestione del click
    filterButtons[label] = { x: x, y: y, w: BOX_W, h: BOX_H };
}

// --- INTERAZIONE (Mouse Click) ---
function mouseClicked() {
    // 1. Controlla i click sui pulsanti filtro
    for (let label in filterButtons) {
        let b = filterButtons[label];
        if (mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h) {
            currentFilter = label;
            redraw(); // Aggiorna la mappa con il nuovo filtro
            return;
        }
    }
}

// --- INTERAZIONE (Mouse Move) ---
function mouseMoved() {
    redraw();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}