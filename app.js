/**
 * YANA AFFILIATE - PUBLIC CONTROLLER
 */

import { 
    subscribeActiveProducts, 
    subscribeCategories, 
    subscribeSiteSettings,
    cleanupListeners 
} from './firebase-public.js';

/* STATE */
const state = {
    products: [],
    filteredProducts: [],
    categories: [],
    categoryMap: new Map(), // Mapping ID -> Nama Kategori
    selectedCategoryId: "ALL",
    searchQuery: "",
    sortBy: "default"
};

/* DOM ELEMENTS */
const DOM = {
    siteNameText: document.getElementById('site-name-text'),
    footerSiteName: document.getElementById('footer-site-name'),
    siteLogoContainer: document.getElementById('site-logo-container'),
    categoryContainer: document.getElementById('category-container'),
    productGrid: document.getElementById('product-grid'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    sortSelect: document.getElementById('sort-select'),
    resultsCount: document.getElementById('results-count'),
    
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    retryBtn: document.getElementById('retry-btn'),
    resetFilterBtn: document.getElementById('reset-filter-btn'),
    
    // Modal
    detailModal: document.getElementById('detail-modal'),
    modalCloseBtn: document.getElementById('modal-close'),
    modalImg: document.getElementById('modal-img'),
    modalCategory: document.getElementById('modal-category'),
    modalTitle: document.getElementById('modal-title'),
    modalPrice: document.getElementById('modal-price'),
    modalDescription: document.getElementById('modal-description'),
    modalBuyLink: document.getElementById('modal-buy-link')
};

/* FORMAT RUPIAH */
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(number);
}

/* HELPER STATE UI */
function showState(stateName, msg = "") {
    DOM.loadingState.classList.add('hidden');
    DOM.errorState.classList.add('hidden');
    DOM.emptyState.classList.add('hidden');
    DOM.productGrid.classList.add('hidden');

    if (stateName === 'loading') DOM.loadingState.classList.remove('hidden');
    if (stateName === 'error') {
        DOM.errorState.classList.remove('hidden');
        if (msg) DOM.errorMessage.textContent = msg;
    }
    if (stateName === 'empty') DOM.emptyState.classList.remove('hidden');
    if (stateName === 'grid') DOM.productGrid.classList.remove('hidden');
}

/* RENDER BRANDING SETTINGS */
function renderSettings(settings) {
    if (settings.brandName) {
        DOM.siteNameText.textContent = settings.brandName;
        if (DOM.footerSiteName) DOM.footerSiteName.textContent = settings.brandName;
    }

    if (settings.logoUrl) {
        DOM.siteLogoContainer.innerHTML = `
            <img src="${settings.logoUrl}" alt="${settings.brandName}" style="width:${settings.logoWidth || '28px'}; height:auto;" referrerpolicy="no-referrer">
        `;
    } else {
        const firstLetter = (settings.brandName || "Y").charAt(0).toUpperCase();
        DOM.siteLogoContainer.innerHTML = `<span class="logo-fallback">${firstLetter}</span>`;
    }
}

/* RENDER CATEGORIES */
function renderCategories() {
    DOM.categoryContainer.innerHTML = '';

    // Kategori Default "Semua"
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `category-pill ${state.selectedCategoryId === "ALL" ? 'active' : ''}`;
    allBtn.textContent = "Semua Produk";
    allBtn.addEventListener('click', () => {
        state.selectedCategoryId = "ALL";
        renderCategories();
        applyFiltersAndSort();
    });
    DOM.categoryContainer.appendChild(allBtn);

    // Dynamic Categories dari Firestore
    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `category-pill ${cat.id === state.selectedCategoryId ? 'active' : ''}`;
        btn.textContent = cat.name;
        btn.addEventListener('click', () => {
            state.selectedCategoryId = cat.id;
            renderCategories();
            applyFiltersAndSort();
        });
        DOM.categoryContainer.appendChild(btn);
    });
}

