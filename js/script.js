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
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> VEUILLEZ PATIENTER`;
        await new Promise(r => setTimeout(r, 2000));
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('app-screen').classList.remove('d-none');
        showNotif("Bienvenue, ISMAËL.");
    } else {
        showNotif("Code invalide", "error");
    }
}

// --- CHARGEMENT DES IMAGES (SÉCURISÉ CONTRE CORS) ---
function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// --- LOGIQUE DE CALCUL ---
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function cleanNum(str) {
    if(!str) return 0;
    return parseFloat(str.toString().replace(/\s/g, '').replace(',', '.')) || 0;
}

function showNotif(msg, type = 'success') {
    const container = document.getElementById('notif-container');
    if(!container) return;
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

// --- GÉNÉRATION DU PDF ---
async function generatePDFObject() {
    const doc = new jsPDF();
    const client = document.getElementById('client').value.toUpperCase();
    const fNum = document.getElementById('f-num').value;
    const dateInput = document.getElementById('f-date').value;
    const grandTotal = document.getElementById('grand-total').innerText;
    const totalWords = document.getElementById('total-words').innerText;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // On pré-charge les logos (si erreur CORS, ils seront null et n'arrêteront pas le script)
    const [img1, img2] = await Promise.all([loadImage('assets/logo1.png'), loadImage('assets/logo2.png')]);

    const drawHeaderAndWatermark = () => {
        // 1. Filigrane centré
        doc.saveGraphicsState();
        const gState = new doc.GState({ opacity: 0.1 });
        doc.setGState(gState);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(25);
        doc.setFont("times", "bold");
        doc.text("COMMERCE GENERAL - LE ROI DES FRUITS & LEGUMES", pageWidth / 2, pageHeight / 2, { 
            align: 'center', baseline: 'middle', angle: 45 
        });
        doc.restoreGraphicsState();

        // 2. Logos (Protection contre les erreurs de chargement)
        if(img1) { try { doc.addImage(img1, 'PNG', 12, 10, 35, 30); } catch(e){} }
        if(img2) { try { doc.addImage(img2, 'PNG', 163, 10, 35, 30); } catch(e){} }

        // 3. Textes En-tête
        doc.setTextColor(25, 135, 84).setFontSize(26).setFont("times", "bold");
        doc.text("ETS FRESHBULK SERVICE", 105, 22, { align: 'center' });
        doc.setTextColor(0).setFontSize(10).setFont("times", "normal").text("COMMERCE GENERAL - LE ROI DES FRUITS & LEGUMES", 105, 30, { align: 'center' });
        doc.text("NIU : P119718171347Q | BP : DOUALA | Tel : 695 64 50 21", 105, 36, { align: 'center' });
        doc.setLineWidth(0.5).line(15, 42, 195, 42);
    };

    // --- Page 1 ---
    drawHeaderAndWatermark();
    
    // Titre de la facture
    doc.setFontSize(18).setFont("times", "bold").text(`Facture N° ${fNum} : ${client}`, 105, 55, { align: 'center' });
    
    // Date (TOUJOURS SOULIGNÉE)
    const dateObj = dateInput ? new Date(dateInput) : new Date();
    const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const fullDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    
    doc.setFontSize(12).setFont("times", "bold").text(fullDate, 105, 63, { align: 'center' });
    const dateWidth = doc.getTextWidth(fullDate);
    doc.setLineWidth(0.3).line(105 - (dateWidth/2), 64, 105 + (dateWidth/2), 64); // Ligne de soulignement

    const tableRows = [];
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if(d) tableRows.push([d, c, p, t]);
    });

    // Tableau avec répétition d'en-tête sur les pages suivantes
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
        margin: { top: 50, left: 20, right: 20 },
        didDrawPage: function (data) {
            if (data.pageNumber > 1) {
                drawHeaderAndWatermark();
            }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 12;

    // --- MONTANT EN LETTRES (TOUJOURS EN GRAS) ---
    doc.setFontSize(11).setFont("times", "bold"); // Application du GRAS
    const labelTexte = "Arrêté la présente facture à la somme de : " + totalWords;
    const splitText = doc.splitTextToSize(labelTexte, 170);
    
    if (finalY + 20 > 280) { doc.addPage(); drawHeaderAndWatermark(); finalY = 60; }
    
    doc.setFont("times", "bold"); // Double sécurité pour le gras
    doc.text(splitText, 20, finalY);
    finalY += (splitText.length * 7) + 10;

    // Signatures
    if (finalY + 30 > 280) { doc.addPage(); drawHeaderAndWatermark(); finalY = 60; }
    doc.setFontSize(11).setFont("times", "bold");
    doc.text("LIVRÉ PAR : NTANKA ISMAËL", 20, finalY);
    doc.text("RÉCEPTIONNÉ PAR :", 135, finalY);
    finalY += 8;
    doc.setFontSize(10).setFont("times", "normal").text("Signature :", 20, finalY);
    doc.text("Cachet & Signature :", 135, finalY);

    return doc;
}

// --- SYSTÈME ---
async function preVisualise() {
    if(!document.getElementById('client').value) return showNotif("Indiquez le client", "error");
    const btn = document.querySelector('button[onclick="preVisualise()"]');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> VEUILLEZ PATIENTER`;
    
    try {
        currentDoc = await generatePDFObject();
        document.getElementById('pdf-viewer').src = currentDoc.output('bloburl');
        previewModal.show();
    } catch (e) {
        console.error(e);
        showNotif("Erreur lors de la génération", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-eye-fill me-2"></i> PRÉVISUALISER`;
    }
}

