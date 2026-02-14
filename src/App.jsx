import { useState, useEffect, useRef, useCallback } from "react";
import { onTripData, saveTripData } from "./firebase";

// ========== CONSTANTS ==========

const WEATHER_LAT = 26.0112;
const WEATHER_LON = -80.1495;
const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,wind_speed_10m_max,uv_index_max&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&timezone=America/New_York&forecast_days=3`;

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
  { id: "visa", label: "Visa", icon: "💳", color: "#1A1F71" },
  { id: "mc", label: "MC", icon: "💳", color: "#EB001B" },
  { id: "amex", label: "Amex", icon: "💳", color: "#006FCF" },
  { id: "cash", label: "Cash", icon: "💵", color: "#16A34A" },
];

const BANKS = [
  { id: "visa_bank", label: "Visa", icon: "🏦", color: "#1A1F71" },
  { id: "bbva", label: "BBVA", icon: "🏦", color: "#004481" },
  { id: "icbc", label: "ICBC", icon: "🏦", color: "#C8102E" },
];

const DEFAULT_DATA = {
  flights: [
    { id: "f1", type: "ida", airline: "", flightNumber: "", from: "EZE", to: "MIA", date: "2026-03-17", time: "21:50", confirmation: "", status: "pendiente", notes: "Vuelo nocturno" },
    { id: "f2", type: "vuelta", airline: "", flightNumber: "", from: "MIA", to: "EZE", date: "2026-03-24", time: "17:55", confirmation: "", status: "pendiente", notes: "" },
  ],
  hotel: { name: "", address: "", checkIn: "2026-03-18", checkOut: "2026-03-24", confirmation: "", totalCost: 0, currency: "USD", notes: "", paid: false },
  car: { company: "", pickUp: "2026-03-18", dropOff: "2026-03-24", confirmation: "", totalCost: 0, currency: "USD", notes: "", paid: false },
  tickets: [],
  expenses: [],
  itinerary: [
    { id: "d1", date: "2026-03-17", title: "Vuelo de ida", activities: "21:50 - Vuelo EZE → MIA", notes: "Vuelo nocturno, llegar al aeropuerto ~19:00" },
    { id: "d2", date: "2026-03-18", title: "Llegada + Inter Miami ⚽", activities: "Llegada a Miami\nCheck-in hotel\nRetirar auto rental\n19:00 - Inter Miami ⚽", notes: "Partido a las 7pm" },
    { id: "d3", date: "2026-03-19", title: "Miami Heat vs Lakers 🏀", activities: "Día libre por Miami\n19:00 - Miami Heat vs Lakers 🏀", notes: "Partido a las 7pm" },
    { id: "d4", date: "2026-03-20", title: "Miami Open - Día completo 🎾", activities: "Miami Open 🎾 - Sesión diurna\nMiami Open 🎾 - Sesión nocturna", notes: "Día completo de tenis, sesión diurna + nocturna" },
    { id: "d5", date: "2026-03-21", title: "Miami Open - Sesión diurna 🎾", activities: "Miami Open 🎾 - Sesión diurna", notes: "Solo sesión diurna" },
    { id: "d6", date: "2026-03-22", title: "Día libre", activities: "Día libre para explorar\nSouth Beach\nLincoln Road\nOcean Drive", notes: "Sin planes fijos" },
    { id: "d7", date: "2026-03-23", title: "Miami Heat vs Spurs 🏀", activities: "Día libre por Miami\n19:00 - Miami Heat vs San Antonio Spurs 🏀", notes: "Partido a las 7pm" },
    { id: "d8", date: "2026-03-24", title: "Vuelta", activities: "Check-out hotel\nDevolver auto\n17:55 - Vuelo MIA → EZE", notes: "Salida 17:55" },
  ],
  budget: { total: 0, currency: "USD" },
};

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {daily.time.map((date, i) => {
          const d = new Date(date + "T12:00:00");
          const info = getWeatherInfo(daily.weathercode[i]);
          const isToday = i === 0;
          return (
            <Card key={date} style={{ padding: 14, textAlign: "center", borderColor: isToday ? "rgba(0,212,170,0.2)" : undefined, background: isToday ? "rgba(0,212,170,0.05)" : undefined }}>
              <div style={{ fontSize: 11, color: isToday ? "#00D4AA" : "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{isToday ? "Hoy" : dayNames[d.getDay()]}</div>
              <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{d.getDate()}</div>
              <div style={{ fontSize: 30, margin: "8px 0" }}>{info.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8ECF4" }}>{tempDisplay(daily.temperature_2m_max[i])}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{tempDisplay(daily.temperature_2m_min[i])}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: "#8892A4" }}>🌧 {daily.precipitation_probability_max[i]}%</div>
              <div style={{ fontSize: 10, color: "#8892A4", marginTop: 4 }}>UV {Math.round(daily.uv_index_max[i])} · 💨{Math.round(daily.wind_speed_10m_max[i])}</div>
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
          {data.budget?.total > 0 && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>de ${data.budget.total.toLocaleString()}</div>}
        </Card>
        <Card>
          <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Vuelos</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#60A5FA" }}>{confirmedFlights}/{(data.flights || []).length}</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>confirmados</div>
        </Card>
      </div>

      {data.budget?.total > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#8892A4" }}>Presupuesto</span>
            <span style={{ fontSize: 12, color: totalExpenses > data.budget.total ? "#FF6B6B" : "#00D4AA", fontWeight: 700 }}>{Math.round((totalExpenses / data.budget.total) * 100)}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (totalExpenses / data.budget.total) * 100)}%`, background: totalExpenses > data.budget.total ? "linear-gradient(90deg, #FF6B6B, #FF8E8E)" : "linear-gradient(90deg, #00D4AA, #00B4D8)", borderRadius: 3, transition: "width 0.5s" }} />
          </div>
        </Card>
      )}

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

      <Card>
        <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Presupuesto total (USD)</div>
        <input type="number" value={data.budget?.total || ""} onChange={(e) => updateData({ ...data, budget: { ...data.budget, total: parseFloat(e.target.value) || 0 } })} placeholder="Ej: 5000"
          style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8ECF4", fontSize: 16, outline: "none", boxSizing: "border-box" }} />
      </Card>
    </div>
  );
}

