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

async function drawMapAnimation() {
  const geoData = await loadGeoJSON('data/us-states.json');
  const years = Array.from({length: 10}, (_, i) => 2010 + i);
  const diabetesFiles = years.map(y => `data/diabetes_${y}.csv`);
  const sugarFiles = years.map(y => `data/sugar_${y}.csv`);
  const diabetesData = await Promise.all(diabetesFiles.map(loadCSV));
  const sugarData = await Promise.all(sugarFiles.map(loadCSV));

  const map = L.map('map').setView([37.8, -96], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 6,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  let diabetesLayer, sugarLayer, alaskaLayer, alaskaSugarLayer, hawaiiLayer, hawaiiSugarLayer;

  function getColorDiabetes(d) {
    return d > 14 ? '#800026' :
           d > 12 ? '#BD0026' :
           d > 10 ? '#E31A1C' :
           d > 8  ? '#FC4E2A' :
           d > 6  ? '#FD8D3C' :
           d > 4  ? '#FEB24C' :
           d > 2  ? '#FED976' :
                    '#FFEDA0';
  }

  function getColorSugar(d) {
    return d > 80 ? '#800026' :
           d > 60 ? '#BD0026' :
           d > 40 ? '#E31A1C' :
           d > 20 ? '#FC4E2A' :
           d > 10 ? '#FD8D3C' :
           d > 5  ? '#FEB24C' :
           d > 0  ? '#FED976' :
                    '#FFEDA0';
  }

  function styleDiabetes(feature, data) {
    const stateData = data.find(d => d.State === feature.properties.name);
    const perc = stateData ? parseFloat(stateData.Percentage) : null;
    return {
      fillColor: getColorDiabetes(perc),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  }

  function styleSugar(feature, data) {
    const stateData = data.find(d => d.State === feature.properties.name);
    const perc = stateData ? parseFloat(stateData.Percentage) : null;
    return {
      fillColor: getColorSugar(perc),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  }

  let yearIdx = 0;
  function updateMap() {
    if (diabetesLayer) map.removeLayer(diabetesLayer);
    if (sugarLayer) map.removeLayer(sugarLayer);
    if (alaskaLayer) map.removeLayer(alaskaLayer);
    if (alaskaSugarLayer) map.removeLayer(alaskaSugarLayer);
    if (hawaiiLayer) map.removeLayer(hawaiiLayer);
    if (hawaiiSugarLayer) map.removeLayer(hawaiiSugarLayer);

    diabetesLayer = L.geoJson(geoData, {
      filter: f => f.properties.name !== 'Alaska' && f.properties.name !== 'Hawaii',
      style: feature => styleDiabetes(feature, diabetesData[yearIdx])
    }).addTo(map);

    sugarLayer = L.geoJson(geoData, {
      filter: f => f.properties.name !== 'Alaska' && f.properties.name !== 'Hawaii',
      style: feature => styleSugar(feature, sugarData[yearIdx])
    }).addTo(map);

    alaskaLayer = L.geoJson(geoData, {
      filter: f => f.properties.name === 'Alaska',
      style: feature => styleDiabetes(feature, diabetesData[yearIdx])
    }).addTo(map);

    alaskaSugarLayer = L.geoJson(geoData, {
      filter: f => f.properties.name === 'Alaska',
      style: feature => styleSugar(feature, sugarData[yearIdx])
    }).addTo(map);

    hawaiiLayer = L.geoJson(geoData, {
      filter: f => f.properties.name === 'Hawaii',
      style: feature => styleDiabetes(feature, diabetesData[yearIdx])
    }).addTo(map);

    hawaiiSugarLayer = L.geoJson(geoData, {
      filter: f => f.properties.name === 'Hawaii',
      style: feature => styleSugar(feature, sugarData[yearIdx])
    }).addTo(map);

    document.getElementById('map').setAttribute('data-year', years[yearIdx]);
  }

  setInterval(() => {
    updateMap();
    yearIdx = (yearIdx + 1) % years.length;
  }, 1000);

  updateMap();
}

drawMapAnimation();