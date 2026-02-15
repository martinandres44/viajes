import { useState, useEffect, useRef, useCallback } from "react";
import { onTripData, saveTripData } from "./firebase";

// ========== CONSTANTS ==========

// Google Sheets integration - Reemplazá con tu URL de Apps Script (ver README)
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbzFtyCPdPbHqAvymF1HnJdCkHA_wHvBCYdgOVFlYVGoOt3hV5YeBS1Ewmm2ZtwRL-U/exec";

const WEATHER_LAT = 26.0112;
const WEATHER_LON = -80.1495;
const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,wind_speed_10m_max,uv_index_max&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&timezone=America/New_York&forecast_days=10`;

const WMO_CODES = {
  0: { label: "Despejado", icon: "☀️" },
  1: { label: "Mayormente despejado", icon: "🌤️" },
  2: { label: "Parcialmente nublado", icon: "⛅" },
  3: { label: "Nublado", icon: "☁️" },
  45: { label: "Niebla", icon: "🌫️" },
  48: { label: "Niebla helada", icon: "🌫️" },
  51: { label: "Llovizna leve", icon: "🌦️" },
  53: { label: "Llovizna moderada", icon: "🌦️" },
  55: { label: "Llovizna intensa", icon: "🌧️" },
  61: { label: "Lluvia leve", icon: "🌧️" },
  63: { label: "Lluvia moderada", icon: "🌧️" },
  65: { label: "Lluvia intensa", icon: "🌧️" },
  80: { label: "Chubascos leves", icon: "🌦️" },
  81: { label: "Chubascos moderados", icon: "🌧️" },
  82: { label: "Chubascos intensos", icon: "⛈️" },
  95: { label: "Tormenta", icon: "⛈️" },
  96: { label: "Tormenta con granizo", icon: "⛈️" },
  99: { label: "Tormenta fuerte", icon: "⛈️" },
};

const getWeatherInfo = (code) => WMO_CODES[code] || { label: "Desconocido", icon: "🌡️" };
const celsiusToF = (c) => Math.round(c * 9 / 5 + 32);

const CATEGORIES = [
  { id: "food", label: "Comida", icon: "🍽️", color: "#FF6B6B" },
  { id: "transport", label: "Transporte", icon: "🚗", color: "#4ECDC4" },
  { id: "shopping", label: "Compras", icon: "🛍️", color: "#FFE66D" },
  { id: "entertainment", label: "Entretenimiento", icon: "🎭", color: "#A78BFA" },
  { id: "hotel", label: "Hotel", icon: "🏨", color: "#60A5FA" },
  { id: "flight", label: "Vuelo", icon: "✈️", color: "#F472B6" },
  { id: "car", label: "Auto", icon: "🚘", color: "#34D399" },
  { id: "other", label: "Otros", icon: "📦", color: "#9CA3AF" },
];

const PAYMENT_METHODS = [
  { id: "visa", label: "Visa", color: "#1A1F71" },
  { id: "mc", label: "Mastercard", color: "#EB001B" },
  { id: "amex", label: "Amex", color: "#2E77BC" },
  { id: "cash", label: "Cash", color: "#16A34A" },
];

const BANKS = [
  { id: "galicia", label: "Galicia", color: "#E35205" },
  { id: "bbva", label: "BBVA", color: "#004481" },
  { id: "icbc", label: "ICBC", color: "#C8102E" },
];

const ColorDot = ({ color, size = 10 }) => (
  <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.15)" }} />
);

const DEFAULT_DATA = {
  flights: [
    { id: "f1", type: "ida", airline: "", flightNumber: "", from: "EZE", to: "MIA", date: "2026-03-17", time: "21:50", confirmation: "", status: "pendiente", notes: "Vuelo nocturno" },
    { id: "f2", type: "vuelta", airline: "LATAM", flightNumber: "", from: "MIA", to: "LIM", date: "2026-03-24", time: "17:55", confirmation: "", status: "pendiente", notes: "Tramo 1 - Miami a Lima" },
    { id: "f3", type: "vuelta", airline: "LATAM", flightNumber: "", from: "LIM", to: "EZE", date: "2026-03-24", time: "23:45", confirmation: "", status: "pendiente", notes: "Tramo 2 - Lima a Buenos Aires" },
  ],
  hotel: { name: "The Tides", address: "3901 S Ocean Dr, Hollywood, FL 33019", checkIn: "2026-03-18", checkOut: "2026-03-24", confirmation: "", totalCost: 0, currency: "USD", notes: "📍 https://maps.app.goo.gl/UvVzdYNsABFu2C2e7", paid: false },
  car: { company: "", pickUp: "2026-03-18", dropOff: "2026-03-24", confirmation: "", totalCost: 0, currency: "USD", notes: "", paid: false },
  tickets: [],
  expenses: [],
  itinerary: [
    { id: "d1", date: "2026-03-17", title: "Vuelo de ida", activities: "21:50 - Vuelo EZE → MIA", notes: "Vuelo nocturno, llegar al aeropuerto ~19:00" },
    { id: "d2", date: "2026-03-18", title: "Llegada + Inter Miami ⚽", activities: "Llegada a Miami\nCheck-in Airbnb\nRetirar auto rental\n19:00 - Inter Miami ⚽", notes: "Partido a las 7pm" },
    { id: "d3", date: "2026-03-19", title: "Miami Heat vs Lakers 🏀", activities: "Día libre por Miami\n19:00 - Miami Heat vs Lakers 🏀", notes: "Partido a las 7pm" },
    { id: "d4", date: "2026-03-20", title: "Miami Open - Día completo 🎾", activities: "Miami Open 🎾 - Sesión diurna\nMiami Open 🎾 - Sesión nocturna\n\n🔗 Order of Play: https://www.miamiopen.com/order-of-play/", notes: "Día completo de tenis, sesión diurna + nocturna" },
    { id: "d5", date: "2026-03-21", title: "Miami Open - Sesión diurna 🎾", activities: "Miami Open 🎾 - Sesión diurna\n\n🔗 Order of Play: https://www.miamiopen.com/order-of-play/", notes: "Solo sesión diurna" },
    { id: "d6", date: "2026-03-22", title: "Día libre", activities: "Día libre para explorar\nSouth Beach\nLincoln Road\nOcean Drive", notes: "Sin planes fijos" },
    { id: "d7", date: "2026-03-23", title: "Miami Heat vs Spurs 🏀", activities: "Día libre por Miami\n19:00 - Miami Heat vs San Antonio Spurs 🏀", notes: "Partido a las 7pm" },
    { id: "d8", date: "2026-03-24", title: "Vuelta", activities: "Check-out Airbnb\nDevolver auto\n17:55 - Vuelo MIA → EZE", notes: "Salida 17:55" },
  ],
  budget: { total: 0, currency: "USD" },
  checklist: [
    { id: "c1", text: "Pasaporte", checked: false },
    { id: "c2", text: "Licencia Conducir", checked: false },
    { id: "c3", text: "Seguro de viaje", checked: false },
    { id: "c4", text: "Tarjetas (Visa, BBVA, ICBC)", checked: false },
    { id: "c5", text: "Dólares cash", checked: false },
    { id: "c6", text: "Cargador celular", checked: false },
    { id: "c7", text: "Adaptador enchufe", checked: false },
    { id: "c8", text: "Protector solar", checked: false },
    { id: "c9", text: "Malla / Short de baño", checked: false },
    { id: "c10", text: "Ojotas", checked: false },
    { id: "c11", text: "Lentes de sol", checked: false },
    { id: "c12", text: "Botiquín básico", checked: false },
    { id: "c13", text: "Boarding pass descargado", checked: false },
    { id: "c14", text: "Confirmación Airbnb", checked: false },
    { id: "c15", text: "Confirmación auto rental", checked: false },
  ],
  notes: "",
};

// ========== HELPER: Extract URLs from text ==========

const extractUrls = (text) => {
  if (!text) return { urls: [], cleanText: text };
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = [];
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  const cleanText = text.replace(urlRegex, '').replace(/📍\s*/g, '').trim();
  return { urls, cleanText };
};

const isGoogleMapsUrl = (url) => {
  return url.includes('maps.app.goo.gl') || url.includes('google.com/maps') || url.includes('goo.gl/maps');
};

// ========== MAP PREVIEW COMPONENT ==========

function MapPreview({ url, address, lat, lon }) {
  // Use OpenStreetMap static tile for preview
  const mapLat = lat || 26.0112;
  const mapLon = lon || -80.1495;
  const zoom = 15;
  
  // OpenStreetMap embed URL
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLon - 0.008},${mapLat - 0.005},${mapLon + 0.008},${mapLat + 0.005}&layer=mapnik&marker=${mapLat},${mapLon}`;
  
  // Static image fallback using OSM tile server
  const tileX = Math.floor((mapLon + 180) / 360 * Math.pow(2, zoom));
  const tileY = Math.floor((1 - Math.log(Math.tan(mapLat * Math.PI / 180) + 1 / Math.cos(mapLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "block", textDecoration: "none", marginTop: 12 }}
    >
      <div style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(0,212,170,0.2)",
        background: "rgba(0,212,170,0.04)",
        transition: "all 0.25s ease",
        cursor: "pointer",
      }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(0,212,170,0.4)";
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,212,170,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(0,212,170,0.2)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Map image area */}
        <div style={{
          position: "relative",
          height: 160,
          background: `url(${tileUrl}) center/cover no-repeat`,
          backgroundColor: "rgba(0,30,40,0.5)",
        }}>
          {/* OSM iframe overlay for better map rendering */}
          <iframe
            src={osmEmbedUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
            }}
            title="Mapa ubicación"
            loading="lazy"
          />
          {/* Gradient overlay at bottom */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 50,
            background: "linear-gradient(transparent, rgba(10,14,26,0.9))",
          }} />
          {/* Pin icon overlay */}
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(0,212,170,0.9)",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 700,
            color: "#0A0E1A",
            display: "flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            📍 Maps
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,212,170,0.06)",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E8ECF4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {address || "Ver ubicación"}
            </div>
            <div style={{ fontSize: 11, color: "#00D4AA", marginTop: 2 }}>
              Abrir en Google Maps ↗
            </div>
          </div>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(0,212,170,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
            marginLeft: 10,
          }}>
            🗺️
          </div>
        </div>
      </div>
    </a>
  );
}

