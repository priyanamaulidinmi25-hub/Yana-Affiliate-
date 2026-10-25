/**
 * YANA AFFILIATE - PUBLIC PRODUCT DETAIL CONTROLLER
 */

import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { subscribeSiteSettings } from './firebase-public.js';

/* DOM ELEMENTS */
const DOM = {
    pageTitle: document.getElementById('page-title'),
    siteNameText: document.getElementById('site-name-text'),
    footerSiteName: document.getElementById('footer-site-name'),
    siteLogoContainer: document.getElementById('site-logo-container'),
    
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    
    detailCard: document.getElementById('product-detail-card'),
    detailImage: document.getElementById('detail-image'),
    detailCategoryBadge: document.getElementById('detail-category-badge'),
    detailName: document.getElementById('detail-name'),
    detailPrice: document.getElementById('detail-price'),
    detailShortDesc: document.getElementById('detail-short-description'),
    detailDesc: document.getElementById('detail-description'),
    detailBuyBtn: document.getElementById('detail-buy-btn'),
    
    relatedSection: document.getElementById('related-products-section'),
    relatedGrid: document.getElementById('related-products-grid')
};

/**
 * Sanitasi Text untuk mencegah HTML Injection / XSS
 */
function sanitizeText(str) {
    if (!str) return "";
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

/**
 * Validasi URL Affiliate (Hanya protokol HTTPS)
 */
function validateAffiliateUrl(rawUrl) {
    if (!rawUrl) return "#";
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol === "https:") {
            return parsed.href;
        }
    } catch (e) {
        console.warn("URL Affiliate tidak valid:", rawUrl);
    }
    return "#";
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(number);
}

function showState(stateName, msg = "") {
    DOM.loadingState.classList.add('hidden');
    DOM.errorState.classList.add('hidden');
    DOM.detailCard.classList.add('hidden');

    if (stateName === 'loading') DOM.loadingState.classList.remove('hidden');
    if (stateName === 'error') {
        DOM.errorState.classList.remove('hidden');
        if (msg) DOM.errorMessage.textContent = msg;
    }
    if (stateName === 'content') DOM.detailCard.classList.remove('hidden');
}

/**
 * Memuat Detail Produk berdasarkan ID atau Slug
 */
async function loadProductDetail() {
    showState('loading');

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const productSlug = urlParams.get('slug');

    if (!productId && !productSlug) {
        showState('error', 'Parameter produk tidak ditemukan pada URL.');
        return;
    }

    try {
        let productData = null;
        let pId = productId;

        if (pId) {
            const docRef = doc(db, "products", pId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                productData = { id: docSnap.id, ...docSnap.data() };
            }
        } else if (productSlug) {
            const qSlug = query(
                collection(db, "products"), 
                where("slug", "==", productSlug), 
                where("status", "==", "active"),
                limit(1)
            );
            const snap = await getDocs(qSlug);
            if (!snap.empty) {
                const firstDoc = snap.docs[0];
                productData = { id: firstDoc.id, ...firstDoc.data() };
                pId = firstDoc.id;
            }
        }

        // Validasi ketersediaan dan status aktif produk
        if (!productData || productData.status !== "active") {
            showState('error', 'Produk ini tidak ditemukan atau sedang tidak dipublikasikan.');
            return;
        }

        // Fetch Nama Kategori
        let categoryName = "Umum";
        if (productData.categoryId) {
            try {
                const catSnap = await getDoc(doc(db, "categories", productData.categoryId));
                if (catSnap.exists()) {
                    categoryName = catSnap.data().name || "Umum";
                }
            } catch (cErr) {
                console.warn("Gagal mengambil nama kategori:", cErr);
            }
        }

        renderProductDetail(productData, categoryName);
        loadRelatedProducts(pId, productData.categoryId);

    } catch (err) {
        console.error("Error loading product detail:", err);
        showState('error', 'Terjadi kesalahan saat memuat data produk dari server.');
    }
}

/**
 * Render Antarmuka Detail Produk
 */
function renderProductDetail(product, categoryName) {
    const cleanName = sanitizeText(product.name);
    const cleanShortDesc = sanitizeText(product.shortDescription);
    const cleanDesc = sanitizeText(product.description);
    const safeAffiliateUrl = validateAffiliateUrl(product.affiliateUrl);

    DOM.pageTitle.textContent = `${cleanName} - Yana Affiliate`;
    DOM.detailImage.src = product.imageUrl || 'https://via.placeholder.com/600?text=No+Image';
    DOM.detailImage.alt = cleanName;
    DOM.detailCategoryBadge.textContent = sanitizeText(categoryName);
    
    DOM.detailName.innerHTML = cleanName;
    DOM.detailPrice.textContent = formatRupiah(product.price);
    
    DOM.detailShortDesc.innerHTML = cleanShortDesc;
    DOM.detailDesc.innerHTML = cleanDesc;
    
    DOM.detailBuyBtn.href = safeAffiliateUrl;
    if (safeAffiliateUrl === "#") {
        DOM.detailBuyBtn.style.opacity = "0.5";
        DOM.detailBuyBtn.style.pointerEvents = "none";
        DOM.detailBuyBtn.textContent = "Link Tidak Tersedia";
    }

    showState('content');
}

/**
 * Memuat Produk Terkait dalam Kategori yang Sama
 */
async function loadRelatedProducts(currentProductId, categoryId) {
    if (!categoryId) return;

    try {
        const qRelated = query(
            collection(db, "products"),
            where("categoryId", "==", categoryId),
            where("status", "==", "active"),
            limit(5)
        );

        const snap = await getDocs(qRelated);
        const related = [];

        snap.forEach(docSnap => {
            if (docSnap.id !== currentProductId) {
                related.push({ id: docSnap.id, ...docSnap.data() });
            }
        });

        if (related.length === 0) {
            DOM.relatedSection.classList.add('hidden');
            return;
        }

        DOM.relatedGrid.innerHTML = '';
        related.slice(0, 4).forEach(prod => {
            const card = document.createElement('article');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-thumb">
                    <img src="${prod.imageUrl || 'https://via.placeholder.com/300'}" alt="${sanitizeText(prod.name)}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${sanitizeText(prod.name)}</h3>
                    <div class="price-row">
                        <span class="product-price">${formatRupiah(prod.price)}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `product.html?id=${prod.id}`;
            });

            DOM.relatedGrid.appendChild(card);
        });

        DOM.relatedSection.classList.remove('hidden');

    } catch (err) {
        console.warn("Gagal memuat produk terkait:", err);
    }
}

/**
 * Memuat Pengaturan Header & Branding
 */
function initHeaderSettings() {
    subscribeSiteSettings((settings) => {
        if (settings.brandName) {
            DOM.siteNameText.textContent = settings.brandName;
            if (DOM.footerSiteName) DOM.footerSiteName.textContent = settings.brandName;
        }

        if (settings.logoUrl) {
            DOM.siteLogoContainer.innerHTML = `
                <img src="${settings.logoUrl}" alt="${settings.brandName}" style="width:${settings.logoWidth || '28px'}; height:auto;">
            `;
        } else {
            const firstLetter = (settings.brandName || "Y").charAt(0).toUpperCase();
            DOM.siteLogoContainer.innerHTML = `<span class="logo-fallback">${firstLetter}</span>`;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initHeaderSettings();
    loadProductDetail();
});
