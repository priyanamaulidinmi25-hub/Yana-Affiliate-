/**
 * YANA AFFILIATE - ADMIN CATEGORIES CONTROLLER
 */

import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp,
    query,
    where,
    getDocs,
    orderBy,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { initProductsManager } from './admin-products.js';

/* STATE */
let categoriesList = [];
let pendingDeleteCat = null;
let boundProductsList = [];

/* DOM ELEMENTS */
const DOM = {
    form: document.getElementById('category-form'),
    formTitle: document.getElementById('cat-form-title'),
    catId: document.getElementById('cat-id'),
    name: document.getElementById('cat-name'),
    sort: document.getElementById('cat-sort'),
    saveBtn: document.getElementById('save-cat-btn'),
    cancelBtn: document.getElementById('cancel-cat-btn'),
    listUl: document.getElementById('category-list'),

    // Modal Delete Relation
    modal: document.getElementById('cat-delete-modal'),
    modalWarningText: document.getElementById('cat-delete-warning-text'),
    reassignContainer: document.getElementById('reassign-container'),
    targetReassignSelect: document.getElementById('target-reassign-cat'),
    confirmDelBtn: document.getElementById('confirm-del-cat-btn'),
    closeDelBtn: document.getElementById('close-del-cat-btn')
};

function generateSlug(text) {
    return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
}

/* INITIALIZE REALTIME CATEGORIES */
export function initCategoriesManager() {
    const q = query(collection(db, "categories"), orderBy("sortOrder", "asc"));

    onSnapshot(q, (snapshot) => {
        categoriesList = [];
        snapshot.forEach(docSnap => {
            categoriesList.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderCategoryList();
        // Teruskan data kategori terbaru ke pengelola produk
        initProductsManager(categoriesList);
    });
}

function renderCategoryList() {
    DOM.listUl.innerHTML = '';

    if (categoriesList.length === 0) {
        DOM.listUl.innerHTML = '<li class="text-center">Belum ada kategori.</li>';
        return;
    }

    categoriesList.forEach(cat => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${cat.name}</strong>
                <small style="color:var(--text-muted); margin-left:8px;">(Urutan: ${cat.sortOrder})</small>
            </div>
            <div>
                <button type="button" class="btn-outline btn-edit-cat" style="padding:2px 6px;">Edit</button>
                <button type="button" class="btn-danger btn-del-cat" style="padding:2px 6px;">Hapus</button>
            </div>
        `;

        li.querySelector('.btn-edit-cat').addEventListener('click', () => fillEditCategory(cat));
        li.querySelector('.btn-del-cat').addEventListener('click', () => prepareDeleteCategory(cat));
        DOM.listUl.appendChild(li);
    });
}

/* FORM SUBMIT CATEGORY */
DOM.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.saveBtn.disabled = true;

    const isEdit = Boolean(DOM.catId.value);
    const catPayload = {
        name: DOM.name.value.trim(),
        slug: generateSlug(DOM.name.value.trim()),
        sortOrder: Number(DOM.sort.value),
        updatedAt: serverTimestamp()
    };

    try {
        if (isEdit) {
            await updateDoc(doc(db, "categories", DOM.catId.value), catPayload);
        } else {
            catPayload.createdAt = serverTimestamp();
            await addDoc(collection(db, "categories"), catPayload);
        }

        resetCategoryForm();
    } catch (err) {
        alert("Gagal menyimpan kategori: " + err.message);
    } finally {
        DOM.saveBtn.disabled = false;
    }
});

function fillEditCategory(cat) {
    DOM.formTitle.textContent = "Edit Kategori";
    DOM.catId.value = cat.id;
    DOM.name.value = cat.name;
    DOM.sort.value = cat.sortOrder;
    DOM.cancelBtn.classList.remove('hidden');
}

function resetCategoryForm() {
    DOM.catId.value = '';
    DOM.form.reset();
    DOM.formTitle.textContent = "Tambah Kategori Baru";
    DOM.sort.value = 1;
    DOM.cancelBtn.classList.add('hidden');
}

/* DELETE CATEGORY WITH RELATION CHECK */
async function prepareDeleteCategory(cat) {
    pendingDeleteCat = cat;

    // Cek apakah ada produk yang terikat ke kategori ini
    const qProds = query(collection(db, "products"), where("categoryId", "==", cat.id));
    const snap = await getDocs(qProds);
    boundProductsList = [];
    snap.forEach(d => boundProductsList.push(d.id));

    if (boundProductsList.length > 0) {
        // Ada relasi! Tawarkan pemindahan ke kategori lain
        const otherCategories = categoriesList.filter(c => c.id !== cat.id);

        if (otherCategories.length === 0) {
            alert(`Tidak bisa menghapus kategori "${cat.name}" karena ada ${boundProductsList.length} produk terikat dan tidak ada kategori lain untuk pemindahan.`);
            return;
        }

        DOM.modalWarningText.textContent = `Kategori "${cat.name}" masih memiliki ${boundProductsList.length} produk. Pilih kategori tujuan untuk memindahkan produk sebelum menghapus:`;
        DOM.targetReassignSelect.innerHTML = '';
        
        otherCategories.forEach(oc => {
            const opt = document.createElement('option');
            opt.value = oc.id;
            opt.textContent = oc.name;
            DOM.targetReassignSelect.appendChild(opt);
        });

        DOM.reassignContainer.classList.remove('hidden');
        DOM.modal.classList.remove('hidden');

    } else {
        // Tidak ada relasi, konfirmasi biasa
        if (confirm(`Hapus kategori "${cat.name}"?`)) {
            await executeDeleteCategory(null);
        }
    }
}

/* EXECUTE DELETE CATEGORY & BATCH REASSIGN */
async function executeDeleteCategory(targetCatId) {
    try {
        if (targetCatId && boundProductsList.length > 0) {
            // Pindahkan seluruh produk terikat menggunakan Batch Write
            const batch = writeBatch(db);
            boundProductsList.forEach(pId => {
                batch.update(doc(db, "products", pId), { categoryId: targetCatId });
            });
            await batch.commit();
        }

        // Hapus Dokumen Kategori
        await deleteDoc(doc(db, "categories", pendingDeleteCat.id));
        closeDeleteModal();

    } catch (err) {
        alert("Gagal menghapus kategori: " + err.message);
    }
}

function closeDeleteModal() {
    DOM.modal.classList.add('hidden');
    pendingDeleteCat = null;
    boundProductsList = [];
}

/* EVENT LISTENERS */
DOM.cancelBtn.addEventListener('click', resetCategoryForm);
DOM.closeDelBtn.addEventListener('click', closeDeleteModal);
DOM.confirmDelBtn.addEventListener('click', () => {
    const targetCatId = DOM.reassignContainer.classList.contains('hidden') ? null : DOM.targetReassignSelect.value;
    executeDeleteCategory(targetCatId);
});

// Start Realtime Categories saat DOM siap
document.addEventListener('DOMContentLoaded', initCategoriesManager);
