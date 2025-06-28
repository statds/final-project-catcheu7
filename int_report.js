//with copilot
function loadCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}

function loadGeoJSON(url) {
  return fetch(url).then(res => res.json());
}

async function drawDiabetesMap(yearIndex = 0) {
  const geoData = await loadGeoJSON('data/us-states.json');
  const years = Array.from({length: 10}, (_, i) => i);
  const diabetesFiles = years.map(y => `data/DiabetesAtlasData (${y}).csv`);
  const diabetesData = await Promise.all(diabetesFiles.map(loadCSV));

  const map = L.map('map').setView([37.8, -96], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 6,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  function getColor(d) {
    return d > 14 ? '#800026' :
           d > 12 ? '#BD0026' :
           d > 10 ? '#E31A1C' :
           d > 8  ? '#FC4E2A' :
           d > 6  ? '#FD8D3C' :
           d > 4  ? '#FEB24C' :
           d > 2  ? '#FED976' :
                    '#FFEDA0';
  }

  function style(feature) {
    const stateData = diabetesData[yearIndex].find(d => d.State === feature.properties.name);
    const perc = stateData ? parseFloat(stateData.Percentage) : null;
    return {
      fillColor: getColor(perc),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  }

  L.geoJson(geoData, { style }).addTo(map);
}

drawDiabetesMap();