// ========== CLICKABLE LINK COMPONENT ==========

function ClickableLink({ url, label }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "rgba(0,180,216,0.08)",
        borderRadius: 10,
        textDecoration: "none",
        border: "1px solid rgba(0,180,216,0.15)",
        marginTop: 6,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(0,180,216,0.15)";
        e.currentTarget.style.borderColor = "rgba(0,180,216,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(0,180,216,0.08)";
        e.currentTarget.style.borderColor = "rgba(0,180,216,0.15)";
      }}
    >
      <span style={{ fontSize: 12, color: "#00B4D8", fontWeight: 600 }}>{label || "Abrir link"} ↗</span>
    </a>
  );
}

// ========== UI COMPONENTS ==========

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 18, border: "1px solid rgba(255,255,255,0.06)", cursor: onClick ? "pointer" : "default", transition: "all 0.2s", animation: "fadeIn 0.3s ease", ...style }}>
    {children}
  </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder, style }) => (
  <div style={{ marginBottom: 14, ...style }}>
    {label && <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>}
    <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8ECF4", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
      onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,170,0.4)")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style, small }) => {
  const styles = {
    primary: { background: "linear-gradient(135deg, #00D4AA, #00B4D8)", color: "#0A0E1A", fontWeight: 700 },
    secondary: { background: "rgba(255,255,255,0.08)", color: "#E8ECF4", fontWeight: 600 },
    danger: { background: "rgba(255,107,107,0.15)", color: "#FF6B6B", fontWeight: 600 },
  };
  return (
    <button onClick={onClick} style={{ padding: small ? "6px 14px" : "12px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: small ? 12 : 14, letterSpacing: 0.3, transition: "all 0.2s", ...styles[variant], ...style }}>
      {children}
    </button>
  );
};

const StatusBadge = ({ status }) => {
  const colors = { confirmado: { bg: "rgba(0,212,170,0.15)", text: "#00D4AA" }, pendiente: { bg: "rgba(255,230,109,0.15)", text: "#FFE66D" }, cancelado: { bg: "rgba(255,107,107,0.15)", text: "#FF6B6B" } };
  const c = colors[status] || colors.pendiente;
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.text, textTransform: "uppercase", letterSpacing: 0.8 }}>{status}</span>;
};

