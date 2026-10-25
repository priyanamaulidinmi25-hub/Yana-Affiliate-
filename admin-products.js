/**
 * YANA AFFILIATE - ADMIN PRODUCTS CONTROLLER (SUPABASE STORAGE UPLOAD)
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
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// CONFIG SUPABASE STORAGE
const SUPABASE_URL = 'https://bswbrjexadpyovrryndc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzd2JyamV4YWRweW92cnJ5bmRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDg3NjMsImV4cCI6MjEwODUyNDc2M30.viNU0QFuWjxSfs24qbjCQSqXKS-NasToLP5MQxjvk1A';

// Inisialisasi Supabase Client dengan Header
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    global: {
        headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    }
});

/* STATE */
let productsList = [];
let categoryMap = new Map();
let unsubscribeProducts = null;

/* DOM ELEMENTS */
const DOM = {
    form: document.getElementById('product-form'),
    formTitle: document.getElementById('product-form-title'),
    prodId: document.getElementById('prod-id'),
    name: document.getElementById('prod-name'),
    price: document.getElementById('prod-price'),
    category: document.getElementById('prod-category'),
    affiliate: document.getElementById('prod-affiliate'),
    status: document.getElementById('prod-status'),
    shortDesc: document.getElementById('prod-short-desc'),
    desc: document.getElementById('prod-desc'),
    
    // File & URL Input
    imageFileInput: document.getElementById('prod-image-file'),
    imageUrlInput: document.getElementById('prod-image-url') || document.getElementById('prod-image'),
    uploadStatus: document.getElementById('upload-status'),
    imagePreviewBox: document.getElementById('image-preview-container'),
    imagePreview: document.getElementById('image-preview'),
    
    saveBtn: document.getElementById('save-prod-btn'),
    cancelBtn: document.getElementById('cancel-prod-btn'),
    
    // Table & Filter
    tableBody: document.getElementById('product-table-body'),
    countText: document.getElementById('prod-count-text'),
    searchInput: document.getElementById('admin-prod-search'),
    catFilter: document.getElementById('admin-prod-cat-filter'),
    toastMsg: document.getElementById('toast-msg')
};

function showToast(msg) {
    if (!DOM.toastMsg) return;
    DOM.toastMsg.textContent = msg;
    DOM.toastMsg.classList.remove('hidden');
    setTimeout(() => DOM.toastMsg.classList.add('hidden'), 3000);
}

function generateSlug(text) {
    return text.toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

/* UPLOAD FOTO KE SUPABASE STORAGE (BUCKET: products) */
if (DOM.imageFileInput) {
    DOM.imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (DOM.uploadStatus) {
            DOM.uploadStatus.textContent = "Mengunggah foto ke Supabase...";
            DOM.uploadStatus.classList.remove('hidden');
        }
        DOM.saveBtn.disabled = true;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;

            // Upload file ke bucket 'products'
            const { data, error } = await supabase.storage
                .from('products')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // Dapatkan URL Publik Gambar
            const { data: urlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            const downloadURL = urlData.publicUrl;

            // Isikan URL hasil upload ke input
            if (DOM.imageUrlInput) DOM.imageUrlInput.value = downloadURL;

            // Tampilkan Preview Foto
            if (DOM.imagePreview) {
                DOM.imagePreview.src = downloadURL;
                DOM.imagePreview.setAttribute('referrerpolicy', 'no-referrer');
            }
            if (DOM.imagePreviewBox) DOM.imagePreviewBox.classList.remove('hidden');

            if (DOM.uploadStatus) DOM.uploadStatus.textContent = "Foto berhasil diunggah!";
        } catch (err) {
            console.error("Upload error:", err);
            alert("Gagal mengunggah gambar: " + err.message);
            if (DOM.uploadStatus) DOM.uploadStatus.textContent = "Gagal mengunggah foto.";
        } finally {
            DOM.saveBtn.disabled = false;
        }
    });
}

/* REALTIME SUBSCRIBER FIRESTORE */
export function initProductsManager(categories) {
    categoryMap.clear();
    if (DOM.category) DOM.category.innerHTML = '<option value="">Pilih Kategori...</option>';
    if (DOM.catFilter) DOM.catFilter.innerHTML = '<option value="ALL">Semua Kategori</option>';

    categories.forEach(cat => {
        categoryMap.set(cat.id, cat.name);
        
        if (DOM.category) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            DOM.category.appendChild(opt);
        }

        if (DOM.catFilter) {
            const filterOpt = document.createElement('option');
            filterOpt.value = cat.id;
            filterOpt.textContent = cat.name;
            DOM.catFilter.appendChild(filterOpt);
        }
    });

    if (unsubscribeProducts) unsubscribeProducts();

    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    unsubscribeProducts = onSnapshot(q, (snapshot) => {
        productsList = [];
        snapshot.forEach(docSnap => {
            productsList.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderProductsTable();
    }, (err) => {
        console.error("Fetch Products Error:", err);
    });
}

/* RENDER TABLE */
function renderProductsTable() {
    if (!DOM.tableBody) return;
    DOM.tableBody.innerHTML = '';
    
    const searchVal = DOM.searchInput ? DOM.searchInput.value.toLowerCase().trim() : '';
    const filterCatVal = DOM.catFilter ? DOM.catFilter.value : 'ALL';

    const filtered = productsList.filter(p => {
        const matchCat = (filterCatVal === "ALL" || p.categoryId === filterCatVal);
        const matchSearch = p.name ? p.name.toLowerCase().includes(searchVal) : true;
        return matchCat && matchSearch;
    });

    if (DOM.countText) DOM.countText.textContent = filtered.length;

    if (filtered.length === 0) {
        DOM.tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada produk.</td></tr>';
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement('tr');
        const catName = categoryMap.get(p.categoryId) || 'Tidak Ada';

        tr.innerHTML = `
            <td><img src="${p.imageUrl || 'https://via.placeholder.com/50'}" class="table-thumb" alt="${p.name}" referrerpolicy="no-referrer"></td>
            <td>
                <strong>${p.name}</strong><br>
                <small style="color:var(--text-muted);">${catName}</small>
            </td>
            <td>Rp ${Number(p.price).toLocaleString('id-ID')}</td>
            <td><span class="status-badge ${p.status}">${p.status}</span></td>
            <td>
                <button type="button" class="btn-outline btn-edit" style="padding:2px 6px;">Edit</button>
                <button type="button" class="btn-danger btn-del" style="padding:2px 6px;">Hapus</button>
            </td>
        `;

        tr.querySelector('.btn-edit').addEventListener('click', () => fillEditForm(p));
        tr.querySelector('.btn-del').addEventListener('click', () => handleDeleteProduct(p));
        DOM.tableBody.appendChild(tr);
    });
}

