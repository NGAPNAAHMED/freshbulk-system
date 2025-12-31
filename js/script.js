const { jsPDF } = window.jspdf;
let previewModal, successModal;

document.addEventListener('DOMContentLoaded', () => {
    previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    successModal = new bootstrap.Modal(document.getElementById('successModal'));
    document.getElementById('f-date').valueAsDate = new Date();
    loadHistory();
    addRow();
});

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cleanNum(str) {
    return parseFloat(str.replace(/\s/g, '').replace(',', '.')) || 0;
}

function showNotif(msg, type = 'success') {
    const container = document.getElementById('notif-container');
    const n = document.createElement('div');
    n.className = `notif-push ${type === 'success' ? 'notif-success' : 'notif-error'}`;
    n.innerHTML = `<i class="bi ${type==='success'?'bi-check-circle-fill':'bi-x-circle-fill'} me-2"></i> ${msg}`;
    container.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 500); }, 3000);
}

function addRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control d-in" placeholder="Produit"></td>
        <td><input type="text" class="form-control c-in" placeholder="Ex: 10 kg" oninput="calculate()"></td>
        <td><input type="text" class="form-control p-in" placeholder="0" oninput="formatInput(this)"></td>
        <td class="text-end fw-bold line-total">0</td>
        <td class="text-center"><button onclick="this.closest('tr').remove(); calculate()" class="btn btn-link text-danger p-0"><i class="bi bi-trash3-fill"></i></button></td>
    `;
    document.getElementById('rows').appendChild(tr);
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

function checkAccess() {
    if (document.getElementById('pass').value === "012345") {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('app-screen').classList.remove('d-none');
        showNotif("Système déverrouillé");
    } else {
        showNotif("Accès refusé", "error");
    }
}

// PRÉVISUALISATION DÉTAILLÉE
function preVisualise() {
    const client = document.getElementById('client').value;
    if(!client) return showNotif("Veuillez indiquer le client", "error");
    
    let html = `<div class="p-2 small"><h6><strong>DESTINATAIRE :</strong> ${client.toUpperCase()}</h6><hr>
    <div class="table-responsive">
        <table class="table table-sm table-bordered">
            <thead class="table-dark">
                <tr>
                    <th>Désignation</th>
                    <th>Cond.</th>
                    <th>Prix / Cond.</th>
                    <th class="text-end">Total</th>
                </tr>
            </thead>
            <tbody>`;
    
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if(d) html += `<tr><td>${d}</td><td>${c}</td><td>${p}</td><td class="text-end fw-bold">${t}</td></tr>`;
    });
    
    html += `</tbody></table></div><h4 class="text-end text-success fw-bold">NET À PAYER : ${document.getElementById('grand-total').innerText}</h4></div>`;
    document.getElementById('preview-body').innerHTML = html;
    previewModal.show();
}

async function downloadPDF() {
    const doc = new jsPDF();
    const client = document.getElementById('client').value.toUpperCase();
    const fNum = document.getElementById('f-num').value;
    const dateInput = document.getElementById('f-date').value;
    const dateF = new Date(dateInput).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const grandTotal = document.getElementById('grand-total').innerText;

    // FILIGRANE
    doc.setTextColor(245);
    doc.setFontSize(20).setFont("helvetica", "bold");
    doc.text("ETS FRESHBULK SERVICE LE ROI DES FRUITS & LEGUMES", 105, 150, { angle: 45, align: 'center' });

    // EN-TÊTE
    doc.setTextColor(25, 135, 84).setFontSize(26).setFont("helvetica", "bold");
    doc.text("ETS FRESHBULK SERVICE", 105, 20, { align: 'center' });
    doc.setTextColor(0).setFontSize(10).text("COMMERCE GENERAL", 105, 28, { align: 'center' });
    doc.text("NIU : P119718171347Q", 105, 33, { align: 'center' });
    doc.text("BP : DOUALA Tel : 695 64 50 21", 105, 38, { align: 'center' });
    doc.setDrawColor(0).line(10, 42, 200, 42);

    doc.setFontSize(16).text(`Facture N° ${fNum} : ${client}`, 105, 55, { align: 'center' });
    doc.setFontSize(11).text(dateF.charAt(0).toUpperCase() + dateF.slice(1), 105, 62, { align: 'center' });

    const data = [];
    const itemsHistory = [];
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if(d) {
            data.push([d, c, p, t]);
            itemsHistory.push({d, c, p});
        }
    });

    doc.autoTable({
        startY: 70,
        head: [['DESIGNATION', 'CONDITIONNEMENT', 'PRIX / CONDITION.', 'TOTAL (XAF)']],
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' },
        styles: { textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.1, halign: 'center', cellPadding: 4 },
        columnStyles: { 0: { halign: 'left' }, 3: { halign: 'right', fontStyle: 'bold' } },
        foot: [[{content: 'TOTAL NET À PAYER', colSpan: 3, styles: {halign: 'right', fontStyle: 'bold'}}, {content: grandTotal, styles: {halign: 'right', fontStyle: 'bold', fontSize: 13}}]]
    });

    const y = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10).setFont("helvetica", "bold").text(`Arrêté la présente facture à la somme de : ${document.getElementById('total-words').innerText}`, 10, y);
    
    // SIGNATURES
    doc.text("LIVRÉ PAR :", 30, y + 20);
    doc.setFont("helvetica", "normal").text("Signature & Cachet :", 30, y + 28);
    doc.setFont("helvetica", "bold").text("RÉCEPTIONNÉ PAR :", 140, y + 20);
    doc.setFont("helvetica", "normal").text("Signature :", 140, y + 28);

    saveHistory({ num: fNum, client, total: grandTotal, items: itemsHistory, date: dateInput });
    doc.save(`Facture_${fNum}_${client}.pdf`);
    
    previewModal.hide();
    successModal.show();
}

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
        d.innerHTML = `<strong>N° ${h.num}</strong> - ${h.client}<br><span class="text-success fw-bold small">${h.total}</span>`;
        box.appendChild(d);
    });
}

function loadInvoice(inv) {
    document.getElementById('f-num').value = inv.num;
    document.getElementById('client').value = inv.client;
    document.getElementById('f-date').value = inv.date;
    const container = document.getElementById('rows');
    container.innerHTML = "";
    inv.items.forEach(it => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control d-in" value="${it.d}"></td>
            <td><input type="text" class="form-control c-in" value="${it.c}" oninput="calculate()"></td>
            <td><input type="text" class="form-control p-in" value="${it.p}" oninput="formatInput(this)"></td>
            <td class="text-end fw-bold line-total">0</td>
            <td class="text-center"><button onclick="this.closest('tr').remove(); calculate()" class="btn btn-link text-danger p-0"><i class="bi bi-trash3-fill"></i></button></td>
        `;
        container.appendChild(tr);
    });
    calculate();
    showNotif("Facture chargée");
}

function resetInvoice() {
    document.getElementById('client').value = "";
    document.getElementById('f-date').valueAsDate = new Date();
    document.getElementById('rows').innerHTML = "";
    const current = parseInt(document.getElementById('f-num').value) || 0;
    document.getElementById('f-num').value = (current + 1).toString().padStart(3, '0');
    addRow();
    calculate();
    successModal.hide();
    showNotif("Nouveau formulaire prêt");
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