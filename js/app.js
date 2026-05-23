const IVA = 0.21;
const LS_KEY = 'entregable2_carrito';
let carrito = [];
let productos = []; 

// DOM
const form = document.getElementById('product-form');
const cartArea = document.getElementById('cart-area');
const subtotalEl = document.getElementById('subtotal');
const ivaEl = document.getElementById('iva');
const totalEl = document.getElementById('total');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const productListEl = document.getElementById('product-list');

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function guardarLocalStorage() {
  localStorage.setItem(LS_KEY, JSON.stringify(carrito));
}

function cargarLocalStorage() {
  const raw = localStorage.getItem(LS_KEY);
  carrito = raw ? JSON.parse(raw) : [];
}

// formateo de moneda 
function formatearMoney(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// cálculo robusto 
function calcularTotales() {
  let subtotal = 0;
  for (const item of carrito) {
    subtotal += Number(item.precio || 0);
  }
  const iva = subtotal * IVA;
  const total = subtotal + iva;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    iva: Number(iva.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

// render del carrito 
function renderCarrito() {
  if (carrito.length === 0) {
    cartArea.innerHTML = `<div class="empty-cart"> <span>🛒</span> Tu carrito está vacío </div>`;
  } else {
    let html = '<table id="cart-table"><thead><tr><th>#</th><th>Producto</th><th>Precio</th><th>Acción</th></tr></thead><tbody>';
    carrito.forEach((item, idx) => {
      html += `<tr>
        <td>${idx + 1}</td>
        <td>${item.nombre}</td>
        <td>$${formatearMoney(item.precio)}</td>
        <td><button class="btn-remove" data-id="${item.id}">Eliminar</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    cartArea.innerHTML = html;

    // delegación de eventos: agrego listeners a botones generados
    cartArea.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        confirmarEliminar(id);
      });
    });
  }

  const totales = calcularTotales();
  subtotalEl.textContent = `$${formatearMoney(totales.subtotal)}`;
  ivaEl.textContent = `$${formatearMoney(totales.iva)}`;
  totalEl.textContent = `$${formatearMoney(totales.total)}`;
}

// render de lista de productos 
function renderProductos() {
  if (!productListEl) return;
  productListEl.innerHTML = "";
  if (!productos.length) {
    productListEl.innerHTML = '<p>No hay productos para mostrar.</p>';
    return;
  }

  let html = '<div class="product-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">';
  productos.forEach(p => {
    html += `<article class="product-card" style="border:1px solid #f0f2f5;padding:10px;border-radius:8px">
      <h4 style="margin:0 0 6px 0">${p.nombre}</h4>
      <p style="margin:0 0 8px 0;font-size:13px;color:#666">${p.desc || ''}</p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>$${formatearMoney(p.precio)} + IVA</strong>
        <button class="add-from-list" data-id="${p.id}">Agregar</button>
      </div>
    </article>`;
  });
  html += '</div>';
  productListEl.innerHTML = html;

  productListEl.querySelectorAll('.add-from-list').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = btn.dataset.id;
      const p = productos.find(x => x.id === prodId);
      if (p) {
        agregarProductoDOM(p.nombre, p.precio);
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `${p.nombre} agregado al carrito`,
          showConfirmButton: false,
          timer: 1400
        });
      }
    });
  });
}

// agregar producto desde formulario manual o desde lista
function agregarProductoDOM(nombre, precio) {
  const name = String(nombre).trim();
  const p = Number(precio);
  if (!name || isNaN(p) || p <= 0) {
    Swal.fire({ icon: 'warning', 
                title: 'Datos inválidos', 
                text: 'Ingrese nombre y precio válidos.' });
    return;
  }

  // Buscar producto en el catálogo
  const productoCatalogo = productos.find(prod =>
    prod.nombre.toLowerCase() === name.toLowerCase()
  );

  // Si NO existe dar error
  if (!productoCatalogo) {
    Swal.fire({
      icon: 'error',
      title: 'Producto inexistente',
      text: `El producto "${name}" no existe en el catálogo. Debe seleccionar uno válido.`
    });
    return;
  }

  // Si el precio NO coincide dar error
  if (p !== productoCatalogo.precio) {
    Swal.fire({
      icon: 'error',
      title: 'Precio incorrecto',
      text: `El precio ingresado ($${p}) no coincide con el precio real del producto (${productoCatalogo.nombre}: $${productoCatalogo.precio}).`
    });
    return;
  }

  // Si todo coincide agregar
  
  carrito.push({ 
    id: generarId(), 
    nombre: name, 
    precio: Number(p.toFixed(2)) 
  });
  guardarLocalStorage();
  renderCarrito();
}

function eliminarProducto(id) {
  carrito = carrito.filter(item => item.id !== id);
  guardarLocalStorage();
  renderCarrito();
}

function vaciarCarrito() {
  carrito = [];
  guardarLocalStorage();
  renderCarrito();
}

function exportarJSON() {
  const blob = new Blob([JSON.stringify(carrito, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'entregable2_carrito.json';
  a.click();
  URL.revokeObjectURL(a.href);
  Swal.fire({ icon: 'success', title: 'Exportado', text: 'Archivo descargado.' });
}

function importarJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('JSON inválido');
      carrito = imported.map(item => ({ id: item.id || generarId(), nombre: item.nombre, precio: Number(item.precio) }));
      guardarLocalStorage();
      renderCarrito();
      Swal.fire({ icon: 'success', title: 'Importado', text: 'Carrito actualizado desde archivo.' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'JSON inválido o formato incorrecto.' });
    }
  };
  reader.readAsText(file);
}

// confirmaciones con SweetAlert2
function confirmarEliminar(id) {
  Swal.fire({
    title: 'Eliminar producto',
    text: '¿Querés eliminar este producto del carrito?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      eliminarProducto(id);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Producto eliminado', showConfirmButton: false, timer: 1200 });
    }
  });
}

function confirmarVaciar() {
  Swal.fire({
    title: 'Vaciar carrito',
    text: 'Esto eliminará todos los productos. ¿Continuar?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, vaciar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      vaciarCarrito();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Carrito vaciado', showConfirmButton: false, timer: 1200 });
    }
  });
}

// carga asíncrona del JSON simulado (data/product.json)
async function cargarProductosRemotos() {
  try {
    const res = await fetch('./data/product.json');
    if (!res.ok) throw new Error('No se pudo cargar product.json');
    const data = await res.json();
    // validar formato básico
    if (!Array.isArray(data)) throw new Error('Formato de products.json inválido');
    productos = data.map(p => ({ id: p.id || generarId(), nombre: p.nombre, precio: Number(p.precio), desc: p.desc || '' }));
  } catch (err) {
    // mostrar error al usuario 
    Swal.fire({ icon: 'error', title: 'Error cargando productos', text: 'No se pudieron cargar los productos de data/products.json' });
    productos = [];
  }
}

function initApp() {
  cargarLocalStorage();
  renderCarrito();

  // carga remota simulada y render de productos
  cargarProductosRemotos().then(() => renderProductos());

  form.addEventListener('submit', e => {
    e.preventDefault();
    agregarProductoDOM(form.name.value, form.price.value);
    form.reset();
    form.name.focus();
  });

  clearBtn.addEventListener('click', confirmarVaciar);
  exportBtn.addEventListener('click', exportarJSON);
  importFile.addEventListener('change', e => { if (e.target.files[0]) importarJSON(e.target.files[0]); });
}

// Mostrar checkout
document.getElementById("btnCheckout").addEventListener("click", () => {
  if (carrito.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Carrito vacío',
      text: 'Debe agregar productos antes de continuar.'
    });
    return;
  }

  document.getElementById("checkout").style.display = "block";
  window.scrollTo(0, document.body.scrollHeight);
});

// Confirmar compra
document.getElementById("confirmarCompra").addEventListener("click", () => {
  const nombre = document.getElementById("clienteNombre").value.trim();
  const telefono = document.getElementById("clienteTelefono").value.trim();
  const pago = document.getElementById("formaPago").value;
  const entrega = document.getElementById("formaEntrega").value;
  const direccion = document.getElementById("clienteDireccion").value.trim();
  const localidad = document.getElementById("clienteLocalidad").value.trim();

  if (!nombre || !telefono || !pago || !entrega || !direccion || !localidad) {
    Swal.fire({
      icon: 'error',
      title: 'Datos incompletos',
      text: 'Debe completar todos los campos obligatorios.'
    });
    return;
  }

  // VALIDACIÓN DEL TELÉFONO 
  if (telefono.length < 7 || telefono.length > 15) {
    Swal.fire({
      icon: 'error',
      title: 'Teléfono inválido',
      text: 'El teléfono debe tener entre 7 y 15 números.'
    });
    return;
  }

  // Crear listado simple de productos SIN tablas
  let listadoProductos = "";
  carrito.forEach(item => {
    listadoProductos += `
      <div style="margin-bottom:6px;">
        <b>${item.nombre}</b><br>
        Precio: $${formatearMoney(item.precio)}
      </div>
    `;
  });

  const totales = calcularTotales();

  Swal.fire({
    width: 600,
    icon: 'success',
    title: 'Comprobante de compra',
    html: `
      <h3 style="margin-bottom:10px">Datos del cliente</h3>
      <p><b>Nombre:</b> ${nombre}</p>
      <p><b>Teléfono:</b> ${telefono}</p>
      <p><b>Dirección:</b> ${direccion}</p>
      <p><b>Localidad:</b> ${localidad}</p>
      <p><b>Pago:</b> ${pago}</p>
      <p><b>Entrega:</b> ${entrega === "retiro" ? "Retiro en local" : "Envío a domicilio: " + direccion + ", " + localidad}</p>

      <div style="margin:12px 0; font-weight:bold;">------------------------------</div>

      <h3 style="margin-bottom:10px">Productos</h3>
      ${listadoProductos}

      <div style="margin:12px 0; font-weight:bold;">------------------------------</div>

      <h3 style="margin-bottom:10px">Totales</h3>
      <p><b>Subtotal:</b> $${formatearMoney(totales.subtotal)}</p>
      <p><b>IVA (21%):</b> $${formatearMoney(totales.iva)}</p>
      <p><b>Total:</b> $${formatearMoney(totales.total)}</p>
    `
  });

  carrito = [];
  guardarLocalStorage();
  renderCarrito();

  document.getElementById("clienteNombre").value = "";
  document.getElementById("clienteTelefono").value = "";
  document.getElementById("formaPago").value = "";
  document.getElementById("formaEntrega").value = "";
  document.getElementById("clienteDireccion").value = "";
  document.getElementById("clienteLocalidad").value = "";
  
  document.getElementById("checkout").style.display = "none";
});

document.addEventListener('DOMContentLoaded', initApp);
document.getElementById("checkout").style.display = "none";

document.getElementById("clienteTelefono").addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
});
