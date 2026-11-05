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
    const pageWidth  = doc.internal.pageSize.getWidth();   // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight();  // 297 mm

    // ═══════════════════════════════════════════════════════════════
    // DIMENSIONS CALCULÉES D'APRÈS LES IMAGES RÉELLES
    // Header : 1024×343px → à 210mm de large → hauteur = 70.3 mm
    // Footer : 1024×131px → à 210mm de large → hauteur = 26.9 mm
    // Zone contenu : de 72mm à 268mm (strictement entre header et footer)
    // ═══════════════════════════════════════════════════════════════
    const HEADER_H    = 70.3;                     // hauteur du bandeau header en mm
    const FOOTER_H    = 26.9;                     // hauteur du bandeau footer en mm
    const FOOTER_Y    = pageHeight - FOOTER_H;    // position Y du footer = 270.1 mm
    const CONTENT_TOP = HEADER_H + 4;             // 1ère ligne de contenu = 74.3 mm
    const CONTENT_BOT = FOOTER_Y - 4;             // dernière ligne de contenu = 266.1 mm

    // ── Fonction de dessin d'une page (header + footer UNIQUEMENT) ───────────
    // Le filigrane est dessiné EN DERNIER sur toutes les pages (après le tableau)
    const drawPage = () => {

        // HEADER — pleine opacité
        try {
            if (typeof HEADER_BAND_B64 !== 'undefined') {
                doc.addImage(HEADER_BAND_B64, 'JPEG', 0, 0, 210, HEADER_H);
            }
        } catch(e) { console.error("Header error:", e); }

        // FOOTER — pleine opacité
        try {
            if (typeof FOOTER_BAND_B64 !== 'undefined') {
                doc.addImage(FOOTER_BAND_B64, 'PNG', 0, FOOTER_Y, 210, FOOTER_H);
            }
        } catch(e) { console.error("Footer error:", e); }
    };

    // ── Page 1 ───────────────────────────────────────────────────────────────
    drawPage();

    // Titre de la facture
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16).setFont("times", "bold");
    doc.text(`Facture N° ${fNum} : ${client}`, pageWidth / 2, CONTENT_TOP + 4, { align: 'center' });

    // Date soulignée
    const dateObj = dateInput ? new Date(dateInput) : new Date();
    const dateStr  = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const fullDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    doc.setFontSize(12).setFont("times", "bold");
    doc.text(fullDate, pageWidth / 2, CONTENT_TOP + 12, { align: 'center' });
    const dw = doc.getTextWidth(fullDate);
    doc.setLineWidth(0.3).line(
        pageWidth/2 - dw/2, CONTENT_TOP + 13.5,
        pageWidth/2 + dw/2, CONTENT_TOP + 13.5
    );

    // ── Lignes du tableau ────────────────────────────────────────────────────
    const tableRows = [];
    let rowNum = 1;
    document.querySelectorAll('#rows tr').forEach(tr => {
        const d = tr.querySelector('.d-in').value;
        const c = tr.querySelector('.c-in').value;
        const p = tr.querySelector('.p-in').value;
        const t = tr.querySelector('.line-total').innerText;
        if (d) tableRows.push([rowNum++, d, c, p, t]);
    });

    // TOTAL en DERNIÈRE LIGNE du body — colonne N° vide, "TOTAL NET À PAYER" sur 4 col
    const LG = [193, 235, 193]; // vert clair
    tableRows.push([
        { content: 'TOTAL NET À PAYER', colSpan: 4,
          styles: { fontStyle: 'bold', halign: 'center', fillColor: LG, textColor: [0, 0, 0] } },
        { content: grandTotal,
          styles: { fontStyle: 'bold', halign: 'center', fontSize: 11, fillColor: LG, textColor: [0, 0, 0] } }
    ]);

    // Tableau sans foot — 5 colonnes : N° | DESIGNATION | COND. | PRIX/COND. | TOTAL
    doc.autoTable({
        startY: CONTENT_TOP + 20,
        head: [['N°', 'DESIGNATION', 'COND.', 'PRIX / COND.', 'TOTAL (XAF)']],
        body: tableRows,
        theme: 'grid',
        styles: {
            font: "times", textColor: [0, 0, 0],
            lineColor: [0, 0, 0], lineWidth: 0.15,
            halign: 'center', fontSize: 11,
            // Padding vertical réduit pour tenir 14 lignes sur page 1
            cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }
        },
        headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },   // N°
            1: { halign: 'left',  cellWidth: 55 },     // DESIGNATION
            4: { fontStyle: 'bold' }                   // TOTAL
        },
        margin: {
            top: CONTENT_TOP + 2,
            left: 18,
            right: 18,
            bottom: FOOTER_H + 4
        },
        didDrawPage: function (data) {
            if (data.pageNumber > 1) {
                drawPage();
            }
        }
    });

    // Nombre de lignes de données (sans compter la ligne TOTAL)
    const dataRowCount = tableRows.length - 1;

    let finalY = doc.lastAutoTable.finalY + 6; // espacement compact après tableau

    // ── Règle de pagination ──────────────────────────────────────────────────
    // ≤ 14 lignes : tout tient sur UNE SEULE page (obligatoire)
    // > 14 lignes : la 15e ligne + "Arrêté..." + signatures → page suivante
    if (dataRowCount > 14) {
        doc.addPage();
        drawPage();
        finalY = CONTENT_TOP + 4;
    }

    // Montant en lettres — fontSize 9 pour tenir sur page 1 avec 14 lignes
    doc.setFontSize(9).setFont("times", "bold");
    const labelTexte = "Arrêté la présente facture à la somme de : " + totalWords;
    const splitText  = doc.splitTextToSize(labelTexte, 174);

    if (finalY + splitText.length * 5.5 + 6 > CONTENT_BOT) {
        doc.addPage(); drawPage(); finalY = CONTENT_TOP + 4;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.text(splitText, 18, finalY);
    finalY += (splitText.length * 5.5) + 8;

    // Signatures
    if (finalY + 20 > CONTENT_BOT) {
        doc.addPage(); drawPage(); finalY = CONTENT_TOP + 4;
    }
    doc.setFontSize(10).setFont("times", "bold");
    doc.text("LIVRÉ PAR : NTANKA ISMAËL", 18, finalY);
    doc.text("RÉCEPTIONNÉ PAR :", 130, finalY);
    finalY += 7;
    doc.setFontSize(9).setFont("times", "normal");
    doc.text("Signature :", 18, finalY);
    doc.text("Cachet & Signature :", 130, finalY);

    // ══════════════════════════════════════════════════════════════════════
    // FILIGRANE — dessiné EN DERNIER sur TOUTES les pages
    // → apparaît au-dessus du tableau ET de tout le contenu
    // → opacité faible : table reste parfaitement lisible
    // ══════════════════════════════════════════════════════════════════════
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    const wmText = "COMMERCE GENERAL - LE ROI DES FRUITS & LEGUMES";
    const wmW    = doc.getTextWidth(wmText);
    const wmCX   = pageWidth / 2;
    const wmCY   = (CONTENT_TOP + CONTENT_BOT) / 2;   // centre zone contenu ≈ 170 mm
    const sq2    = Math.SQRT1_2;                        // cos45 = sin45 ≈ 0.7071
    const wmX    = wmCX - (wmW / 2) * sq2;
    const wmY    = wmCY + (wmW / 2) * sq2;

    const nbPages = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= nbPages; pg++) {
        doc.setPage(pg);
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.22 }));
        doc.setTextColor(90, 90, 90);
        doc.setFont("times", "bold");
        doc.setFontSize(22);
        doc.text(wmText, wmX, wmY, { angle: 45 });
        doc.restoreGraphicsState();
    }

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