const SyncIndicator = ({ synced }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: synced ? "rgba(0,212,170,0.1)" : "rgba(255,230,109,0.1)", fontSize: 10, fontWeight: 600, color: synced ? "#00D4AA" : "#FFE66D", letterSpacing: 0.5 }}>
    <span style={{ width: 6, height: 6, borderRadius: 3, background: synced ? "#00D4AA" : "#FFE66D", animation: synced ? "none" : "pulse 1.5s infinite" }} />
    {synced ? "SYNC" : "GUARDANDO..."}
  </div>
);

const Tab = ({ active, onClick, icon, label, badge }) => (
  <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 4px", background: "none", border: "none", cursor: "pointer", color: active ? "#00D4AA" : "#8892A4", fontSize: 10, position: "relative", transition: "color 0.2s", flex: 1 }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <span style={{ fontWeight: active ? 700 : 500, letterSpacing: 0.3 }}>{label}</span>
    {badge > 0 && <span style={{ position: "absolute", top: 4, right: "calc(50% - 18px)", background: "#FF6B6B", color: "#fff", borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px", minWidth: 14, textAlign: "center" }}>{badge}</span>}
  </button>
);

// ========== WEATHER ==========

function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useFahrenheit, setUseFahrenheit] = useState(false);

  useEffect(() => {
    fetch(WEATHER_URL)
      .then(r => r.json())
      .then(data => { setWeather(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  if (loading) return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: 20 }}>
        <div style={{ width: 20, height: 20, border: "2px solid rgba(0,212,170,0.3)", borderTopColor: "#00D4AA", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: "#8892A4" }}>Cargando clima...</span>
      </div>
    </Card>
  );

  if (!weather?.current) return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ textAlign: "center", padding: 12 }}>
        <span style={{ fontSize: 24 }}>🌐</span>
        <div style={{ fontSize: 13, color: "#8892A4", marginTop: 6 }}>Weather no disponible</div>
      </div>
    </Card>
  );

  const { current, daily } = weather;
  const currentInfo = getWeatherInfo(current.weathercode);
  const tempDisplay = (c) => useFahrenheit ? `${celsiusToF(c)}°F` : `${Math.round(c)}°C`;

  return (
    <div style={{ marginBottom: 16 }}>
      <Card style={{ marginBottom: 10, background: "linear-gradient(135deg, rgba(0,180,216,0.12) 0%, rgba(0,212,170,0.06) 100%)", borderColor: "rgba(0,180,216,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#00B4D8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>🌊 Hollywood Beach ahora</div>
          <button onClick={() => setUseFahrenheit(!useFahrenheit)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, padding: "3px 8px", color: "#8892A4", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>°{useFahrenheit ? "C" : "F"}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>{currentInfo.icon}</div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#E8ECF4", lineHeight: 1 }}>{tempDisplay(current.temperature_2m)}</div>
            <div style={{ fontSize: 13, color: "#C8CDD8", marginTop: 4 }}>{currentInfo.label}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#8892A4" }}>💧 {current.relative_humidity_2m}%</div>
            <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>💨 {Math.round(current.wind_speed_10m)} km/h</div>
          </div>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        {daily.time.map((date, i) => {
          const d = new Date(date + "T12:00:00");
          const info = getWeatherInfo(daily.weathercode[i]);
          const isToday = i === 0;
          return (
            <Card key={date} style={{ padding: "10px 12px", textAlign: "center", borderColor: isToday ? "rgba(0,212,170,0.2)" : undefined, background: isToday ? "rgba(0,212,170,0.05)" : undefined, minWidth: 80, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: isToday ? "#00D4AA" : "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{isToday ? "Hoy" : dayNames[d.getDay()]}</div>
              <div style={{ fontSize: 9, color: "#6B7280", marginTop: 1 }}>{d.getDate()}/{d.getMonth() + 1}</div>
              <div style={{ fontSize: 26, margin: "6px 0" }}>{info.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E8ECF4" }}>{tempDisplay(daily.temperature_2m_max[i])}</div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>{tempDisplay(daily.temperature_2m_min[i])}</div>
              <div style={{ marginTop: 4, fontSize: 9, color: "#8892A4" }}>🌧 {daily.precipitation_probability_max[i]}%</div>
            </Card>
          );
        })}
      </div>
      <div style={{ textAlign: "right", marginTop: 6, fontSize: 10, color: "#4B5563" }}>Open-Meteo.com</div>
    </div>
  );
}

// ========== SECTIONS ==========

function DashboardSection({ data, updateData }) {
  const totalExpenses = (data.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = {};
  (data.expenses || []).forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0); });
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const daysUntil = Math.max(0, Math.ceil((new Date(data.hotel?.checkIn || "2026-03-15") - new Date()) / (1000 * 60 * 60 * 24)));
  const confirmedFlights = (data.flights || []).filter((f) => f.status === "confirmado").length;
  const pendingItems = [!data.hotel?.confirmation && "Hotel", !data.car?.confirmation && "Auto", ...(data.flights || []).filter((f) => !f.confirmation).map((f) => `Vuelo ${f.type}`)].filter(Boolean);

  return (
    <div>
      <div style={{ textAlign: "center", padding: "30px 20px 20px", background: "linear-gradient(180deg, rgba(0,212,170,0.08) 0%, transparent 100%)", borderRadius: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#8892A4", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Miami 2026</div>
        <div style={{ fontSize: 64, fontWeight: 800, background: "linear-gradient(135deg, #00D4AA, #00B4D8, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, fontFamily: "'Playfair Display', serif" }}>{daysUntil}</div>
        <div style={{ fontSize: 14, color: "#8892A4", marginTop: 4 }}>días para el viaje</div>
      </div>

      <WeatherWidget />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Gastos totales</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#00D4AA" }}>${totalExpenses.toLocaleString()}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Vuelos</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#60A5FA" }}>{confirmedFlights}/{(data.flights || []).length}</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>confirmados</div>
        </Card>
      </div>

      {pendingItems.length > 0 && (
        <Card style={{ borderColor: "rgba(255,230,109,0.15)", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#FFE66D", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>⚠️ Pendientes</div>
          {pendingItems.map((item, i) => (
            <div key={i} style={{ fontSize: 13, color: "#C8CDD8", padding: "4px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "#FFE66D", flexShrink: 0 }} />
              Falta confirmación: {item}
            </div>
          ))}
        </Card>
      )}

      {topCategory && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Mayor gasto</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{CATEGORIES.find((c) => c.id === topCategory[0])?.icon || "📦"}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#E8ECF4" }}>{CATEGORIES.find((c) => c.id === topCategory[0])?.label || topCategory[0]}</div>
              <div style={{ fontSize: 13, color: "#00D4AA", fontWeight: 600 }}>${topCategory[1].toLocaleString()}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Daily expense chart */}
      {(data.expenses || []).length > 0 && (() => {
        const byDay = {};
        (data.expenses || []).forEach((e) => { byDay[e.date] = (byDay[e.date] || 0) + (e.amount || 0); });
        const days = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
        const maxAmt = Math.max(...days.map(d => d[1]));
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        return (
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Gastos por día</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
              {days.map(([date, amt]) => {
                const d = new Date(date + "T12:00:00");
                const label = dayNames[d.getDay()] + " " + d.getDate();
                const pct = maxAmt > 0 ? (amt / maxAmt) * 100 : 0;
                return (
                  <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: "#00D4AA", fontWeight: 700 }}>${amt}</div>
                    <div style={{ width: "100%", maxWidth: 32, height: `${Math.max(pct, 8)}%`, background: "linear-gradient(180deg, #00D4AA, #00B4D8)", borderRadius: "4px 4px 0 0", transition: "height 0.5s", minHeight: 4 }} />
                    <div style={{ fontSize: 9, color: "#6B7280", whiteSpace: "nowrap" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

    </div>
  );
}

function FlightsSection({ data, updateData }) {
  const update = (id, field, val) => {
    const flights = (data.flights || []).map((f) => (f.id === id ? { ...f, [field]: val } : f));
    updateData({ ...data, flights });
  };

  const getFlightLinks = (flight) => {
    if (!flight.flightNumber) return null;
    const num = flight.flightNumber.replace(/\s/g, '');
    return {
      google: `https://www.google.com/search?q=vuelo+${num}+${flight.date || ''}`,
      flightaware: `https://www.flightaware.com/live/flight/${num}`,
    };
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>✈️ Vuelos</div>
      {(data.flights || []).map((flight) => {
        const links = getFlightLinks(flight);
        return (
        <Card key={flight.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8ECF4", textTransform: "uppercase" }}>
              {flight.type === "ida" ? "🛫 Ida" : "🛬 Vuelta"} — {flight.from} → {flight.to}
            </div>
            <select value={flight.status} onChange={(e) => update(flight.id, "status", e.target.value)}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8ECF4", padding: "4px 8px", fontSize: 12 }}>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Aerolínea" value={flight.airline} onChange={(v) => update(flight.id, "airline", v)} />
            <Input label="Nro Vuelo" value={flight.flightNumber} onChange={(v) => update(flight.id, "flightNumber", v)} placeholder="AA1234" />
            <Input label="Fecha" value={flight.date} onChange={(v) => update(flight.id, "date", v)} type="date" />
            <Input label="Hora" value={flight.time} onChange={(v) => update(flight.id, "time", v)} type="time" />
          </div>
          <Input label="Código Confirmación" value={flight.confirmation} onChange={(v) => update(flight.id, "confirmation", v)} placeholder="ABC123" />
          <Input label="Notas" value={flight.notes} onChange={(v) => update(flight.id, "notes", v)} placeholder="Terminal, gate, etc." />
          {links && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <a href={links.google} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", background: "rgba(0,180,216,0.08)", borderRadius: 10, textDecoration: "none", border: "1px solid rgba(0,180,216,0.15)" }}>
                <span style={{ fontSize: 14 }}>🔍</span>
                <span style={{ fontSize: 12, color: "#00B4D8", fontWeight: 600 }}>Google</span>
              </a>
              <a href={links.flightaware} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", background: "rgba(0,212,170,0.08)", borderRadius: 10, textDecoration: "none", border: "1px solid rgba(0,212,170,0.15)" }}>
                <span style={{ fontSize: 14 }}>📡</span>
                <span style={{ fontSize: 12, color: "#00D4AA", fontWeight: 600 }}>FlightAware</span>
              </a>
            </div>
          )}
        </Card>
        );
      })}
    </div>
  );
}

function HotelSection({ data, updateData }) {
  const h = data.hotel || {};
  const update = (field, val) => updateData({ ...data, hotel: { ...h, [field]: val } });
  const nights = h.checkIn && h.checkOut ? Math.max(0, Math.ceil((new Date(h.checkOut) - new Date(h.checkIn)) / 86400000)) : 0;

  // Extract Google Maps URL from notes
  const { urls: noteUrls, cleanText: cleanNotes } = extractUrls(h.notes);
  const mapsUrl = noteUrls.find(isGoogleMapsUrl);
  const otherUrls = noteUrls.filter(u => !isGoogleMapsUrl(u));

  // Coordinates for The Tides, Hollywood FL
  const hotelLat = 26.0194;
  const hotelLon = -80.1170;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>🏠 Airbnb</div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <StatusBadge status={h.confirmation ? "confirmado" : "pendiente"} />
          {nights > 0 && <span style={{ fontSize: 13, color: "#8892A4" }}>{nights} noches</span>}
        </div>
        <Input label="Nombre" value={h.name} onChange={(v) => update("name", v)} placeholder="Nombre del Airbnb" />
        <Input label="Dirección" value={h.address} onChange={(v) => update("address", v)} placeholder="Dirección o link de Google Maps" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Check-in" value={h.checkIn} onChange={(v) => update("checkIn", v)} type="date" />
          <Input label="Check-out" value={h.checkOut} onChange={(v) => update("checkOut", v)} type="date" />
        </div>
        <Input label="Confirmación" value={h.confirmation} onChange={(v) => update("confirmation", v)} placeholder="Código de reserva" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Costo Total (USD)" value={h.totalCost} onChange={(v) => update("totalCost", parseFloat(v) || 0)} type="number" />
          <div style={{ display: "flex", alignItems: "end", paddingBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={h.paid || false} onChange={(e) => update("paid", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#00D4AA" }} />
              <span style={{ fontSize: 13, color: "#E8ECF4" }}>Pagado</span>
            </label>
          </div>
        </div>
        <Input label="Notas" value={h.notes} onChange={(v) => update("notes", v)} placeholder="WiFi, parking, link de Maps, etc." />

        {/* Google Maps Preview */}
        {mapsUrl && (
          <MapPreview
            url={mapsUrl}
            address={h.address || h.name}
            lat={hotelLat}
            lon={hotelLon}
          />
        )}

        {/* Other non-Maps links rendered as buttons */}
        {otherUrls.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {otherUrls.map((url, i) => (
              <ClickableLink key={i} url={url} label={url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CarSection({ data, updateData }) {
  const c = data.car || {};
  const update = (field, val) => updateData({ ...data, car: { ...c, [field]: val } });
  const days = c.pickUp && c.dropOff ? Math.max(0, Math.ceil((new Date(c.dropOff) - new Date(c.pickUp)) / 86400000)) : 0;
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>🚘 Auto Rental</div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <StatusBadge status={c.confirmation ? "confirmado" : "pendiente"} />
          {days > 0 && <span style={{ fontSize: 13, color: "#8892A4" }}>{days} días</span>}
        </div>
        <Input label="Compañía" value={c.company} onChange={(v) => update("company", v)} placeholder="Hertz, Avis, etc." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Pick-up" value={c.pickUp} onChange={(v) => update("pickUp", v)} type="date" />
          <Input label="Drop-off" value={c.dropOff} onChange={(v) => update("dropOff", v)} type="date" />
        </div>
        <Input label="Confirmación" value={c.confirmation} onChange={(v) => update("confirmation", v)} placeholder="Código de reserva" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Costo Total (USD)" value={c.totalCost} onChange={(v) => update("totalCost", parseFloat(v) || 0)} type="number" />
          <div style={{ display: "flex", alignItems: "end", paddingBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={c.paid || false} onChange={(e) => update("paid", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#00D4AA" }} />
              <span style={{ fontSize: 13, color: "#E8ECF4" }}>Pagado</span>
            </label>
          </div>
        </div>
        <Input label="Notas" value={c.notes} onChange={(v) => update("notes", v)} placeholder="Seguro, GPS, etc." />
      </Card>
    </div>
  );
}

function ExpensesSection({ data, updateData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "food", payment: "visa", bank: "galicia", date: new Date().toISOString().split("T")[0], notes: "" });

  const sendToSheets = async (expense) => {
    if (!SHEETS_URL || SHEETS_URL === "TU_APPS_SCRIPT_URL") return;
    try {
      const cat = CATEGORIES.find(c => c.id === expense.category);
      const pm = PAYMENT_METHODS.find(p => p.id === expense.payment);
      const bank = BANKS.find(b => b.id === expense.bank);
      await fetch(SHEETS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: expense.date,
          descripcion: expense.description,
          monto: expense.amount,
          categoria: cat?.label || expense.category,
          pago: pm?.label || expense.payment,
          banco: (expense.payment !== "cash" && bank) ? bank.label : "-",
          notas: expense.notes || "",
        }),
      });
    } catch (err) {
      console.error("Error enviando a Sheets:", err);
    }
  };

  const addExpense = () => {
    if (!form.description || !form.amount) return;
    const expense = { ...form, id: Date.now().toString(), amount: parseFloat(form.amount), createdAt: new Date().toISOString() };
    updateData({ ...data, expenses: [expense, ...(data.expenses || [])] });
    sendToSheets(expense);
    setForm({ description: "", amount: "", category: "food", payment: "visa", bank: "galicia", date: new Date().toISOString().split("T")[0], notes: "" });
    setAdding(false);
  };

  const deleteExpense = (id) => updateData({ ...data, expenses: (data.expenses || []).filter((e) => e.id !== id) });

  const expenses = data.expenses || [];
  const totalByCategory = {};
  expenses.forEach((e) => { totalByCategory[e.category] = (totalByCategory[e.category] || 0) + e.amount; });
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", fontFamily: "'Playfair Display', serif" }}>💰 Gastos</div>
        <Btn onClick={() => setAdding(!adding)} small>{adding ? "✕ Cerrar" : "+ Agregar"}</Btn>
      </div>

      {total > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const catInfo = CATEGORIES.find((c) => c.id === cat);
              return <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: `${catInfo?.color || "#9CA3AF"}15`, borderRadius: 20, fontSize: 12, color: catInfo?.color || "#9CA3AF", fontWeight: 600 }}>{catInfo?.icon} ${amt.toLocaleString()}</div>;
            })}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#8892A4" }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#00D4AA" }}>${total.toLocaleString()}</span>
          </div>
        </Card>
      )}

      {adding && (
        <Card style={{ marginBottom: 16, borderColor: "rgba(0,212,170,0.2)" }}>
          <Input label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="¿En qué gastaste?" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Monto (USD)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} type="number" placeholder="0.00" />
            <Input label="Fecha" value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Categoría</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setForm({ ...form, category: cat.id })} style={{ padding: "6px 12px", borderRadius: 20, border: form.category === cat.id ? `2px solid ${cat.color}` : "1px solid rgba(255,255,255,0.1)", background: form.category === cat.id ? `${cat.color}20` : "transparent", color: form.category === cat.id ? cat.color : "#8892A4", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Medio de pago</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PAYMENT_METHODS.map((pm) => (
                <button key={pm.id} onClick={() => setForm({ ...form, payment: pm.id })} style={{ padding: "6px 12px", borderRadius: 20, border: form.payment === pm.id ? `2px solid ${pm.color}` : "1px solid rgba(255,255,255,0.1)", background: form.payment === pm.id ? `${pm.color}25` : "transparent", color: form.payment === pm.id ? "#E8ECF4" : "#8892A4", fontSize: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <ColorDot color={pm.color} /> {pm.label}
                </button>
              ))}
            </div>
          </div>
          {form.payment !== "cash" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Banco</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BANKS.map((bank) => (
                  <button key={bank.id} onClick={() => setForm({ ...form, bank: bank.id })} style={{ padding: "6px 12px", borderRadius: 20, border: form.bank === bank.id ? `2px solid ${bank.color}` : "1px solid rgba(255,255,255,0.1)", background: form.bank === bank.id ? `${bank.color}25` : "transparent", color: form.bank === bank.id ? "#E8ECF4" : "#8892A4", fontSize: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <ColorDot color={bank.color} /> {bank.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Opcional" />
          <Btn onClick={addExpense} style={{ width: "100%" }}>Guardar Gasto</Btn>
        </Card>
      )}

      {expenses.length === 0 && !adding && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💸</div>
          <div style={{ fontSize: 14, color: "#8892A4" }}>Sin gastos aún. ¡Empezá a trackear!</div>
        </Card>
      )}

      {expenses.map((exp) => {
        const cat = CATEGORIES.find((c) => c.id === exp.category);
        const pm = PAYMENT_METHODS.find((p) => p.id === exp.payment);
        const bank = BANKS.find((b) => b.id === exp.bank);
        const payLabel = pm?.label || exp.payment;
        const bankLabel = (exp.payment !== "cash" && bank) ? ` · ${bank.label}` : "";
        return (
          <Card key={exp.id} style={{ marginBottom: 8, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cat?.color || "#9CA3AF"}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat?.icon || "📦"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E8ECF4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.description}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{exp.date} · {payLabel}{bankLabel}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#E8ECF4" }}>${exp.amount?.toLocaleString()}</div>
                <button onClick={() => deleteExpense(exp.id)} style={{ background: "none", border: "none", color: "#FF6B6B", fontSize: 11, cursor: "pointer", padding: "2px 0", opacity: 0.6 }}>eliminar</button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const DOC_CATEGORIES = [
  { id: "boarding", label: "Vuelos", icon: "🛫", color: "#F472B6" },
  { id: "airbnb", label: "Airbnb", icon: "🏡", color: "#FF5A5F" },
  { id: "car", label: "Auto Rental", icon: "🚘", color: "#34D399" },
  { id: "insurance", label: "Seguro", icon: "🛡️", color: "#60A5FA" },
  { id: "ticket", label: "Ticket Evento", icon: "🎫", color: "#A78BFA" },
  { id: "other", label: "Otro", icon: "📄", color: "#9CA3AF" },
];

function DocumentsSection({ data, updateData }) {
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null); // doc id being viewed
  const [editing, setEditing] = useState(false); // editing mode within detail
  const [editForm, setEditForm] = useState({ name: "", url: "", category: "boarding", confirmation: "", notes: "" });
  const [form, setForm] = useState({ name: "", url: "", category: "boarding", confirmation: "", notes: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const docs = data.documents || [];
  const viewDoc = docs.find(d => d.id === viewing);

  const add = () => {
    if (!form.name) return;
    updateData({ ...data, documents: [...docs, { ...form, id: Date.now().toString() }] });
    setForm({ name: "", url: "", category: "boarding", confirmation: "", notes: "" });
    setAdding(false);
  };
  const remove = (id) => {
    updateData({ ...data, documents: docs.filter(d => d.id !== id) });
    setViewing(null);
    setEditing(false);
    setConfirmDelete(false);
  };
  const openDetail = (doc) => {
    setViewing(doc.id);
    setEditing(false);
    setConfirmDelete(false);
    setAdding(false);
  };
  const startEdit = () => {
    if (!viewDoc) return;
    setEditForm({ name: viewDoc.name || "", url: viewDoc.url || "", category: viewDoc.category || "boarding", confirmation: viewDoc.confirmation || "", notes: viewDoc.notes || "" });
    setEditing(true);
    setConfirmDelete(false);
  };
  const saveEdit = () => {
    if (!viewing) return;
    const updated = docs.map(d => d.id === viewing ? { ...d, ...editForm } : d);
    updateData({ ...data, documents: updated });
    setEditing(false);
  };
  const goBack = () => {
    setViewing(null);
    setEditing(false);
    setConfirmDelete(false);
  };

  const grouped = {};
  DOC_CATEGORIES.forEach(c => { grouped[c.id] = docs.filter(d => d.category === c.id); });

  // ===== DETAIL VIEW =====
  if (viewDoc) {
    const cat = DOC_CATEGORIES.find(c => c.id === viewDoc.category);
    return (
      <div>
        {/* Back button */}
        <button onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#00D4AA", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "0 0 16px", letterSpacing: 0.3 }}>
          ← Documentos
        </button>

        <Card style={{ borderColor: `${cat?.color || "#9CA3AF"}30` }}>
          {/* Category badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat?.color || "#9CA3AF"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {cat?.icon || "📄"}
            </div>
            <span style={{ fontSize: 11, color: cat?.color || "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{cat?.label || "Documento"}</span>
          </div>

          {!editing ? (
            <>
              {/* Detail view */}
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E8ECF4", marginBottom: 16 }}>{viewDoc.name}</div>

              {viewDoc.confirmation && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Código confirmación</div>
                  <div style={{ fontSize: 15, color: "#00D4AA", fontWeight: 700, letterSpacing: 0.5 }}>🔑 {viewDoc.confirmation}</div>
                </div>
              )}

              {viewDoc.url && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Link</div>
                  <a href={viewDoc.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "rgba(0,180,216,0.08)", borderRadius: 10, textDecoration: "none", border: "1px solid rgba(0,180,216,0.15)", transition: "all 0.2s" }}>
                    <span style={{ fontSize: 16 }}>🔗</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#00B4D8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewDoc.url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewDoc.url}</div>
                    </div>
                    <span style={{ color: "#00B4D8", fontSize: 13, flexShrink: 0 }}>↗</span>
                  </a>
                </div>
              )}

              {viewDoc.notes && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Notas</div>
                  <div style={{ fontSize: 14, color: "#C8CDD8", lineHeight: 1.5 }}>{viewDoc.notes}</div>
                </div>
              )}

              {/* Action buttons at bottom */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
                <Btn onClick={startEdit} variant="secondary" small style={{ flex: 1 }}>✏️ Editar</Btn>
                {!confirmDelete ? (
                  <Btn onClick={() => setConfirmDelete(true)} variant="danger" small style={{ flex: 1 }}>🗑 Borrar</Btn>
                ) : (
                  <Btn onClick={() => remove(viewDoc.id)} variant="danger" small style={{ flex: 1, background: "rgba(255,107,107,0.3)" }}>¿Seguro? Confirmar</Btn>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Edit form */}
              <div style={{ marginTop: 4 }}>
                <Input label="Nombre" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} placeholder="Ej: Boarding Pass ida" />
                <Input label="Link (Google Drive, email, web)" value={editForm.url} onChange={(v) => setEditForm({ ...editForm, url: v })} placeholder="https://..." />
                <Input label="Código confirmación" value={editForm.confirmation} onChange={(v) => setEditForm({ ...editForm, confirmation: v })} placeholder="ABC123 (opcional)" />
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Categoría</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {DOC_CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => setEditForm({ ...editForm, category: c.id })} style={{ padding: "6px 12px", borderRadius: 20, border: editForm.category === c.id ? `2px solid ${c.color}` : "1px solid rgba(255,255,255,0.1)", background: editForm.category === c.id ? `${c.color}20` : "transparent", color: editForm.category === c.id ? c.color : "#8892A4", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                        {c.icon} {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label="Notas" value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} placeholder="Opcional" />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={saveEdit} small style={{ flex: 1 }}>✓ Guardar</Btn>
                  <Btn onClick={() => setEditing(false)} variant="secondary" small>Cancelar</Btn>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", fontFamily: "'Playfair Display', serif" }}>📁 Documentos</div>
        <Btn onClick={() => setAdding(!adding)} small>{adding ? "✕ Cerrar" : "+ Agregar"}</Btn>
      </div>

      {adding && (
        <Card style={{ marginBottom: 16, borderColor: "rgba(0,212,170,0.2)" }}>
          <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ej: Boarding Pass ida, Reserva Airbnb" />
          <Input label="Link (Google Drive, email, web)" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://..." />
          <Input label="Código confirmación" value={form.confirmation} onChange={(v) => setForm({ ...form, confirmation: v })} placeholder="ABC123 (opcional)" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Categoría</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DOC_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setForm({ ...form, category: cat.id })} style={{ padding: "6px 12px", borderRadius: 20, border: form.category === cat.id ? `2px solid ${cat.color}` : "1px solid rgba(255,255,255,0.1)", background: form.category === cat.id ? `${cat.color}20` : "transparent", color: form.category === cat.id ? cat.color : "#8892A4", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Opcional" />
          <Btn onClick={add} style={{ width: "100%" }}>Guardar Documento</Btn>
        </Card>
      )}

      {docs.length === 0 && !adding && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
          <div style={{ fontSize: 14, color: "#8892A4" }}>Guardá links a tus confirmaciones y documentos</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>Subí los PDFs a Google Drive y pegá el link acá</div>
        </Card>
      )}

      {DOC_CATEGORIES.map(cat => {
        const catDocs = grouped[cat.id];
        if (!catDocs || catDocs.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: cat.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              {cat.icon} {cat.label}
            </div>
            {catDocs.map(doc => (
              <Card key={doc.id} onClick={() => openDetail(doc)} style={{ marginBottom: 8, padding: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#E8ECF4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                    {doc.confirmation && (
                      <div style={{ fontSize: 11, color: "#00D4AA", fontWeight: 600, marginTop: 3 }}>🔑 {doc.confirmation}</div>
                    )}
                  </div>
                  <span style={{ color: "#4B5563", fontSize: 14, flexShrink: 0 }}>›</span>
                </div>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ItinerarySection({ data, updateData }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ date: "", title: "", activities: "", notes: "" });

  const add = () => {
    if (!form.date || !form.title) return;
    const item = { ...form, id: Date.now().toString() };
    updateData({ ...data, itinerary: [...(data.itinerary || []), item].sort((a, b) => a.date.localeCompare(b.date)) });
    setForm({ date: "", title: "", activities: "", notes: "" }); setAdding(false);
  };
  const remove = (id) => { updateData({ ...data, itinerary: (data.itinerary || []).filter((i) => i.id !== id) }); setEditing(null); };
  const updateDay = (id, field, val) => {
    const itinerary = (data.itinerary || []).map((d) => (d.id === id ? { ...d, [field]: val } : d));
    updateData({ ...data, itinerary: itinerary.sort((a, b) => a.date.localeCompare(b.date)) });
  };

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", fontFamily: "'Playfair Display', serif" }}>📋 Itinerario</div>
        <Btn onClick={() => setAdding(!adding)} small>{adding ? "✕ Cerrar" : "+ Agregar día"}</Btn>
      </div>
      {adding && (
        <Card style={{ marginBottom: 16, borderColor: "rgba(0,212,170,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Fecha" value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" />
            <Input label="Título del día" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Ej: South Beach" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Actividades (una por línea)</label>
            <textarea value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} placeholder={"9:00 - Desayuno\n11:00 - South Beach\n13:00 - Almuerzo\n16:00 - Wynwood Walls"} rows={5}
              style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8ECF4", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>
          <Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <Btn onClick={add} style={{ width: "100%" }}>Guardar Día</Btn>
        </Card>
      )}
      {(data.itinerary || []).length === 0 && !adding && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🗓️</div>
          <div style={{ fontSize: 14, color: "#8892A4" }}>Planificá tu itinerario día por día</div>
        </Card>
      )}
      {(data.itinerary || []).map((day, idx) => {
        const isEditing = editing === day.id;
        const d = day.date ? new Date(day.date + "T12:00:00") : null;
        const dayLabel = d ? dayNames[d.getDay()] : "";
        const today = new Date().toISOString().split("T")[0];
        const isToday = day.date === today;

        return (
          <Card key={day.id} style={{ marginBottom: 12, borderColor: isToday ? "rgba(0,212,170,0.4)" : undefined, background: isToday ? "rgba(0,212,170,0.06)" : undefined, boxShadow: isToday ? "0 0 20px rgba(0,212,170,0.1)" : undefined }}>
            {isToday && <div style={{ fontSize: 10, color: "#00D4AA", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: "#00D4AA", animation: "pulse 1.5s infinite" }} /> Hoy</div>}
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "#00D4AA", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  {dayLabel} {day.date?.slice(5)} — Día {idx + 1}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#E8ECF4", marginTop: 4 }}>{day.title}</div>
              </div>
              {!isEditing && (
                <button onClick={() => setEditing(day.id)} style={{ background: "none", border: "none", color: "#8892A4", fontSize: 12, cursor: "pointer", padding: "2px 6px" }}>✏️</button>
              )}
              {isEditing && (
                <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: "#00D4AA", fontSize: 11, cursor: "pointer", padding: "2px 6px", fontWeight: 600 }}>▲ Cerrar</button>
              )}
            </div>

            {/* Normal view - always visible */}
            {day.activities && (
              <div style={{ marginTop: 4 }}>
                {day.activities.split("\n").filter(Boolean).map((act, i) => {
                  const urlMatch = act.match(/(https?:\/\/[^\s]+)/);
                  if (urlMatch) {
                    const parts = act.split(urlMatch[0]);
                    return (
                      <div key={i} style={{ fontSize: 13, color: "#C8CDD8", padding: "4px 0", display: "flex", gap: 8 }}>
                        <span style={{ color: "#00D4AA", flexShrink: 0 }}>›</span>
                        <span>{parts[0]}<a href={urlMatch[0]} target="_blank" rel="noopener noreferrer" style={{ color: "#00B4D8", textDecoration: "none", fontWeight: 600 }}>{urlMatch[0].replace(/https?:\/\/(www\.)?/, '').split('/')[0]}</a>{parts[1]}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} style={{ fontSize: 13, color: "#C8CDD8", padding: "4px 0", display: "flex", gap: 8 }}>
                      <span style={{ color: "#00D4AA", flexShrink: 0 }}>›</span>{act}
                    </div>
                  );
                })}
              </div>
            )}
            {day.notes && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 8, fontStyle: "italic" }}>{day.notes}</div>}

            {/* Edit mode - shown below the normal view */}
            {isEditing && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", animation: "fadeIn 0.2s ease" }}>
                <div style={{ fontSize: 11, color: "#00D4AA", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Editar día</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input label="Fecha" value={day.date} onChange={(v) => updateDay(day.id, "date", v)} type="date" />
                  <Input label="Título" value={day.title} onChange={(v) => updateDay(day.id, "title", v)} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Actividades (una por línea)</label>
                  <textarea value={day.activities} onChange={(e) => updateDay(day.id, "activities", e.target.value)} rows={5}
                    style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8ECF4", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
                </div>
                <Input label="Notas" value={day.notes} onChange={(v) => updateDay(day.id, "notes", v)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => setEditing(null)} small style={{ flex: 1 }}>✓ Listo</Btn>
                  <Btn onClick={() => remove(day.id)} variant="danger" small>🗑</Btn>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ChecklistSection({ data, updateData }) {
  const [newItem, setNewItem] = useState("");
  const checklist = data.checklist || [];
  const checked = checklist.filter(i => i.checked).length;

  const toggle = (id) => {
    const updated = checklist.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    updateData({ ...data, checklist: updated });
  };
  const add = () => {
    if (!newItem.trim()) return;
    updateData({ ...data, checklist: [...checklist, { id: Date.now().toString(), text: newItem.trim(), checked: false }] });
    setNewItem("");
  };
  const remove = (id) => updateData({ ...data, checklist: checklist.filter(i => i.id !== id) });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", fontFamily: "'Playfair Display', serif" }}>✅ Equipaje</div>
        <span style={{ fontSize: 13, color: "#00D4AA", fontWeight: 700 }}>{checked}/{checklist.length}</span>
      </div>

      {checklist.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${checklist.length > 0 ? (checked / checklist.length) * 100 : 0}%`, background: "linear-gradient(90deg, #00D4AA, #00B4D8)", borderRadius: 3, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 11, color: "#8892A4", textAlign: "right" }}>{Math.round(checklist.length > 0 ? (checked / checklist.length) * 100 : 0)}% listo</div>
        </Card>
      )}

      {checklist.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <input type="checkbox" checked={item.checked} onChange={() => toggle(item.id)}
            style={{ width: 20, height: 20, accentColor: "#00D4AA", flexShrink: 0, cursor: "pointer" }} />
          <span style={{ flex: 1, fontSize: 14, color: item.checked ? "#6B7280" : "#E8ECF4", textDecoration: item.checked ? "line-through" : "none", transition: "all 0.2s" }}>{item.text}</span>
          <button onClick={() => remove(item.id)} style={{ background: "none", border: "none", color: "#FF6B6B", fontSize: 11, cursor: "pointer", opacity: 0.4, padding: "4px" }}>✕</button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Agregar item..."
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8ECF4", fontSize: 14, outline: "none" }} />
        <Btn onClick={add} small>+</Btn>
      </div>
    </div>
  );
}

// ========== MAIN APP ==========

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [tab, setTab] = useState("dashboard");
  const [synced, setSynced] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const isLocalUpdate = useRef(false);
  const saveTimeout = useRef(null);

  // Connect to Firebase on mount
  useEffect(() => {
    try {
      const unsubscribe = onTripData((firebaseData) => {
        if (!isLocalUpdate.current) {
          setData({ ...DEFAULT_DATA, ...firebaseData });
        }
        isLocalUpdate.current = false;
        setFirebaseReady(true);
        setSynced(true);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (err) {
      console.error('Firebase connection error:', err);
      // Fallback to localStorage
      try {
        const local = localStorage.getItem('miami-trip-2026');
        if (local) setData({ ...DEFAULT_DATA, ...JSON.parse(local) });
      } catch (e) {}
    }
  }, []);

  // Debounced save to Firebase
  const updateData = useCallback((newData) => {
    setData(newData);
    isLocalUpdate.current = true;
    setSynced(false);

    // Save to localStorage as backup
    try { localStorage.setItem('miami-trip-2026', JSON.stringify(newData)); } catch (e) {}

    // Debounce Firebase save (300ms)
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveTripData(newData).then(() => setSynced(true));
    }, 300);
  }, []);

  const sections = {
    dashboard: <DashboardSection data={data} updateData={updateData} />,
    flights: <FlightsSection data={data} updateData={updateData} />,
    hotel: <HotelSection data={data} updateData={updateData} />,
    car: <CarSection data={data} updateData={updateData} />,
    expenses: <ExpensesSection data={data} updateData={updateData} />,
    tickets: <DocumentsSection data={data} updateData={updateData} />,
    itinerary: <ItinerarySection data={data} updateData={updateData} />,
    checklist: <ChecklistSection data={data} updateData={updateData} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0A0E1A 0%, #111827 50%, #0D1117 100%)", color: "#E8ECF4", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "sticky", top: 0, background: "rgba(10,14,26,0.95)", backdropFilter: "blur(20px)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🌴</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, fontFamily: "'Playfair Display', serif" }}>Miami Trip</div>
            <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase" }}>Marzo 2026 · Hollywood Beach</div>
          </div>
        </div>
        <SyncIndicator synced={synced} />
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 24px" }}>{sections[tab]}</div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(10,14,26,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-around", padding: "6px 0 env(safe-area-inset-bottom, 8px)", zIndex: 20, overflowX: "auto" }}>
        <Tab active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon="🏠" label="Home" />
        <Tab active={tab === "flights"} onClick={() => setTab("flights")} icon="✈️" label="Vuelos" />
        <Tab active={tab === "hotel" || tab === "car"} onClick={() => setTab(tab === "hotel" ? "car" : "hotel")} icon="🏡" label="Aloj." />
        <Tab active={tab === "expenses"} onClick={() => setTab("expenses")} icon="💰" label="Gastos" badge={(data.expenses || []).length} />
        <Tab active={tab === "itinerary"} onClick={() => setTab("itinerary")} icon="📋" label="Plan" />
        <Tab active={tab === "tickets"} onClick={() => setTab("tickets")} icon="📁" label="Docs" badge={(data.documents || []).length || null} />
        <Tab active={tab === "checklist"} onClick={() => setTab("checklist")} icon="✅" label="Equipaje" badge={(data.checklist || []).filter(i => !i.checked).length || null} />
      </div>
    </div>
  );
}
