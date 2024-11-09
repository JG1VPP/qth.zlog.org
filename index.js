const configs = {
  style: {
    weight: 1,
    color: '#FF0000',
    opacity: 0.8,
    fillColor: '#FF0000',
    fillOpacity: 0.2,
  }
};

const tile = {
  attribution: [
    '&copy; OpenStreetMap',
    '&copy; 国土数値情報 行政区域データを基に簡素化'
  ]
};

function onload(central = [35.6802117, 139.7576692], interval = 5000, port = 49599) {
  const map = L.map('map').setView(central, 5);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', tile).addTo(map);
  fetch('./jcc.yaml').then(response => response.text()).then(text => YAML.parse(text)).then(jcc => {
    fetch('./jp.json').then(response => response.json()).then(json => {
      const features = Object.fromEntries(json.features.map(feature => {
        const pref = feature.properties.N03_001;
        const city = feature.properties.N03_003;
        const ward = feature.properties.N03_004?.replace(city, city + ' ');
        const name = `${pref} ${ward?.replace('七ヶ宿町', '七ケ宿町')}`;
        return [name, feature];
      }));
      const markers = {};
      function polling() {
        fetch(`http://127.0.0.1:${port}`).then(response => response.json()).then(json => {
          const counter = {};
          json.forEach(function(qth) {
            if (!qth.Drop) {
              counter[qth.Code] = (counter[qth.Code] || 0) + 1;
            } else {
              counter[qth.Code] = (counter[qth.Code] || 0) - 1;
            }
          });
          Object.keys(markers).forEach(function(qth) {
            if (!counter[qth]) {
              map.removeLayer(markers[qth]);
              delete markers[qth];
            }
          });
          Object.keys(counter).forEach(function(qth) {
            if (counter[qth] && !markers[qth] && jcc[qth]) {
              const cities = jcc[qth].cities.map(city => features[city]).filter(Boolean);
              markers[qth] = L.geoJSON(cities, configs).addTo(map).bindPopup(jcc[qth].name).openPopup();
            }
          });
        }).catch(err => {
          console.log(err);
          clearInterval(timer);
        });
      }
      const timer = setInterval(polling, interval);
    });
  });
}
