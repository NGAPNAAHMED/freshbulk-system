const { jsPDF } = window.jspdf;
let previewModal, successModal, historyModal;
let currentDoc = null;

document.addEventListener('DOMContentLoaded', () => {
    previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    successModal = new bootstrap.Modal(document.getElementById('successModal'));
    historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
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
        await new Promise(r => setTimeout(r, 1500));
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

// --- LOGIQUE CALCUL ---
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cleanNum(str) {
    if(!str) return 0;
    return parseFloat(str.toString().replace(/\s/g, '').replace(',', '.')) || 0;
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

// --- PDF & PRÉVISUALISATION ---
async function generatePDFObject() {
    const doc = new jsPDF();
    const client = document.getElementById('client').value.toUpperCase();
    const fNum = document.getElementById('f-num').value;
    const dateInput = document.getElementById('f-date').value;
    const grandTotal = document.getElementById('grand-total').innerText;

    // Entête simplifié pour le code
    doc.setFont("times", "bold").setFontSize(22).setTextColor(25, 135, 84);
    doc.text("ETS FRESHBULK SERVICE", 105, 20, { align: 'center' });
    doc.setFontSize(10).setTextColor(0).setFont("times", "normal");
    doc.text("LE ROI DES FRUITS & LEGUMES - DOUALA - Tel : 695 64 50 21", 105, 28, { align: 'center' });
    
    doc.setFontSize(16).setFont("times", "bold").text(`FACTURE N° ${fNum}`, 105, 45, { align: 'center' });
    doc.setFontSize(14).text(`CLIENT: ${client}`, 105, 53, { align: 'center' });

    const tableRows = [];
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if(d) tableRows.push([d, c, p, t]);
    });

    doc.autoTable({
        startY: 65,
        head: [['DESIGNATION', 'COND.', 'PRIX UNIT.', 'TOTAL']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [25, 135, 84] },
        foot: [['TOTAL NET A PAYER', '', '', grandTotal]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    return doc;
}

async function preVisualise() {
    if(!document.getElementById('client').value) return showNotif("Indiquez le client", "error");
    const btn = document.querySelector('button[onclick="preVisualise()"]');
    btn.disabled = true;
    currentDoc = await generatePDFObject();
    document.getElementById('pdf-viewer').src = currentDoc.output('bloburl');
    btn.disabled = false;
    previewModal.show();
}

function downloadPDF() {
    if(currentDoc) {
        const client = document.getElementById('client').value.toUpperCase();
        const fNum = document.getElementById('f-num').value;
        currentDoc.save(`Facture_${fNum}_${client}.pdf`);
        saveCurrentInvoice(); // SAUVEGARDE DANS L'HISTORIQUE
        previewModal.hide();
        successModal.show();
    }
}

// --- SYSTÈME HISTORIQUE ---
function saveCurrentInvoice() {
    const items = [];
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        if(d) items.push({d, c, p});
    });

    const inv = {
        num: document.getElementById('f-num').value,
        client: document.getElementById('client').value.toUpperCase(),
        date: document.getElementById('f-date').value,
        total: document.getElementById('grand-total').innerText,
        items: items
    };

    let history = JSON.parse(localStorage.getItem('fb_history')) || [];
    history = history.filter(h => h.num !== inv.num); // Eviter doublons
    history.unshift(inv);
    if(history.length > 30) history.pop();
    localStorage.setItem('fb_history', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('fb_history')) || [];
    const containerPC = document.getElementById('history-box-pc');
    const containerMob = document.getElementById('history-box-mobile');
    
    if(!history.length) {
        const empty = '<p class="text-center text-muted small py-4">Aucune facture</p>';
        containerPC.innerHTML = empty;
        containerMob.innerHTML = empty;
        return;
    }

    const html = history.map(h => `
        <div class="history-item shadow-sm p-3 mb-2 bg-white rounded-3 border-start border-success border-4" onclick="loadInvoice('${h.num}')">
            <div class="d-flex justify-content-between align-items-start">
                <span class="badge bg-dark">N° ${h.num}</span>
                <small class="text-muted" style="font-size:0.7rem">${h.date}</small>
            </div>
            <div class="fw-bold text-dark mt-1 text-truncate">${h.client}</div>
            <div class="text-success fw-bold small">${h.total}</div>
        </div>
    `).join('');

    containerPC.innerHTML = html;
    containerMob.innerHTML = html;
}

function loadInvoice(num) {
    const history = JSON.parse(localStorage.getItem('fb_history')) || [];
    const inv = history.find(h => h.num === num);
    if(inv) {
        document.getElementById('f-num').value = inv.num;
        document.getElementById('client').value = inv.client;
        document.getElementById('f-date').value = inv.date;
        document.getElementById('rows').innerHTML = "";
        inv.items.forEach(it => addRow(it));
        calculate();
        
        // Fermer modal si ouvert
        const m = bootstrap.Modal.getInstance(document.getElementById('historyModal'));
        if(m) m.hide();
        
        showNotif("Facture chargée !");
    }
}

function resetInvoice() {
    const lastNum = parseInt(document.getElementById('f-num').value) || 0;
    document.getElementById('f-num').value = (lastNum + 1).toString().padStart(3, '0');
    document.getElementById('client').value = "";
    document.getElementById('rows').innerHTML = "";
    addRow();
    calculate();
    successModal.hide();
}

// --- UTILITAIRES ---
function showNotif(msg, type = 'success') {
    const container = document.getElementById('notif-container');
    const n = document.createElement('div');
    n.className = `notif-push ${type === 'error' ? 'bg-danger' : ''}`;
    n.innerHTML = `<i class="bi bi-info-circle-fill me-2"></i> ${msg}`;
    container.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 500); }, 3000);
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