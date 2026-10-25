/**
 * YANA AFFILIATE - ADMIN AUTHENTICATION & TAB NAVIGATION CONTROLLER
 */

import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* DOM ELEMENTS */
const DOM = {
    loginSection: document.getElementById('login-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    loginForm: document.getElementById('login-form'),
    adminEmail: document.getElementById('admin-email'),
    adminPassword: document.getElementById('admin-password'),
    loginError: document.getElementById('login-error'),
    loginBtn: document.getElementById('login-btn'),
    userEmailDisplay: document.getElementById('user-email-display'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Tab Navigation
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content')
};

/**
 * Listener Pemulihan & Perubahan Sesi Otentikasi
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (DOM.loginSection) DOM.loginSection.classList.add('hidden');
        if (DOM.dashboardSection) DOM.dashboardSection.classList.remove('hidden');
        if (DOM.userEmailDisplay) DOM.userEmailDisplay.textContent = user.email;
    } else {
        if (DOM.loginSection) DOM.loginSection.classList.remove('hidden');
        if (DOM.dashboardSection) DOM.dashboardSection.classList.add('hidden');
        if (DOM.userEmailDisplay) DOM.userEmailDisplay.textContent = "";
    }
});

/**
 * Handle Tab Switching (Kelola Produk, Kelola Kategori, Pengaturan Brand)
 */
if (DOM.tabBtns.length > 0) {
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-tab');

            // Reset status aktif di semua tombol dan konten
            DOM.tabBtns.forEach(b => b.classList.remove('active'));
            DOM.tabContents.forEach(content => content.classList.remove('active'));

            // Aktifkan tombol dan konten yang dipilih
            btn.classList.add('active');
            const targetContent = document.getElementById(targetTabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

/**
 * Handle Login Form Submit
 */
if (DOM.loginForm) {
    DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email = DOM.adminEmail.value.trim();
        const password = DOM.adminPassword.value.trim();

        if (!email || !password) {
            showError("Email dan password wajib diisi.");
            return;
        }

        DOM.loginBtn.disabled = true;
        DOM.loginBtn.textContent = "Memverifikasi...";

        try {
            await signInWithEmailAndPassword(auth, email, password);
            DOM.loginForm.reset();
        } catch (error) {
            console.error("Login Admin Error:", error);
            showError(formatAuthError(error.code));
        } finally {
            DOM.loginBtn.disabled = false;
            DOM.loginBtn.textContent = "Masuk ke Dashboard";
        }
    });
}

/**
 * Handle Logout
 */
if (DOM.logoutBtn) {
    DOM.logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });
}

function showError(message) {
    if (!DOM.loginError) return;
    DOM.loginError.textContent = message;
    DOM.loginError.classList.remove('hidden');
}

function hideError() {
    if (!DOM.loginError) return;
    DOM.loginError.textContent = "";
    DOM.loginError.classList.add('hidden');
}

function formatAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return "Email atau password yang Anda masukkan salah.";
        case 'auth/too-many-requests':
            return "Terlalu banyak percobaan gagal. Silakan coba lagi nanti.";
        case 'auth/network-request-failed':
            return "Gagal terhubung ke jaringan. Periksa koneksi internet Anda.";
        default:
            return "Gagal melakukan verifikasi otentikasi.";
    }
}
