# 🌴 Miami Trip Planner 2026

App para planificar el viaje a Miami con sync en tiempo real entre todos los que tengan el link.

**Features:** Dashboard con countdown, clima en vivo de Hollywood Beach, vuelos, hotel, auto, gastos con categorías, tickets/entradas, itinerario día por día. Todo sincronizado via Firebase.

---

## 🚀 SETUP COMPLETO (paso a paso)

### PASO 1: Crear proyecto en Firebase (GRATIS, sin tarjeta)

1. Andá a **https://console.firebase.google.com**
2. Logueate con tu cuenta de Google
3. Click en **"Crear un proyecto"** (o "Add project")
4. Ponele nombre: `miami-trip-planner`
5. Te pregunta por Google Analytics → **desactivalo** (no lo necesitamos), click "Crear proyecto"
6. Esperá unos segundos y click en **"Continuar"**

### PASO 2: Crear la base de datos (Realtime Database)

1. En el menú de la izquierda, buscá **"Compilación"** → **"Realtime Database"**
   (o "Build" → "Realtime Database" si está en inglés)
2. Click en **"Crear base de datos"**
3. Elegí la ubicación → **United States (us-central1)** está bien
4. **MUY IMPORTANTE:** Elegí **"Comenzar en modo de prueba"** (Start in test mode)
   - Esto permite que cualquiera lea/escriba por 30 días
   - Después podemos ajustar las reglas
5. Click en **"Habilitar"**

> ⚠️ El modo de prueba expira en 30 días. Para el viaje, después ajustamos las reglas.

### PASO 3: Registrar la app web

1. En la pantalla principal del proyecto, buscá el ícono **`</>`** (Web) y clickealo
2. Ponele nombre a la app: `miami-trip-web`
3. **NO** tildés "Firebase Hosting" (no lo necesitamos)
4. Click en **"Registrar app"**
5. Te va a mostrar un bloque de código con `firebaseConfig`. **COPIÁ ESOS VALORES.**

Va a verse algo así:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdef",
  authDomain: "miami-trip-planner-abc12.firebaseapp.com",
  databaseURL: "https://miami-trip-planner-abc12-default-rtdb.firebaseio.com",
  projectId: "miami-trip-planner-abc12",
  storageBucket: "miami-trip-planner-abc12.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### PASO 4: Pegar tus credenciales en el código

1. Abrí el archivo **`src/firebase.js`**
2. Reemplazá los valores de `firebaseConfig` con los que copiaste
3. Guardá el archivo

### PASO 5: Subir a GitHub

Si todavía no tenés Git instalado, bajalo de https://git-scm.com

```bash
# Entrá a la carpeta del proyecto
cd miami-trip-planner

# Instalá las dependencias
npm install

# Probá que funcione localmente
npm run dev
# Abrí http://localhost:5173/miami-trip-planner/ en el browser

# Si todo anda bien, subilo a GitHub:
git init
git add .
git commit -m "Miami Trip Planner 🌴"

# Creá un repo en github.com (click en + → New repository)
# Nombre: miami-trip-planner
# Dejalo público
# NO tildés "Add README" (ya tenemos uno)

# Conectá y subí:
git remote add origin https://github.com/TU_USUARIO/miami-trip-planner.git
git branch -M main
git push -u origin main
```

### PASO 6: Activar GitHub Pages

1. Andá a tu repo en GitHub
2. Click en **Settings** (la pestaña de arriba)
3. En el menú de la izquierda, click en **Pages**
4. En "Source", elegí **GitHub Actions**
5. Listo, ya se va a deployar automáticamente

En 1-2 minutos tu app va a estar en:
**`https://TU_USUARIO.github.io/miami-trip-planner/`**

Cada vez que hagas `git push`, se actualiza sola.

---

## 📱 Usarlo como app en el celular

Para que parezca una app nativa en el celular:

**iPhone:** Abrí el link en Safari → botón Compartir → "Agregar a pantalla de inicio"

**Android:** Abrí el link en Chrome → menú ⋮ → "Agregar a pantalla de inicio"

---

## 🔧 Estructura del proyecto

```
miami-trip-planner/
├── src/
│   ├── App.jsx          ← Componente principal (toda la app)
│   ├── firebase.js      ← Configuración Firebase (ACÁ VAN TUS CREDENCIALES)
│   ├── main.jsx         ← Entry point
│   └── index.css        ← Estilos globales
├── .github/
│   └── workflows/
│       └── deploy.yml   ← Auto-deploy a GitHub Pages
├── index.html
├── vite.config.js
└── package.json
```

---

## ❓ Troubleshooting

**"Permission denied" en Firebase**
→ Revisá que la Realtime Database esté en "modo de prueba". Andá a Realtime Database → Reglas, y asegurate que diga:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**La página sale en blanco en GitHub Pages**
→ Revisá que `vite.config.js` tenga `base: '/miami-trip-planner/'` (tiene que coincidir con el nombre de tu repo)

**No se cargan los datos entre dispositivos**
→ Revisá la consola del browser (F12 → Console) por errores de Firebase. Lo más común es que `databaseURL` esté mal copiado.

**Me pide tarjeta de crédito**
→ Asegurate de estar en el plan **Spark** (gratuito). Si te sale upgrade a Blaze, clickeá "No, thanks" o buscá "Spark plan" en la configuración del proyecto.
