let mapInstance = null;
let clickHandler = null;

export function createMap(containerId, options = {}) {
  const {
    center = [-6.2, 106.8],
    zoom = 5,
    onClick: userClick
  } = options;

  const map = L.map(containerId, {
    zoomControl: true,
  }).setView(center, zoom);

  const meta = document.querySelector('meta[name="map-tiler-key"]');
  const apiKey = meta?.content?.trim();

  const tileUrl = apiKey
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`
    : `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`;

  const attribution = apiKey
    ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> &copy; OpenStreetMap'
    : '&copy; OpenStreetMap contributors';

  L.tileLayer(tileUrl, {
    maxZoom: 19,
    attribution,
  }).addTo(map);

  if (typeof userClick === "function") {
    clickHandler = (event) => {
      userClick(event.latlng);
    };
    map.on("click", clickHandler);
  }

  mapInstance = map;
  return map;
}

export function destroyMap() {
  if (!mapInstance) return;

  try {
    if (clickHandler) {
      mapInstance.off("click", clickHandler);
      clickHandler = null;
    }

    mapInstance.remove();
  } finally {
    mapInstance = null;
  }
}

export function addMarker(map, lat, lng, popupHtml) {
  const marker = L.marker([lat, lng]).addTo(map);

  if (popupHtml) {
    marker.bindPopup(popupHtml);
  }

  return marker;
}
