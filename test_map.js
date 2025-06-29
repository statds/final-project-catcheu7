fetch('data/us-states.json')
  .then(res => res.json())
  .then(geoData => {
    const map = L.map('map').setView([37.8, -96], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 6,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    L.geoJson(geoData).addTo(map);
  });