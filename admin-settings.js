/**
 * YANA AFFILIATE - ADMIN BRAND SETTINGS CONTROLLER (SUPABASE STORAGE UPLOAD)
 */

import { db } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// CONFIG SUPABASE STORAGE
const SUPABASE_URL = 'https://bswbrjexadpyovrryndc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzd2JyamV4YWRweW92cnJ5bmRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDg3NjMsImV4cCI6MjEwODUyNDc2M30.viNU0QFuWjxSfs24qbjCQSqXKS-NasToLP5MQxjvk1A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    global: {
        headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    }
});

/* DOM ELEMENTS (DISESUAIKAN DENGAN ID DI admin.html) */
const DOM = {
    form: document.getElementById('settings-form'),
    brandName: document.getElementById('set-brand-name'),
    tagline: document.getElementById('set-tagline'),
    logoFileInput: document.getElementById('set-logo-file'),
    logoUrlInput: document.getElementById('set-logo-url'),
    uploadStatus: document.getElementById('settings-upload-status'),
    logoPreviewContainer: document.getElementById('setting-logo-preview-box'),
    logoPreview: document.getElementById('setting-logo-preview'),
    logoWidth: document.getElementById('set-logo-width'),
    logoPosition: document.getElementById('set-logo-pos'),
    saveBtn: document.getElementById('save-settings-btn'),
    toastMsg: document.getElementById('toast-msg')
};

function showToast(msg) {
    if (!DOM.toastMsg) return;
    DOM.toastMsg.textContent = msg;
    DOM.toastMsg.classList.remove('hidden');
    setTimeout(() => DOM.toastMsg.classList.add('hidden'), 3000);
}

/* UPLOAD LOGO KE SUPABASE STORAGE (BUCKET: products) */
if (DOM.logoFileInput) {
    DOM.logoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (DOM.uploadStatus) {
            DOM.uploadStatus.textContent = "Mengunggah logo ke Supabase...";
            DOM.uploadStatus.classList.remove('hidden');
        }
        if (DOM.saveBtn) DOM.saveBtn.disabled = true;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${Date.now()}.${fileExt}`;

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

            // Isikan URL hasil upload ke input URL
            if (DOM.logoUrlInput) DOM.logoUrlInput.value = downloadURL;

            // Tampilkan Preview Logo
            if (DOM.logoPreview) {
                DOM.logoPreview.src = downloadURL;
                DOM.logoPreview.setAttribute('referrerpolicy', 'no-referrer');
            }
            if (DOM.logoPreviewContainer) DOM.logoPreviewContainer.classList.remove('hidden');

            if (DOM.uploadStatus) DOM.uploadStatus.textContent = "Logo berhasil diunggah!";
        } catch (err) {
            console.error("Upload logo error:", err);
            alert("Gagal mengunggah logo: " + err.message);
            if (DOM.uploadStatus) DOM.uploadStatus.textContent = "Gagal mengunggah logo.";
        } finally {
            if (DOM.saveBtn) DOM.saveBtn.disabled = false;
        }
    });
}

/**
 * Memuat Pengaturan Brand dari Firestore
 */
export async function initBrandSettings() {
    if (!DOM.form) return;

    try {
        const docRef = doc(db, "settings", "brand_config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (DOM.brandName) DOM.brandName.value = data.brandName || "Yana Affiliate";
            if (DOM.tagline) DOM.tagline.value = data.tagline || "";
            if (DOM.logoWidth) DOM.logoWidth.value = parseInt(data.logoWidth, 10) || 28;
            if (DOM.logoPosition) DOM.logoPosition.value = data.logoPosition || "left";

            if (data.logoUrl) {
                if (DOM.logoUrlInput) DOM.logoUrlInput.value = data.logoUrl;
                if (DOM.logoPreview) {
                    DOM.logoPreview.src = data.logoUrl;
                    DOM.logoPreview.setAttribute('referrerpolicy', 'no-referrer');
                }
                if (DOM.logoPreviewContainer) DOM.logoPreviewContainer.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error("Gagal memuat pengaturan brand:", err);
    }
}

/* LIVE PREVIEW URL LOGO MANUAL */
if (DOM.logoUrlInput) {
    DOM.logoUrlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
            if (DOM.logoPreview) {
                DOM.logoPreview.src = url;
                DOM.logoPreview.setAttribute('referrerpolicy', 'no-referrer');
            }
            if (DOM.logoPreviewContainer) DOM.logoPreviewContainer.classList.remove('hidden');
        } else {
            if (DOM.logoPreviewContainer) DOM.logoPreviewContainer.classList.add('hidden');
        }
    });
}

/* SUBMIT FORM PENGATURAN */
if (DOM.form) {
    DOM.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const brandNameVal = DOM.brandName.value.trim();
        const logoWidthVal = parseInt(DOM.logoWidth.value, 10);
        const logoUrlVal = DOM.logoUrlInput ? DOM.logoUrlInput.value.trim() : "";

        if (!brandNameVal) {
            alert("Nama brand wajib diisi.");
            return;
        }

        if (isNaN(logoWidthVal) || logoWidthVal < 16 || logoWidthVal > 200) {
            alert("Lebar logo harus antara 16px hingga 200px.");
            return;
        }

        DOM.saveBtn.disabled = true;
        DOM.saveBtn.textContent = "Menyimpan...";

        try {
            const settingsPayload = {
                brandName: brandNameVal,
                tagline: DOM.tagline ? DOM.tagline.value.trim() : "",
                logoWidth: `${logoWidthVal}px`,
                logoPosition: DOM.logoPosition ? DOM.logoPosition.value : "left",
                logoUrl: logoUrlVal,
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, "settings", "brand_config"), settingsPayload, { merge: true });
            showToast("Pengaturan brand berhasil disimpan.");

        } catch (err) {
            console.error("Gagal menyimpan pengaturan:", err);
            alert("Gagal menyimpan pengaturan: " + err.message);
        } finally {
            DOM.saveBtn.disabled = false;
            DOM.saveBtn.textContent = "Simpan Pengaturan";
        }
    });
}

document.addEventListener('DOMContentLoaded', initBrandSettings);
