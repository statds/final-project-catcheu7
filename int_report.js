//with copilot
const stateNameToAbbr = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL",
  "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA",
  "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
  "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR",
  "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA",
  "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
};

function loadCSV(url) {
  return fetch(url)
    .then(res => res.text())
    .then(text => {
      // Skip the first two lines (metadata), keep only the real CSV
      const lines = text.split('\n').slice(2).join('\n');
      return new Promise((resolve, reject) => {
        Papa.parse(lines, {
          header: true,
          skipEmptyLines: true,
          complete: results => resolve(results.data),
          error: err => reject(err)
        });
      });
    });
}

function loadGeoJSON(url) {
  return fetch(url).then(res => res.json());
}

async function animateDiabetesMap() {
  const geoData = await loadGeoJSON('data/us-states.json');
  const years = Array.from({length: 10}, (_, i) => 2010 + i);
  const diabetesFiles = years.map(y => `data/DiabetesAtlasData (${y}).csv`);
  const diabetesData = await Promise.all(diabetesFiles.map(loadCSV));

  const validRows = diabetesData[0].filter(
    d => d.State && typeof d.State === "string" && stateNameToAbbr.hasOwnProperty(d.State.trim())
  );
  console.log("All valid rows from CSV (first year):", validRows);

  const map = L.map('map').setView([37.8, -96], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 6,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  let layer = null;
  let yearLabel = L.control({position: 'topright'});
  yearLabel.onAdd = function() {
    this._div = L.DomUtil.create('div', 'year-label');
    this.update();
    return this._div;
  };
  yearLabel.update = function(year) {
    this._div.innerHTML = `<h2>${year || ''}</h2>`;
  };
  yearLabel.addTo(map);

  // Add a legend
  const legend = L.control({position: 'bottomright'});
  legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'info legend');
    const grades = [0, 2, 4, 6, 8, 10, 12, 14];
    const colors = grades.map(g => getColor(g + 0.1));

    // Create a color bar using a gradient
    div.innerHTML += '<div style="width:160px;height:18px;background:linear-gradient(to right,'
      + colors.join(',') +
      ');margin-bottom:4px;border:1px solid #999"></div>';

    // Add numeric labels under the color bar
    div.innerHTML += '<div style="display:flex;justify-content:space-between;font-size:12px;">' +
      grades.map(g => `<span>${g}</span>`).join('') +
      '<span>+</span></div>';

    return div;
  };
  legend.addTo(map);

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

  function style(feature, yearIndex) {
    const abbr = feature.id;
    const stateName = Object.keys(stateNameToAbbr).find(name => stateNameToAbbr[name] === abbr);

    // Only use rows with a valid State property that matches the lookup table
    const validRows = diabetesData[yearIndex].filter(
      d => d.State && typeof d.State === "string" && stateNameToAbbr.hasOwnProperty(d.State.trim())
    );

    // Log what we're trying to match
    console.log(`Looking for state: "${stateName}" (abbr: ${abbr}) in`, validRows.map(d => d.State.trim()));

    const stateData = validRows.find(d => d.State.trim() === stateName);

    if (!stateData) {
      console.log(`No data for: ${abbr} (${stateName})`);
    } else {
      console.log(`Matched data for: ${abbr} (${stateName})`, stateData);
    }
    const perc = stateData ? parseFloat(stateData.Percentage) : null;
    return {
      fillColor: getColor(perc),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  }

  let yearIndex = 0;
  function updateMap() {
    if (layer) map.removeLayer(layer);
    layer = L.geoJson(geoData, {
      style: feature => style(feature, yearIndex)
    }).addTo(map);
    yearLabel.update(years[yearIndex]);
  }

  updateMap();
  setInterval(() => {
    yearIndex = (yearIndex + 1) % years.length;
    updateMap();
  }, 1200);
}

animateDiabetesMap();

