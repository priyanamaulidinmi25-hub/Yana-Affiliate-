/**
 * YANA AFFILIATE - FIREBASE PUBLIC SERVICE LAYER
 * Menangani query Firestore Realtime & penanganan error
 */

import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    query, 
    where, 
    orderBy, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Variabel penampung fungsi Unsubscribe untuk mencegah listener ganda
let unsubscribeProducts = null;
let unsubscribeCategories = null;
let unsubscribeSettings = null;

/**
 * Mendengarkan perubahan Produk Aktif secara Realtime
 */
export function subscribeActiveProducts(onData, onError) {
    if (unsubscribeProducts) {
        unsubscribeProducts(); // Bersihkan listener lama jika ada
    }

    try {
        const productsQuery = query(
            collection(db, "products"),
            where("status", "==", "active")
        );

        unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
            const products = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Validasi kelengkapan dokumen dasar
                if (data && data.name && typeof data.price === 'number') {
                    products.push({
                        id: docSnap.id,
                        name: data.name || '',
                        slug: data.slug || docSnap.id,
                        price: Number(data.price) || 0,
                        categoryId: data.categoryId || '',
                        shortDescription: data.shortDescription || '',
                        description: data.description || '',
                        imageUrl: data.imageUrl || '',
                        imagePath: data.imagePath || '',
                        affiliateUrl: data.affiliateUrl || '#',
                        status: data.status || 'active',
                        createdAt: data.createdAt || null,
                        updatedAt: data.updatedAt || null
                    });
                }
            });
            onData(products);
        }, (error) => {
            console.error("Firestore Products Listener Error:", error);
            if (onError) onError(handleFirestoreError(error));
        });
    } catch (err) {
        if (onError) onError("Gagal menghubungkan layanan data produk.");
    }

    return unsubscribeProducts;
}

/**
 * Mendengarkan perubahan Kategori secara Realtime
 */
export function subscribeCategories(onData, onError) {
    if (unsubscribeCategories) {
        unsubscribeCategories();
    }

    try {
        const categoriesQuery = query(
            collection(db, "categories"),
            orderBy("sortOrder", "asc")
        );

        unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
            const categories = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data && data.name) {
                    categories.push({
                        id: docSnap.id,
                        name: data.name,
                        slug: data.slug || docSnap.id,
                        sortOrder: data.sortOrder || 0
                    });
                }
            });
            onData(categories);
        }, (error) => {
            console.error("Firestore Categories Listener Error:", error);
            if (onError) onError(handleFirestoreError(error));
        });
    } catch (err) {
        if (onError) onError("Gagal menghubungkan layanan data kategori.");
    }

    return unsubscribeCategories;
}

/**
 * Mendengarkan Pengaturan Brand & Logo secara Realtime
 */
export function subscribeSiteSettings(onData, onError) {
    if (unsubscribeSettings) {
        unsubscribeSettings();
    }

    try {
        const settingsDocRef = doc(db, "settings", "brand_config");

        unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                onData({
                    brandName: data.brandName || "Yana Affiliate",
                    logoUrl: data.logoUrl || "",
                    logoPath: data.logoPath || "",
                    logoWidth: data.logoWidth || "28px",
                    logoPosition: data.logoPosition || "left",
                    tagline: data.tagline || ""
                });
            } else {
                // Return default jika dokumen belum dibuat di Firestore
                onData({
                    brandName: "Yana Affiliate",
                    logoUrl: "",
                    logoWidth: "28px",
                    tagline: ""
                });
            }
        }, (error) => {
            console.error("Firestore Settings Listener Error:", error);
            if (onError) onError(handleFirestoreError(error));
        });
    } catch (err) {
        if (onError) onError("Gagal memuat pengaturan brand.");
    }

    return unsubscribeSettings;
}

/**
 * Membersihkan semua listener aktif
 */
export function cleanupListeners() {
    if (unsubscribeProducts) unsubscribeProducts();
    if (unsubscribeCategories) unsubscribeCategories();
    if (unsubscribeSettings) unsubscribeSettings();
}

/**
 * Format Pesan Error
 */
function handleFirestoreError(error) {
    if (error.code === 'permission-denied') {
        return "Akses ditolak. Periksa aturan keamanan Firestore Anda.";
    }
    if (error.code === 'unavailable') {
        return "Koneksi terputus. Memeriksa jaringan Anda...";
    }
    return "Terjadi kesalahan saat mengambil data dari server.";
}
