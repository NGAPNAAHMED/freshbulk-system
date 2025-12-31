const { jsPDF } = window.jspdf;
let previewModal, successModal;

document.addEventListener('DOMContentLoaded', () => {
    previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    successModal = new bootstrap.Modal(document.getElementById('successModal'));
    document.getElementById('f-date').valueAsDate = new Date();
    loadHistory();
    addRow();
});

// --- ACCÈS ---
function togglePassword() {
    const passInput = document.getElementById('pass');
    const icon = document.getElementById('toggleIcon');
    if (passInput.type === "password") {
        passInput.type = "text";
        icon.classList.replace('bi-eye-slash', 'bi-eye');
    } else {
        passInput.type = "password";
        icon.classList.replace('bi-eye', 'bi-eye-slash');
    }
}

function checkAccess() {
    if (document.getElementById('pass').value === "012345") {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('app-screen').classList.remove('d-none');
        showNotif("Bienvenue, ISMAEL EL GRINGO");
    } else {
        showNotif("Accès refusé", "error");
    }
}

// --- CALCULS ---
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cleanNum(str) {
    if(!str) return 0;
    return parseFloat(str.toString().replace(/\s/g, '').replace(',', '.')) || 0;
}

function showNotif(msg, type = 'success') {
    const container = document.getElementById('notif-container');
    const n = document.createElement('div');
    n.className = `notif-push ${type === 'success' ? 'notif-success' : 'notif-error'}`;
    n.innerHTML = `<i class="bi ${type==='success'?'bi-check-circle-fill':'bi-x-circle-fill'} me-2"></i> ${msg}`;
    container.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 500); }, 3000);
}