/* RENDER PRODUCT GRID */
function renderProducts() {
    DOM.productGrid.innerHTML = '';

    if (state.filteredProducts.length === 0) {
        showState('empty');
        DOM.resultsCount.textContent = '0 Produk';
        return;
    }

    showState('grid');
    DOM.resultsCount.textContent = `${state.filteredProducts.length} Produk`;

    state.filteredProducts.forEach(product => {
        const card = document.createElement('article');
        card.className = 'product-card';

        const categoryName = state.categoryMap.get(product.categoryId) || 'Umum';

        card.innerHTML = `
            <div class="product-thumb">
                <img src="${product.imageUrl || 'https://via.placeholder.com/300?text=No+Image'}" alt="${product.name}" loading="lazy" referrerpolicy="no-referrer">
                <span class="category-tag">${categoryName}</span>
            </div>
            <div class="product-info">
                <div>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-desc-snippet">${product.shortDescription || ''}</p>
                </div>
                <div>
                    <div class="price-row">
                        <span class="product-price">${formatRupiah(product.price)}</span>
                    </div>
                    <a href="${product.affiliateUrl}" target="_blank" rel="noopener noreferrer" class="btn-buy" data-buy-btn="true">
                        Beli Sekarang
                    </a>
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.getAttribute('data-buy-btn') === 'true') {
                e.stopPropagation();
                return;
            }
            openModal(product, categoryName);
        });

        DOM.productGrid.appendChild(card);
    });
}

/* FILTER & SORT */
function applyFiltersAndSort() {
    let list = [...state.products];

    if (state.selectedCategoryId !== "ALL") {
        list = list.filter(p => p.categoryId === state.selectedCategoryId);
    }

    if (state.searchQuery.trim() !== "") {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.shortDescription.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
    }

    if (state.sortBy === "price-low") {
        list.sort((a, b) => a.price - b.price);
    } else if (state.sortBy === "price-high") {
        list.sort((a, b) => b.price - a.price);
    } else if (state.sortBy === "name-asc") {
        list.sort((a, b) => a.name.localeCompare(b.name));
    }

    state.filteredProducts = list;
    renderProducts();
}

/* MODAL */
function openModal(product, categoryName) {
    DOM.modalImg.src = product.imageUrl || 'https://via.placeholder.com/500?text=No+Image';
    DOM.modalImg.alt = product.name;
    DOM.modalImg.setAttribute('referrerpolicy', 'no-referrer');
    DOM.modalImg.removeAttribute('crossorigin'); // Pastikan crossorigin terhapus

    DOM.modalCategory.textContent = categoryName;
    DOM.modalTitle.textContent = product.name;
    DOM.modalPrice.textContent = formatRupiah(product.price);
    DOM.modalDescription.textContent = product.description || product.shortDescription || "Tidak ada deskripsi detail.";
    DOM.modalBuyLink.href = product.affiliateUrl;

    DOM.detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    DOM.detailModal.classList.add('hidden');
    document.body.style.overflow = '';
}

/* INITALIZE REALTIME LISTENERS */
function initRealtimeData() {
    showState('loading');

    // 1. Subscribe Settings
    subscribeSiteSettings((settings) => {
        renderSettings(settings);
    });

    // 2. Subscribe Categories
    subscribeCategories((categories) => {
        state.categories = categories;
        state.categoryMap.clear();
        categories.forEach(c => state.categoryMap.set(c.id, c.name));
        renderCategories();
        applyFiltersAndSort();
    }, (errMessage) => {
        showState('error', errMessage);
    });

    // 3. Subscribe Active Products
    subscribeActiveProducts((products) => {
        state.products = products;
        applyFiltersAndSort();
    }, (errMessage) => {
        showState('error', errMessage);
    });
}

/* EVENT LISTENERS */
function setupEventListeners() {
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        DOM.clearSearchBtn.classList.toggle('hidden', state.searchQuery.length === 0);
        applyFiltersAndSort();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        DOM.clearSearchBtn.classList.add('hidden');
        applyFiltersAndSort();
    });

    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFiltersAndSort();
    });

    DOM.resetFilterBtn.addEventListener('click', () => {
        state.selectedCategoryId = "ALL";
        state.searchQuery = "";
        DOM.searchInput.value = "";
        DOM.clearSearchBtn.classList.add('hidden');
        renderCategories();
        applyFiltersAndSort();
    });

    DOM.retryBtn.addEventListener('click', initRealtimeData);
    DOM.modalCloseBtn.addEventListener('click', closeModal);
    DOM.detailModal.addEventListener('click', (e) => {
        if (e.target === DOM.detailModal) closeModal();
    });
}

/* ENTRY POINT */
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initRealtimeData();
});

// Clean-up listener jika halaman ditutup/ditinggalkan
window.addEventListener('beforeunload', cleanupListeners);