function FlightsSection({ data, updateData }) {
  const update = (id, field, val) => {
    const flights = (data.flights || []).map((f) => (f.id === id ? { ...f, [field]: val } : f));
    updateData({ ...data, flights });
  };
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>✈️ Vuelos</div>
      {(data.flights || []).map((flight) => (
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
        </Card>
      ))}
    </div>
  );
}

function HotelSection({ data, updateData }) {
  const h = data.hotel || {};
  const update = (field, val) => updateData({ ...data, hotel: { ...h, [field]: val } });
  const nights = h.checkIn && h.checkOut ? Math.max(0, Math.ceil((new Date(h.checkOut) - new Date(h.checkIn)) / 86400000)) : 0;
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>🏨 Hotel</div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <StatusBadge status={h.confirmation ? "confirmado" : "pendiente"} />
          {nights > 0 && <span style={{ fontSize: 13, color: "#8892A4" }}>{nights} noches</span>}
        </div>
        <Input label="Hotel" value={h.name} onChange={(v) => update("name", v)} placeholder="Nombre del hotel" />
        <Input label="Dirección" value={h.address} onChange={(v) => update("address", v)} placeholder="Dirección completa" />
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
        <Input label="Notas" value={h.notes} onChange={(v) => update("notes", v)} placeholder="WiFi, parking, etc." />
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
  const [form, setForm] = useState({ description: "", amount: "", category: "food", payment: "visa", bank: "visa_bank", date: new Date().toISOString().split("T")[0], notes: "" });

  const addExpense = () => {
    if (!form.description || !form.amount) return;
    const expense = { ...form, id: Date.now().toString(), amount: parseFloat(form.amount), createdAt: new Date().toISOString() };
    updateData({ ...data, expenses: [expense, ...(data.expenses || [])] });
    setForm({ description: "", amount: "", category: "food", payment: "visa", bank: "visa_bank", date: new Date().toISOString().split("T")[0], notes: "" });
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
                <button key={pm.id} onClick={() => setForm({ ...form, payment: pm.id })} style={{ padding: "6px 12px", borderRadius: 20, border: form.payment === pm.id ? `2px solid ${pm.color}` : "1px solid rgba(255,255,255,0.1)", background: form.payment === pm.id ? `${pm.color}25` : "transparent", color: form.payment === pm.id ? "#E8ECF4" : "#8892A4", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  {pm.icon} {pm.label}
                </button>
              ))}
            </div>
          </div>
          {form.payment !== "cash" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8892A4", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Banco</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BANKS.map((bank) => (
                  <button key={bank.id} onClick={() => setForm({ ...form, bank: bank.id })} style={{ padding: "6px 12px", borderRadius: 20, border: form.bank === bank.id ? `2px solid ${bank.color}` : "1px solid rgba(255,255,255,0.1)", background: form.bank === bank.id ? `${bank.color}25` : "transparent", color: form.bank === bank.id ? "#E8ECF4" : "#8892A4", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                    {bank.icon} {bank.label}
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

function TicketsSection({ data, updateData }) {
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", date: "", time: "", venue: "", confirmation: "", cost: "", notes: "" });

  const add = () => {
    if (!form.name) return;
    const ticket = { ...form, id: Date.now().toString(), cost: parseFloat(form.cost) || 0 };
    updateData({ ...data, tickets: [...(data.tickets || []), ticket] });
    setForm({ name: "", date: "", time: "", venue: "", confirmation: "", cost: "", notes: "" }); setAdding(false);
  };
  const remove = (id) => { updateData({ ...data, tickets: (data.tickets || []).filter((t) => t.id !== id) }); setExpanded(null); setEditing(null); };
  const updateTicket = (id, field, val) => {
    const tickets = (data.tickets || []).map((t) => (t.id === id ? { ...t, [field]: val } : t));
    updateData({ ...data, tickets });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8ECF4", fontFamily: "'Playfair Display', serif" }}>🎫 Tickets & Entradas</div>
        <Btn onClick={() => setAdding(!adding)} small>{adding ? "✕ Cerrar" : "+ Agregar"}</Btn>
      </div>
      {adding && (
        <Card style={{ marginBottom: 16, borderColor: "rgba(0,212,170,0.2)" }}>
          <Input label="Evento / Lugar" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Everglades, NBA game, etc." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Fecha" value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" />
            <Input label="Hora" value={form.time} onChange={(v) => setForm({ ...form, time: v })} type="time" />
          </div>
          <Input label="Lugar" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} placeholder="Dirección o venue" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Confirmación" value={form.confirmation} onChange={(v) => setForm({ ...form, confirmation: v })} />
            <Input label="Costo (USD)" value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} type="number" />
          </div>
          <Input label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <Btn onClick={add} style={{ width: "100%" }}>Guardar Ticket</Btn>
        </Card>
      )}
      {(data.tickets || []).length === 0 && !adding && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎟️</div>
          <div style={{ fontSize: 14, color: "#8892A4" }}>Agregá tus tickets y entradas</div>
        </Card>
      )}
      {(data.tickets || []).map((t) => {
        const isOpen = expanded === t.id;
        const isEditing = editing === t.id;
        return (
          <Card key={t.id} style={{ marginBottom: 10, cursor: "pointer", borderColor: isOpen ? "rgba(0,212,170,0.2)" : undefined }} onClick={() => { if (!isEditing) setExpanded(isOpen ? null : t.id); }}>
            {/* Header row - always visible */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#E8ECF4" }}>{t.name}</div>
                  <span style={{ fontSize: 10, color: "#8892A4", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </div>
                <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>{t.date && `📅 ${t.date}`} {t.time && `· ${t.time}`}</div>
              </div>
              {t.cost > 0 && <div style={{ fontSize: 15, fontWeight: 700, color: "#E8ECF4", flexShrink: 0 }}>${t.cost}</div>}
            </div>

            {/* Expanded details */}
            {isOpen && !isEditing && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", animation: "fadeIn 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
                {t.venue && <div style={{ fontSize: 13, color: "#C8CDD8", marginBottom: 8 }}>📍 {t.venue}</div>}
                {t.confirmation && <div style={{ fontSize: 13, color: "#00D4AA", marginBottom: 8, fontWeight: 600 }}>🔑 Confirmación: {t.confirmation}</div>}
                {t.cost > 0 && <div style={{ fontSize: 13, color: "#C8CDD8", marginBottom: 8 }}>💰 Costo: ${t.cost}</div>}
                {t.notes && (
                  <div style={{ fontSize: 13, color: "#C8CDD8", marginBottom: 8, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 10, lineHeight: 1.6 }}>
                    📝 {t.notes}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn onClick={() => setEditing(t.id)} variant="secondary" small>✏️ Editar</Btn>
                  <Btn onClick={() => remove(t.id)} variant="danger" small>🗑 Eliminar</Btn>
                </div>
              </div>
            )}

            {/* Edit mode */}
            {isOpen && isEditing && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", animation: "fadeIn 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
                <Input label="Evento / Lugar" value={t.name} onChange={(v) => updateTicket(t.id, "name", v)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input label="Fecha" value={t.date} onChange={(v) => updateTicket(t.id, "date", v)} type="date" />
                  <Input label="Hora" value={t.time} onChange={(v) => updateTicket(t.id, "time", v)} type="time" />
                </div>
                <Input label="Lugar" value={t.venue} onChange={(v) => updateTicket(t.id, "venue", v)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input label="Confirmación" value={t.confirmation} onChange={(v) => updateTicket(t.id, "confirmation", v)} />
                  <Input label="Costo (USD)" value={t.cost} onChange={(v) => updateTicket(t.id, "cost", parseFloat(v) || 0)} type="number" />
                </div>
                <Input label="Notas" value={t.notes} onChange={(v) => updateTicket(t.id, "notes", v)} />
                <Btn onClick={() => setEditing(null)} small style={{ width: "100%" }}>✓ Listo</Btn>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ItinerarySection({ data, updateData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", title: "", activities: "", notes: "" });

  const add = () => {
    if (!form.date || !form.title) return;
    const item = { ...form, id: Date.now().toString() };
    updateData({ ...data, itinerary: [...(data.itinerary || []), item].sort((a, b) => a.date.localeCompare(b.date)) });
    setForm({ date: "", title: "", activities: "", notes: "" }); setAdding(false);
  };
  const remove = (id) => updateData({ ...data, itinerary: (data.itinerary || []).filter((i) => i.id !== id) });

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
      {(data.itinerary || []).map((day, idx) => (
        <Card key={day.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "#00D4AA", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Día {idx + 1} — {day.date}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#E8ECF4", marginTop: 4 }}>{day.title}</div>
            </div>
            <button onClick={() => remove(day.id)} style={{ background: "none", border: "none", color: "#FF6B6B", fontSize: 11, cursor: "pointer", opacity: 0.6 }}>eliminar</button>
          </div>
          {day.activities && (
            <div style={{ marginTop: 8 }}>
              {day.activities.split("\n").filter(Boolean).map((act, i) => (
                <div key={i} style={{ fontSize: 13, color: "#C8CDD8", padding: "4px 0", display: "flex", gap: 8 }}>
                  <span style={{ color: "#00D4AA", flexShrink: 0 }}>›</span>{act}
                </div>
              ))}
            </div>
          )}
          {day.notes && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 8, fontStyle: "italic" }}>{day.notes}</div>}
        </Card>
      ))}
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
    tickets: <TicketsSection data={data} updateData={updateData} />,
    itinerary: <ItinerarySection data={data} updateData={updateData} />,
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
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(10,14,26,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-around", padding: "6px 0 env(safe-area-inset-bottom, 8px)", zIndex: 20 }}>
        <Tab active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon="🏠" label="Home" />
        <Tab active={tab === "flights"} onClick={() => setTab("flights")} icon="✈️" label="Vuelos" />
        <Tab active={tab === "hotel" || tab === "car"} onClick={() => setTab(tab === "hotel" ? "car" : "hotel")} icon="🏨" label="Hotel/Auto" />
        <Tab active={tab === "expenses"} onClick={() => setTab("expenses")} icon="💰" label="Gastos" badge={(data.expenses || []).length} />
        <Tab active={tab === "tickets"} onClick={() => setTab("tickets")} icon="🎫" label="Tickets" badge={(data.tickets || []).length} />
        <Tab active={tab === "itinerary"} onClick={() => setTab("itinerary")} icon="📋" label="Itinerario" />
      </div>
    </div>
  );
}
