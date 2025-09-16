const seed = {
  // Assam
  "Kaziranga National Park": { lat: 26.60, lng: 93.32 },
  "Majuli Island": { lat: 26.95, lng: 94.17 },
  "Kamakhya Temple": { lat: 26.17, lng: 91.72 },
  "Manas National Park": { lat: 26.42, lng: 91.00 },
  "Guwahati": { lat: 26.2006, lng: 92.9376 },
  "Dispur": { lat: 26.1433, lng: 91.7898 },
  
  // Arunachal Pradesh
  "Sela Pass": { lat: 27.58, lng: 92.72 },
  "Tawang Monastery": { lat: 27.59, lng: 91.87 },
  "Tawang": { lat: 27.59, lng: 91.87 },
  "Ziro Valley": { lat: 27.55, lng: 93.83 },
  "Bomdila": { lat: 27.25, lng: 92.40 },
  "Itanagar": { lat: 27.0844, lng: 93.6053 },
  
  // Nagaland
  "Kohima": { lat: 25.67, lng: 94.11 },
  "Dzukou Valley": { lat: 25.37, lng: 94.05 },
  "Khonoma Village": { lat: 25.68, lng: 94.33 },
  
  // Manipur
  "Loktak Lake": { lat: 24.47, lng: 93.77 },
  "Imphal": { lat: 24.82, lng: 93.94 },
  "Imphal War Cemetery": { lat: 24.80, lng: 93.93 },
  "Shirui Kashong Peak": { lat: 25.17, lng: 94.35 },
  
  // Meghalaya
  "Shillong": { lat: 25.57, lng: 91.88 },
  "Cherrapunji": { lat: 25.27, lng: 91.72 },
  "Sohra": { lat: 25.27, lng: 91.72 },
  "Dawki": { lat: 25.22, lng: 92.00 },
  
  // Mizoram
  "Aizawl": { lat: 23.73, lng: 92.72 },
  "Reiek": { lat: 23.27, lng: 92.75 },
  "Vantawng Falls": { lat: 22.92, lng: 93.05 },
  
  // Tripura
  "Agartala": { lat: 23.83, lng: 91.28 },
  "Unakoti": { lat: 24.27, lng: 92.28 },
  "Udaipur": { lat: 23.53, lng: 91.49 },
  "Udaipur (Tripura)": { lat: 23.53, lng: 91.49 },
  
  // Sikkim
  "Gangtok": { lat: 27.33, lng: 88.61 },
  "Rumtek Monastery": { lat: 27.27, lng: 88.52 },
  "Nathula Pass": { lat: 27.38, lng: 88.85 },
  "Tsomgo Lake": { lat: 27.38, lng: 88.76 },
  "Pelling": { lat: 27.32, lng: 88.24 },
  
  // Other
  "Siliguri": { lat: 26.7271, lng: 88.3953 },
  "Hubli": { lat: 15.3647, lng: 75.124 },
}

function geocode(name) {
  if (!name) return null
  const key = String(name).trim()
  return seed[key] || null
}

module.exports = { geocode, seed }