// --- TRADUCTION AMÉLIORÉE (CORRIGE 33 396) ---
function numberToFrench(n) {
    if (n === 0) return "ZÉRO";
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
    const tens = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

    function conv(num) {
        if (num < 10) return units[num];
        if (num < 20) {
            const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
            return teens[num - 10];
        }
        if (num < 100) {
            let d = Math.floor(num / 10);
            let u = num % 10;
            if (d === 7 || d === 9) {
                let prefix = (d === 7) ? "SOIXANTE" : "QUATRE-VINGT";
                if (u === 0) return (d === 7) ? "SOIXANTE-DIX" : "QUATRE-VINGT-DIX";
                if (u === 1 && d === 7) return "SOIXANTE ET ONZE";
                return prefix + "-" + conv(u + 10);
            }
            if (u === 0) return tens[d];
            if (u === 1 && d !== 8) return tens[d] + " ET UN";
            return tens[d] + "-" + units[u];
        }
        if (num < 1000) {
            let c = Math.floor(num / 100);
            let r = num % 100;
            let partCent = (c === 1) ? "CENT" : units[c] + " CENT";
            return partCent + (r !== 0 ? " " + conv(r) : "");
        }
        if (num < 1000000) {
            let m = Math.floor(num / 1000);
            let r = num % 1000;
            let partMille = (m === 1) ? "MILLE" : conv(m) + " MILLE";
            return partMille + (r !== 0 ? " " + conv(r) : "");
        }
        return num.toString();
    }
    return conv(n).toUpperCase();
}

// Fonctions de gestion classiques (History, Reset, etc.)
function downloadPDF() {
    if(currentDoc) {
        const client = document.getElementById('client').value.toUpperCase();
        const fNum = document.getElementById('f-num').value;
        currentDoc.save(`Facture_${fNum}_${client}.pdf`);
        saveHistory();
        previewModal.hide();
        successModal.show();
    }
}

function saveHistory() {
    const items = [];
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        if(d) items.push({ d, c, p });
    });
    const inv = {
        num: document.getElementById('f-num').value,
        client: document.getElementById('client').value,
        date: document.getElementById('f-date').value,
        total: document.getElementById('grand-total').innerText,
        items: items
    };
    let history = JSON.parse(localStorage.getItem('fb_history')) || [];
    history = history.filter(h => h.num !== inv.num);
    history.unshift(inv);
    localStorage.setItem('fb_history', JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('fb_history')) || [];
    const html = history.map(h => `
        <div class="history-item shadow-sm p-2 mb-2 bg-white rounded border-start border-success border-4" onclick="loadInvoice('${h.num}')">
            <div class="small text-muted">${h.date}</div>
            <b>N° ${h.num} - ${h.client}</b><br>
            <span class="text-success small">${h.total}</span>
        </div>
    `).join('');
    const hPc = document.getElementById('history-box-pc');
    const hMob = document.getElementById('history-box-mobile');
    if(hPc) hPc.innerHTML = html || '<p class="small text-center">Vide</p>';
    if(hMob) hMob.innerHTML = html || '<p class="small text-center">Vide</p>';
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
        const m = bootstrap.Modal.getInstance(document.getElementById('historyModal'));
        if(m) m.hide();
        showNotif("Chargé");
    }
}

function resetInvoice() {
    document.getElementById('client').value = "";
    document.getElementById('rows').innerHTML = "";
    const current = parseInt(document.getElementById('f-num').value) || 0;
    document.getElementById('f-num').value = (current + 1).toString().padStart(3, '0');
    addRow(); calculate(); successModal.hide();
}