/* LIVE PREVIEW URL GAMBAR MANUAL */
if (DOM.imageUrlInput) {
    DOM.imageUrlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
            DOM.imagePreview.src = url;
            DOM.imagePreview.setAttribute('referrerpolicy', 'no-referrer');
            DOM.imagePreviewBox.classList.remove('hidden');
        } else {
            DOM.imagePreviewBox.classList.add('hidden');
        }
    });
}

/* FORM SUBMIT (CREATE / UPDATE) */
if (DOM.form) {
    DOM.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEdit = Boolean(DOM.prodId.value);
        const imageUrlVal = DOM.imageUrlInput.value.trim();

        if (!imageUrlVal) {
            alert("URL atau Foto Produk wajib diisi.");
            return;
        }

        DOM.saveBtn.disabled = true;
        DOM.saveBtn.textContent = "Menyimpan...";

        try {
            const productPayload = {
                name: DOM.name.value.trim(),
                slug: generateSlug(DOM.name.value.trim()),
                price: Number(DOM.price.value),
                categoryId: DOM.category.value,
                affiliateUrl: DOM.affiliate.value.trim(),
                status: DOM.status.value,
                shortDescription: DOM.shortDesc ? DOM.shortDesc.value.trim() : '',
                description: DOM.desc ? DOM.desc.value.trim() : '',
                imageUrl: imageUrlVal,
                updatedAt: serverTimestamp()
            };

            if (isEdit) {
                await updateDoc(doc(db, "products", DOM.prodId.value), productPayload);
                showToast("Produk berhasil diperbarui.");
            } else {
                productPayload.createdAt = serverTimestamp();
                await addDoc(collection(db, "products"), productPayload);
                showToast("Produk baru berhasil ditambahkan.");
            }

            resetProductForm();

        } catch (err) {
            console.error("Gagal menyimpan produk:", err);
            alert("Gagal menyimpan data: " + err.message);
        } finally {
            DOM.saveBtn.disabled = false;
            DOM.saveBtn.textContent = "Simpan Produk";
        }
    });
}

/* FILL EDIT FORM */
function fillEditForm(p) {
    if (DOM.formTitle) DOM.formTitle.textContent = "Edit Produk";
    DOM.prodId.value = p.id;
    DOM.name.value = p.name || '';
    DOM.price.value = p.price || 0;
    DOM.category.value = p.categoryId || '';
    DOM.affiliate.value = p.affiliateUrl || '';
    DOM.status.value = p.status || 'active';
    if (DOM.shortDesc) DOM.shortDesc.value = p.shortDescription || '';
    if (DOM.desc) DOM.desc.value = p.description || '';
    
    if (DOM.imageUrlInput) DOM.imageUrlInput.value = p.imageUrl || '';

    if (p.imageUrl) {
        DOM.imagePreview.src = p.imageUrl;
        DOM.imagePreview.setAttribute('referrerpolicy', 'no-referrer');
        DOM.imagePreviewBox.classList.remove('hidden');
    }

    if (DOM.cancelBtn) DOM.cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* DELETE PRODUCT */
async function handleDeleteProduct(p) {
    if (!confirm(`Hapus produk "${p.name}" secara permanen?`)) return;

    try {
        await deleteDoc(doc(db, "products", p.id));
        showToast("Produk berhasil dihapus.");
    } catch (err) {
        alert("Gagal menghapus produk: " + err.message);
    }
}

function resetProductForm() {
    DOM.prodId.value = '';
    if (DOM.form) DOM.form.reset();
    if (DOM.uploadStatus) DOM.uploadStatus.classList.add('hidden');
    if (DOM.formTitle) DOM.formTitle.textContent = "Tambah Produk Baru";
    if (DOM.imagePreviewBox) DOM.imagePreviewBox.classList.add('hidden');
    if (DOM.cancelBtn) DOM.cancelBtn.classList.add('hidden');
}

/* EVENT LISTENERS */
if (DOM.cancelBtn) DOM.cancelBtn.addEventListener('click', resetProductForm);
if (DOM.searchInput) DOM.searchInput.addEventListener('input', renderProductsTable);
if (DOM.catFilter) DOM.catFilter.addEventListener('change', renderProductsTable);
