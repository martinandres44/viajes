<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asados Tracker</title>
    
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="apple-touch-icon" href="https://img.icons8.com/emoji/160/fire.png">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    
    <style>
        :root { --main-blue: #003366; --accent-blue: #007bff; }
        body { background-color: #f4f7f6; padding: 20px; font-family: 'Segoe UI', sans-serif; }
        
        .card-main { max-width: 850px; margin: auto; border-radius: 15px; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header-asado { background: var(--main-blue); color: white; padding: 20px; text-align: center; }
        
        /* SEMÁFORO ESTRICTO */
        .semaforo-nada { color: #198754 !important; font-weight: 800 !important; } /* Verde */
        .semaforo-poco { color: #ffc107 !important; font-weight: 800 !important; } /* Amarillo */
        .semaforo-mucho { color: #dc3545 !important; font-weight: 800 !important; } /* ROJO FUERTE */
        
        .nav-link { color: #666; font-weight: bold; padding: 15px; border: none !important; }
        .nav-link.active { color: var(--main-blue) !important; background: white !important; }
        
        .total-box { background: #f8f9fa; border: 2px dashed var(--main-blue); padding: 15px; border-radius: 10px; text-align: center; margin-top: 15px;}
        .carbon-box { background: #212529; color: #ffca2c; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 1rem; font-weight: bold; display: flex; justify-content: space-between; align-items: center;}
        
        .corte-item { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #eee; padding: 10px; border-radius: 8px; margin-bottom: 5px; }
        .btn-edit { cursor: pointer; color: var(--main-blue); font-size: 1.3rem; }
        .btn-edit:hover { color: var(--accent-blue); }
    </style>
</head>
<body>

<div class="card-main">
    <div class="header-asado">
        <h2 class="mb-0">🔥 Asados Tracker</h2>
        <div class="mt-2 text-white-50 small">Asados en 2026: <span id="asadosAnio" class="badge bg-primary">0</span></div>
    </div>

    <ul class="nav nav-tabs nav-fill" id="asadoTabs">
        <li class="nav-item"><button class="nav-link active" id="tab-carga-btn" data-bs-toggle="tab" data-bs-target="#carga">REGISTRO</button></li>
        <li class="nav-item"><button class="nav-link" id="btn-historial" data-bs-toggle="tab" data-bs-target="#historial">HISTORIAL</button></li>
    </ul>

    <div class="tab-content p-4">
        <div class="tab-pane fade show active" id="carga">
            <form id="asadoForm">
                <input type="hidden" id="editRowIndex">
                <div class="row mb-3">
                    <div class="col-12"><label class="form-label fw-bold">Fecha</label><input type="date" id="fechaAsado" class="form-control"></div>
                </div>
                <div class="row mb-3">
                    <div class="col"><label class="form-label fw-bold">Adultos</label><input type="number" id="adultos" class="form-control" required></div>
                    <div class="col"><label class="form-label fw-bold">Niños</label><input type="number" id="niños" class="form-control"></div>
                </div>

                <div class="p-3 border rounded-3 bg-light mb-3">
                    <div class="input-group mb-2">
                        <select id="selectCorte" class="form-select" onchange="checkUnidad()">
                            <option value="">-- Seleccionar Corte --</option>
                            <option value="Vacío">Vacío</option><option value="Tira de Asado">Tira de Asado</option>
                            <option value="Entraña">Entraña</option><option value="Matambre">Matambre</option>
                            <option value="Picaña">Picaña</option><option value="Ojo de Bife">Ojo de Bife</option>
                            <option value="Chorizo">Chorizo</option><option value="Morcilla">Morcilla</option>
                            <option value="Provoleta">Provoleta</option><option value="Molleja">Molleja</option>
                            <option value="Lomo">Lomo</option>
                            <option value="Colita de Cuadril">Colita de Cuadril</option>
                            <option value="Bondiola">Bondiola</option>
                            <option value="Pollo">Pollo</option>
                        </select>
                        <input type="number" step="0.1" id="inputCant" class="form-control" placeholder="Cant." style="max-width: 90px;">
                        <span id="labelUnidad" class="input-group-text">Kg</span>
                    </div>
                    <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" id="inputPrecio" class="form-control" placeholder="Precio Total">
                        <button type="button" onclick="sumarCorte()" class="btn btn-success fw-bold">＋ AGREGAR</button>
                    </div>
                </div>

                <div id="listaCortesUI"></div>

                <div id="boxTotal" class="total-box mb-3" style="display:none;">
                    <div class="row">
                        <div class="col"><b>PESO TOTAL:</b> <br><span id="valTotal">0.0 Kg</span></div>
                        <div class="col"><b>GASTO TOTAL:</b> <br><span id="gastoTotal" class="text-success fw-bold">$0.0</span></div>
                    </div>
                    <div class="carbon-box">
                        <span>🪨 Carbón Sugerido:</span>
                        <span id="carbonSug" style="font-size: 1.2rem;">0 Kg</span>
                    </div>
                </div>

                <textarea id="notas" class="form-control mb-3" placeholder="Notas..."></textarea>
                
                <button type="submit" id="btnSubmit" class="btn btn-primary w-100 btn-lg shadow">REGISTRAR ASADO</button>
                <button type="button" id="btnCancelEdit" class="btn btn-outline-secondary w-100 mt-2" style="display:none;" onclick="cancelarEdicion()">CANCELAR EDICIÓN</button>
            </form>
        </div>

        <div class="tab-pane fade" id="historial">
            <h6 class="fw-bold mb-3">Últimos Registros</h6>
            <div id="tablaHistorial" class="table-responsive">
                <div class="alert alert-info">Cargando datos...</div>
            </div>
            <div class="text-center mt-4 pt-4 border-top" style="max-width: 500px; margin: auto;">
                <h6 class="fw-bold mb-3">Preferencia de Cortes (%)</h6>
                <canvas id="graficoCortes"></canvas>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
    // TU URL DE APPS SCRIPT
    const URL_SCRIPT = 'https://script.google.com/macros/s/AKfycbxtVShyFbd9mZqt6gZ5verdu7BFoX7eGrM_VHPuN3xCn0CaSvP12kU_U1gvyJ3jqvgf/exec'; 
    
    let listaActual = [];
    let registrosFull = [];
    let miGrafico = null;

    // FECHA AUTOMÁTICA HOY
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('fechaAsado').value = now.toISOString().slice(0,10);

    function checkUnidad() {
        const c = document.getElementById('selectCorte').value;
        const esU = ["Chorizo", "Morcilla", "Provoleta"].includes(c);
        document.getElementById('labelUnidad').innerText = esU ? "Unid." : "Kg";
    }

    function sumarCorte() {
        const n = document.getElementById('selectCorte').value;
        const q = parseFloat(document.getElementById('inputCant').value);
        const p = parseFloat(document.getElementById('inputPrecio').value) || 0;
        
        if (n && q > 0) {
            listaActual.push({ 
                nombre: n, 
                cantidad: q, 
                unidad: document.getElementById('labelUnidad').innerText, 
                precio: p 
            });
            renderizar();
            document.getElementById('selectCorte').value = ""; 
            document.getElementById('inputCant').value = ""; 
            document.getElementById('inputPrecio').value = "";
        } else {
            alert("Por favor elegí un corte y una cantidad válida.");
        }
    }

    function renderizar() {
        const kgTotal = listaActual.reduce((acc, i) => i.unidad === "Kg" ? acc + i.cantidad : acc, 0);
        const costoTotal = listaActual.reduce((acc, i) => acc + i.precio, 0);
        
        let carbonTotal = 0;
        listaActual.forEach(i => {
            let pesoParaCarbon = i.unidad === "Unid." ? i.cantidad * 0.15 : i.cantidad;
            let factor = 1.5; 
            if (["Tira de Asado", "Vacío"].includes(i.nombre)) factor = 2.0; 
            else if (["Entraña", "Molleja", "Chorizo", "Morcilla", "Provoleta"].includes(i.nombre)) factor = 1.0; 
            carbonTotal += (pesoParaCarbon * factor);
        });

        document.getElementById('boxTotal').style.display = listaActual.length ? 'block' : 'none';
        document.getElementById('valTotal').innerText = kgTotal.toFixed(1) + ' Kg';
        document.getElementById('gastoTotal').innerText = '$' + costoTotal.toLocaleString();
        
        const carbonFinal = carbonTotal > 0 && carbonTotal < 2 ? 2.0 : carbonTotal;
        document.getElementById('carbonSug').innerText = (listaActual.length ? carbonFinal.toFixed(1) : 0) + ' Kg';

        document.getElementById('listaCortesUI').innerHTML = listaActual.map((i, idx) => `
            <div class="corte-item shadow-sm small">
                <span><b>${i.nombre}</b> ($${i.precio.toLocaleString()})</span>
                <div>
                    <span class="badge bg-secondary me-2">${i.cantidad.toFixed(1)} ${i.unidad}</span>
                    <button type="button" onclick="listaActual.splice(${idx},1);renderizar();" class="btn btn-sm btn-danger py-0 px-2">✕</button>
                </div>
            </div>`).join('');
    }

    function actualizarEstadisticas() {
        const tablaDiv = document.getElementById('tablaHistorial');
        
        fetch(URL_SCRIPT)
        .then(r => r.json())
        .then(data => {
            if(!data || !Array.isArray(data)) {
                tablaDiv.innerHTML = '<div class="alert alert-warning">Sin datos.</div>';
                return;
            }
            registrosFull = data;
            
            const esteAnio = new Date().getFullYear();
            const count = data.filter(a => a.fecha && new Date(a.fecha).getFullYear() === esteAnio).length;
            document.getElementById('asadosAnio').innerText = count;
            
            const ultimos = [...data].reverse().slice(0, 10);
            
            tablaDiv.innerHTML = `
                <table class="table table-hover align-middle" style="font-size: 0.95rem;">
                    <thead class="table-light">
                        <tr>
                            <th>Fecha</th>
                            <th>Kg</th>
                            <th>$ Total</th>
                            <th>Sobras</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${ultimos.map(a => {
                        const sobrasVal = (a.sobras || "Pendiente").trim();
                        let semClase = 'text-muted';
                        if(sobrasVal === 'Mucho') { semClase = 'semaforo-mucho'; }
                        else if(sobrasVal === 'Poco') { semClase = 'semaforo-poco'; }
                        else if(sobrasVal === 'Nada') { semClase = 'semaforo-nada'; }

                        const fechaFmt = a.fecha ? new Date(a.fecha).toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', timeZone: 'UTC'}) : '-';
                        const pesoFmt = (parseFloat(a.pesototal)||0).toFixed(1);
                        const precioFmt = (parseFloat(a.gastototal)||0).toLocaleString();

                        return `<tr>
                            <td>${fechaFmt}</td>
                            <td>${pesoFmt}</td>
                            <td>$${precioFmt}</td>
                            <td>
                                <select onchange="actualizarSobrasRapido(${a.rowindex}, this)" class="form-select form-select-sm border-0 ${semClase}" style="width:95px; background:transparent; font-weight:bold; cursor:pointer;">
                                    <option value="Pendiente" ${sobrasVal==='Pendiente'?'selected':''}>?</option>
                                    <option value="Nada" ${sobrasVal==='Nada'?'selected':''} class="semaforo-nada">Nada</option>
                                    <option value="Poco" ${sobrasVal==='Poco'?'selected':''} class="semaforo-poco">Poco</option>
                                    <option value="Mucho" ${sobrasVal==='Mucho'?'selected':''} class="semaforo-mucho">Mucho</option>
                                </select>
                            </td>
                            <td class="text-end"><i class="bi bi-pencil-square btn-edit" onclick="cargarEdicion(${a.rowindex})"></i></td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>`;

            // Gráfico
            const conteo = {};
            data.forEach(a => { 
                const cortes = (a.corte || "").toString();
                if(cortes) cortes.split(",").forEach(c => { 
                    let k=c.trim(); 
                    if(k) conteo[k] = (conteo[k] || 0) + 1; 
                }); 
            });
            const totalCortes = Object.values(conteo).reduce((a, b) => a + b, 0);
            if (miGrafico) miGrafico.destroy();
            miGrafico = new Chart(document.getElementById('graficoCortes'), {
                type: 'pie',
                plugins: [ChartDataLabels],
                data: {
                    labels: Object.keys(conteo),
                    datasets: [{ 
                        data: Object.values(conteo), 
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
                            '#FF9F40', '#C9CBCF', '#76A346', '#8D6E63', '#E91E63'
                        ] 
                    }]
                },
                options: {
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            labels: { 
                                boxWidth: 12, 
                                font: { size: 14 } // LETRA GRANDE MANTENIDA
                            } 
                        },
                        datalabels: { color: '#fff', font: {weight: 'bold'}, formatter: (val) => ((val/totalCortes)*100).toFixed(0) + '%' }
                    }
                }
            });
        })
        .catch(err => {
            tablaDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
        });
    }

    function actualizarSobrasRapido(idx, el) {
        const nuevoValor = el.value;
        
        // CAMBIO VISUAL INSTANTÁNEO
        el.className = "form-select form-select-sm border-0"; // Limpiar clases
        if(nuevoValor === 'Mucho') el.classList.add('semaforo-mucho');
        else if(nuevoValor === 'Poco') el.classList.add('semaforo-poco');
        else if(nuevoValor === 'Nada') el.classList.add('semaforo-nada');
        else el.classList.add('text-muted');

        // GUARDAR EN BACKGROUND
        const asado = registrosFull.find(a => a.rowindex == idx);
        if(!asado) return;

        const data = {
            rowindex: idx,
            fecha: new Date(asado.fecha).toISOString().split('T')[0],
            adultos: asado.adultos,
            niños: asado.niños,
            corte: asado.corte,
            pesoPorCorte: asado.pesoporcorte || asado.cantidades,
            pesoTotal: asado.pesototal,
            gastoTotal: asado.gastototal,
            sobras: nuevoValor,
            notas: asado.notas
        };

        fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) })
        .then(() => console.log("Sobras actualizadas"))
        .catch(e => console.error("Error al guardar sobras"));
    }

    function cargarEdicion(idx) {
        const asado = registrosFull.find(a => a.rowindex == idx);
        if(!asado) { alert("Error: No encuentro el registro."); return; }
        
        document.getElementById('editRowIndex').value = idx;
        if(asado.fecha) {
            const f = new Date(asado.fecha);
            document.getElementById('fechaAsado').value = f.toISOString().split('T')[0];
        }
        document.getElementById('adultos').value = asado.adultos || 0;
        document.getElementById('niños').value = asado.niños || 0;
        document.getElementById('notas').value = asado.notas || "";
        
        listaActual = [];
        const rawCortes = (asado.corte || "").toString();
        const rawCantidades = (asado.pesoporcorte || asado.cantidades || "").toString();

        if (rawCortes) {
            const arrNombres = rawCortes.split(",");
            const arrCant = rawCantidades.split(",");
            arrNombres.forEach((nombreRaw, i) => {
                const nombre = nombreRaw.trim();
                if (nombre) {
                    const cantRaw = arrCant[i] ? arrCant[i].trim() : "0";
                    const num = parseFloat(cantRaw.replace(/[^\d.]/g, '')) || 0;
                    const unit = cantRaw.toLowerCase().includes("unid") ? "Unid." : "Kg";
                    listaActual.push({ nombre: nombre, cantidad: num, unidad: unit, precio: 0 });
                }
            });
        }
        renderizar();
        document.getElementById('btnSubmit').className = "btn btn-warning w-100 btn-lg shadow fw-bold";
        document.getElementById('btnSubmit').innerText = "GUARDAR CAMBIOS";
        document.getElementById('btnCancelEdit').style.display = "block";
        const tabBtn = document.getElementById('tab-carga-btn');
        const tabInstance = new bootstrap.Tab(tabBtn);
        tabInstance.show();
    }

    function cancelarEdicion() { location.reload(); }

    window.onload = actualizarEstadisticas;
    document.getElementById('btn-historial').addEventListener('click', actualizarEstadisticas);

    document.getElementById('asadoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const data = {
            rowindex: document.getElementById('editRowIndex').value,
            fecha: document.getElementById('fechaAsado').value,
            adultos: document.getElementById('adultos').value,
            niños: document.getElementById('niños').value || 0,
            corte: listaActual.map(i => i.nombre).join(", "),
            pesoPorCorte: listaActual.map(i => i.cantidad.toFixed(1) + i.unidad).join(", "),
            pesoTotal: listaActual.reduce((acc, i) => i.unidad === "Kg" ? acc + i.cantidad : acc, 0),
            gastoTotal: listaActual.reduce((acc, i) => acc + i.precio, 0),
            sobras: "Pendiente",
            notas: document.getElementById('notas').value
        };
        const btn = document.getElementById('btnSubmit');
        const txtOriginal = btn.innerText;
        btn.innerText = "GUARDANDO...";
        btn.disabled = true;

        fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) })
        .then(() => { alert("✅ ¡Guardado!"); location.reload(); })
        .catch(err => { alert("❌ Error: " + err); btn.innerText = txtOriginal; btn.disabled = false; });
    });
</script>
</body>
</html>
