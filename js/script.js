const { jsPDF } = window.jspdf;
let previewModal, successModal;
let currentDoc = null;

document.addEventListener('DOMContentLoaded', () => {
    previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    successModal = new bootstrap.Modal(document.getElementById('successModal'));
    document.getElementById('f-date').valueAsDate = new Date();
    loadHistory();
    addRow();
});

// --- ACCÈS ---
async function checkAccess() {
    const pass = document.getElementById('pass').value;
    const btn = document.querySelector('#login-screen .btn-god');
    if (pass === "012345") {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Chargement...`;
        await new Promise(r => setTimeout(r, 2000));
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('app-screen').classList.remove('d-none');
        showNotif("Bienvenue, ISMAEL.");
    } else {
        showNotif("Code invalide", "error");
    }
}

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

// --- IMAGES ---
function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// --- LOGIQUE ---
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
    n.className = `notif-push ${type === 'error' ? 'bg-danger' : ''}`;
    n.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> ${msg}`;
    container.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 500); }, 3000);
}

function addRow(data = null) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control d-in" value="${data ? data.d : ''}" placeholder="Désignation"></td>
        <td><input type="text" class="form-control c-in text-center" value="${data ? data.c : ''}" placeholder="Ex: 5kg" oninput="calculate()"></td>
        <td><input type="text" class="form-control p-in text-center" value="${data ? data.p : ''}" placeholder="0" oninput="formatInput(this)"></td>
        <td class="text-end fw-bold line-total">0</td>
        <td class="text-center"><button onclick="this.closest('tr').remove(); calculate()" class="btn btn-link text-danger p-0"><i class="bi bi-trash3-fill"></i></button></td>
    `;
    document.getElementById('rows').appendChild(tr);
    if(data) calculate();
}

function formatInput(input) {
    let val = input.value.replace(/\D/g, '');
    input.value = formatNumber(val);
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

// --- PDF ---
async function generatePDFObject() {
    const doc = new jsPDF();
    const client = document.getElementById('client').value.toUpperCase();
    const fNum = document.getElementById('f-num').value;
    const dateInput = document.getElementById('f-date').value;
    const grandTotal = document.getElementById('grand-total').innerText;
    
    doc.setFont("times", "normal");

    // Logos
    try {
        const [img1, img2] = await Promise.all([loadImage('assets/logo1.png'), loadImage('assets/logo2.png')]);
        if(img1) doc.addImage(img1, 'PNG', 12, 10, 35, 30);
        if(img2) doc.addImage(img2, 'PNG', 163, 10, 35, 30);
    } catch (e) {}

    doc.setTextColor(25, 135, 84).setFontSize(28).setFont("times", "bold");
    doc.text("ETS FRESHBULK SERVICE", 105, 22, { align: 'center' });
    doc.setTextColor(0).setFontSize(10).setFont("times", "normal").text("COMMERCE GENERAL - LE ROI DES FRUITS & LEGUMES", 105, 30, { align: 'center' });
    doc.text("NIU : P119718171347Q | BP : DOUALA | Tel : 695 64 50 21", 105, 36, { align: 'center' });
    doc.setLineWidth(0.5).line(15, 42, 195, 42);

    doc.setFontSize(18).setFont("times", "bold").text(`Facture N° ${fNum} : ${client}`, 105, 55, { align: 'center' });
    const dateStr = new Date(dateInput).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const fullDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    doc.setFontSize(12).text(fullDate, 105, 63, { align: 'center' });
    doc.line(105 - (doc.getTextWidth(fullDate)/2), 64, 105 + (doc.getTextWidth(fullDate)/2), 64);

    const tableRows = [];
    const itemsHistory = [];
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if(d) {
            tableRows.push([d, c, p, t]);
            itemsHistory.push({d, c, p});
        }
    });

    doc.autoTable({
        startY: 72,
        head: [['DESIGNATION', 'COND.', 'PRIX / COND.', 'TOTAL (XAF)']],
        body: tableRows,
        theme: 'grid',
        styles: { font: "times", textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', fontSize: 11, cellPadding: 3 },
        headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'left', cellWidth: 55 }, 3: { fontStyle: 'bold' } },
        foot: [[{ content: 'TOTAL NET À PAYER', styles: { fontStyle: 'bold', halign: 'center' } }, { content: '', colSpan: 2 }, { content: grandTotal, styles: { fontStyle: 'bold', halign: 'center', fontSize: 12 } }]],
        footStyles: { fillColor: [242, 242, 247], textColor: [0, 0, 0] },
        margin: { left: 20, right: 20 }
    });

    let y = doc.lastAutoTable.finalY + 12;
    const label = "Arrêté la présente facture à la somme de : ";
    doc.setFontSize(10).text(label, 20, y);
    doc.setFont("times", "bold").text(document.getElementById('total-words').innerText, 20 + doc.getTextWidth(label), y);
    
    y += 20;
    doc.setFont("times", "normal").text("LIVRÉ PAR :", 20, y);
    doc.text("RÉCEPTIONNÉ PAR :", 135, y);
    doc.setFontSize(10).text("Signature :", 20, y + 8);
    doc.text("Cachet & Signature :", 135, y + 8);

    return { doc, itemsHistory };
}

async function preVisualise() {
    if(!document.getElementById('client').value) return showNotif("Indiquez le client", "error");
    const btn = document.querySelector('button[onclick="preVisualise()"]');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Traitement...`;
    
    const result = await generatePDFObject();
    currentDoc = result.doc;
    document.getElementById('pdf-viewer').src = currentDoc.output('bloburl');
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-eye-fill me-2"></i> PRÉVISUALISER`;
    previewModal.show();
}

function downloadPDF() {
    if(currentDoc) {
        const client = document.getElementById('client').value.toUpperCase();
        const fNum = document.getElementById('f-num').value;
        currentDoc.save(`Facture_${fNum}_${client}.pdf`);
        previewModal.hide();
        successModal.show();
    }
}

// --- HISTORIQUE & CONVERSION (DÉJÀ DISPONIBLES DANS VOTRE CODE) ---
function saveHistory(inv) {
    let history = JSON.parse(localStorage.getItem('fb_history')) || [];
    history = history.filter(h => h.num !== inv.num);
    history.unshift(inv);
    localStorage.setItem('fb_history', JSON.stringify(history));
    loadHistory();
}
function loadHistory() {
    const box = document.getElementById('history-box');
    const history = JSON.parse(localStorage.getItem('fb_history')) || [];
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
    if(inv.items) inv.items.forEach(it => addRow(it)); else addRow();
    calculate();
}
function resetInvoice() {
    document.getElementById('client').value = "";
    document.getElementById('rows').innerHTML = "";
    const current = parseInt(document.getElementById('f-num').value) || 0;
    document.getElementById('f-num').value = (current + 1).toString().padStart(3, '0');
    addRow(); calculate(); successModal.hide();
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