function addRow(data = null) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control d-in" value="${data ? data.d : ''}" placeholder="Produit"></td>
        <td><input type="text" class="form-control c-in" value="${data ? data.c : ''}" placeholder="Ex: 10 kg" oninput="calculate()"></td>
        <td><input type="text" class="form-control p-in" value="${data ? data.p : ''}" placeholder="0" oninput="formatInput(this)"></td>
        <td class="text-end fw-bold line-total">0</td>
        <td class="text-center"><button onclick="this.closest('tr').remove(); calculate()" class="btn btn-link text-danger p-0"><i class="bi bi-trash3-fill"></i></button></td>
    `;
    document.getElementById('rows').appendChild(tr);
    if(data) calculate();
}

function formatInput(input) {
    let value = input.value.replace(/\D/g, '');
    input.value = formatNumber(value);
    calculate();
}

function calculate() {
    let grandTotal = 0;
    document.querySelectorAll('#rows tr').forEach(row => {
        const cond = row.querySelector('.c-in').value;
        const price = cleanNum(row.querySelector('.p-in').value);
        let mult = 1;
        let match = cond.match(/(\d+[.,]?\d*)/);
        if (match) mult = parseFloat(match[0].replace(',', '.'));
        const total = Math.round(mult * price);
        row.querySelector('.line-total').innerText = formatNumber(total);
        grandTotal += total;
    });
    document.getElementById('grand-total').innerText = formatNumber(grandTotal) + " FCFA";
    document.getElementById('total-words').innerText = numberToFrench(grandTotal) + " FRANCS CFA";
}

// --- PRÉVISUALISATION ---
function preVisualise() {
    const client = document.getElementById('client').value;
    if(!client) return showNotif("Veuillez indiquer le client", "error");
    
    let html = `<div class="p-3"><table class="table table-bordered">
        <thead class="table-dark"><tr><th>DESIGNATION</th><th>CONDITIONNEMENT</th><th>PRIX / kg</th><th>TOTAL</th></tr></thead>
        <tbody>`;
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if(d) html += `<tr><td>${d}</td><td>${c}</td><td>${p}</td><td>${t}</td></tr>`;
    });
    html += `</tbody></table><h5 class="text-end">TOTAL : ${document.getElementById('grand-total').innerText}</h5></div>`;
    document.getElementById('preview-body').innerHTML = html;
    previewModal.show();
}

// --- GÉNÉRATION PDF ---
async function downloadPDF() {
    const doc = new jsPDF();
    const client = document.getElementById('client').value.toUpperCase();
    const fNum = document.getElementById('f-num').value;
    const dateInput = document.getElementById('f-date').value;
    const grandTotal = document.getElementById('grand-total').innerText;
    
    doc.setFont("times", "normal");

    // --- 1. FILIGRANE (CENTRAGE ABSOLU) ---
    doc.saveGraphicsState();
    const gState = new doc.GState({opacity: 0.12});
    doc.setGState(gState);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(22).setFont("times", "bold");
    // 105 et 148 sont les coordonnées du centre d'une feuille A4
    doc.text("ETS FRESHBULK SERVICE LE ROI DES FRUITS & LEGUMES", 105, 148, { 
        angle: 45, align: 'center', baseline: 'middle'
    });
    doc.restoreGraphicsState();

    // --- 2. EN-TÊTE AVEC TES IMAGES LOCALES ---
    // Remplace logo1.png et logo2.png par tes vrais noms de fichiers
    try {
        doc.addImage('assets/logo1.png', 'PNG', 12, 8, 35, 30); // Image Gauche
        doc.addImage('assets/logo2.png', 'PNG', 163, 8, 35, 30); // Image Droite
    } catch (e) { 
        console.error("Vérifie que logo1.png et logo2.png sont bien dans le dossier assets"); 
    }

    doc.setTextColor(25, 135, 84); // Vert
    doc.setFontSize(28).setFont("times", "bold");
    doc.text("ETS FRESHBULK SERVICE", 105, 20, { align: 'center' });

    doc.setTextColor(0);
    doc.setFontSize(11).setFont("times", "bold");
    doc.text("COMMERCE GENERAL", 105, 28, { align: 'center' });
    doc.setFontSize(10).setFont("times", "normal");
    doc.text("NIU : P119718171347Q", 105, 34, { align: 'center' });
    doc.text("BP : DOUALA Tel : 695 64 50 21", 105, 40, { align: 'center' });
    doc.setLineWidth(0.5).line(15, 45, 195, 45);

    // --- 3. TITRE ET DATE SOULIGNÉE ---
    doc.setFontSize(18).setFont("times", "bold");
    doc.text(`Facture ${fNum} : ${client}`, 105, 58, { align: 'center' });

    doc.setFontSize(12);
    const dStr = new Date(dateInput).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const fullDate = dStr.charAt(0).toUpperCase() + dStr.slice(1);
    const tWidth = doc.getTextWidth(fullDate);
    doc.text(fullDate, 105, 66, { align: 'center' });
    doc.line(105 - (tWidth/2), 67, 105 + (tWidth/2), 67);

    // --- 4. TABLEAU ---
    const rows = [];
    const itemsHistory = [];
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if(d) {
            rows.push([d, c, p, t]);
            itemsHistory.push({d, c, p});
        }
    });

    doc.autoTable({
        startY: 75,
        head: [['DESIGNATION', 'CONDITIONNEMENT', 'PRIX / kg', 'PRIX TOTAL (XAF)']],
        body: rows,
        theme: 'grid',
        styles: { font: "times", textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', fillColor: false },
        headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'left', cellWidth: 50 } },
        foot: [[
            { content: 'TOTAL', styles: { halign: 'center', fontStyle: 'bold' } },
            { content: '', colSpan: 2 },
            { content: grandTotal, styles: { halign: 'center', fontStyle: 'bold', fontSize: 13 } }
        ]],
        footStyles: { fillColor: [242, 242, 247], textColor: [0, 0, 0] }, // GRIS DOUX
        margin: { left: 25, right: 25 }
    });

    let y = doc.lastAutoTable.finalY + 15;

    // --- 5. MONTANT EN LETTRES ---
    doc.setFontSize(11).setFont("times", "normal");
    const label = "Arrêté la présente facture à la somme de : ";
    const words = document.getElementById('total-words').innerText;
    doc.text(label, 25, y);
    doc.setFont("times", "bold").text(words, 25 + doc.getTextWidth(label), y);

    // --- 6. SIGNATURES ---
    y += 20;
    doc.setFont("times", "normal");
    doc.text("LIVRÉ PAR :", 25, y);
    doc.text("RÉCEPTIONNÉ PAR :", 135, y);
    y += 10;
    doc.text("Signature :", 25, y);
    doc.text("Cachet & Signature :", 135, y);

    saveHistory({ num: fNum, client, total: grandTotal, date: dateInput, items: itemsHistory, time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) });

    doc.save(`Facture_${fNum}_${client}.pdf`);
    previewModal.hide();
    successModal.show();
}

// --- HISTORIQUE ---
function saveHistory(inv) {
    let history = JSON.parse(localStorage.getItem('fb_pro_v3_history')) || [];
    history = history.filter(h => h.num !== inv.num);
    history.unshift(inv);
    localStorage.setItem('fb_pro_v3_history', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const box = document.getElementById('history-box');
    const history = JSON.parse(localStorage.getItem('fb_pro_v3_history')) || [];
    box.innerHTML = history.length ? '' : '<p class="text-muted small text-center">Aucun historique.</p>';
    history.forEach(h => {
        const d = document.createElement('div');
        d.className = "history-item shadow-sm p-2 mb-2 bg-white rounded border-start border-success border-4";
        d.onclick = () => loadInvoice(h);
        d.innerHTML = `<div class="small text-muted">${h.date} ${h.time || ''}</div><b>N° ${h.num} - ${h.client}</b><br><span class="text-success small">${h.total}</span>`;
        box.appendChild(d);
    });
}

function loadInvoice(inv) {
    document.getElementById('f-num').value = inv.num;
    document.getElementById('client').value = inv.client;
    document.getElementById('f-date').value = inv.date;
    const container = document.getElementById('rows');
    container.innerHTML = "";
    if(inv.items) inv.items.forEach(it => addRow(it));
    else addRow();
    calculate();
    showNotif("Facture chargée");
}

function resetInvoice() {
    document.getElementById('client').value = "";
    document.getElementById('rows').innerHTML = "";
    const current = parseInt(document.getElementById('f-num').value) || 0;
    document.getElementById('f-num').value = (current + 1).toString().padStart(3, '0');
    addRow();
    calculate();
    successModal.hide();
}

function numberToFrench(n) {
    if (n === 0) return "ZÉRO";
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];
    const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    function conv(num) {
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + conv(num % 10) : "");
        if (num < 1000) return (Math.floor(num / 100) === 1 ? "" : units[Math.floor(num / 100)] + " ") + "CENT" + (num % 100 !== 0 ? " " + conv(num % 100) : "");
        if (num < 1000000) return (Math.floor(num / 1000) === 1 ? "" : conv(Math.floor(num / 1000)) + " ") + "MILLE" + (num % 1000 !== 0 ? " " + conv(num % 1000) : "");
        return num.toString();
    }
    return conv(n);
}