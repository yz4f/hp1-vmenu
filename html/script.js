// ====================================================================
// 👑 HP1 ROYAL SHOWROOM - LUXURY NUI CONTROLLER (JAVASCRIPT)
// ====================================================================

(function () {
    let currentCategory = 'vip_packs';
    let currentSubcategory = 'ALL';
    let searchQuery = '';
    let displayedCount = 48;
    const CHUNK_SIZE = 48;
    
    // Audio Synthesizer (Web Audio API)
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playSound(type) {
        try {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'hover') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
                gain.gain.setValueAtTime(0.015, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === 'click') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'spawn') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(1040, now + 0.18);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
                osc.start(now);
                osc.stop(now + 0.22);
            }
        } catch (e) {}
    }

    // FiveM Resource Name Helper
    function getResourceName() {
        if (typeof GetParentResourceName === 'function') {
            return GetParentResourceName();
        }
        return 'vmenu_personal';
    }

    // Post to FiveM Lua Client
    function postNUI(endpoint, data = {}) {
        const resource = getResourceName();
        fetch(`https://${resource}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(data)
        }).catch(err => {});
    }

    // UI Elements
    const app = document.getElementById('app');
    const categoriesNav = document.getElementById('categoriesNav');
    const subcategoriesBar = document.getElementById('subcategoriesBar');
    const vehiclesGrid = document.getElementById('vehiclesGrid');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const vehiclesCountBadge = document.getElementById('vehiclesCountBadge');
    const closeBtn = document.getElementById('closeBtn');
    const toastContainer = document.getElementById('toastContainer');

    // Toast Notification
    function showToast(icon, message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // Open & Close Controller
    function openShowroom() {
        app.classList.remove('hidden');
        playSound('click');
        renderCategories();
        renderSubcategories();
        renderVehicles();
        setTimeout(() => {
            searchInput.focus();
        }, 100);
    }

    function closeShowroom() {
        app.classList.add('hidden');
        postNUI('closeMenu');
    }

    closeBtn.addEventListener('click', closeShowroom);
    document.getElementById('backdrop').addEventListener('click', closeShowroom);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeShowroom();
        }
    });

    // FiveM Message Listener
    window.addEventListener('message', function (event) {
        const data = event.data;
        if (!data) return;

        if (data.action === 'open') {
            openShowroom();
        } else if (data.action === 'close') {
            closeShowroom();
        } else if (data.action === 'toast') {
            showToast(data.icon || 'ℹ️', data.message || '');
        }
    });

    // Toolbar Action Handlers
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const action = this.getAttribute('data-action');
            playSound('click');
            postNUI('vehicleAction', { action: action });
            
            const labels = {
                repair: '🔧 Full Repair & Engine Restored',
                wash: '🧼 Vehicle Washed & Detailed',
                fuel: '⛽ Fuel Tank Refilled to 100%',
                flip: '🔄 Vehicle Upright & Stabilized',
                tune: '🚀 Max Performance Tuning Applied',
                delete: '🗑️ Current Vehicle Removed'
            };
            showToast('⚡', labels[action] || 'Action Executed');
        });
    });

    // Categories Rendering
    function renderCategories() {
        categoriesNav.innerHTML = '';
        if (!window.HP1_CATEGORIES) return;

        window.HP1_CATEGORIES.forEach(cat => {
            const tab = document.createElement('button');
            tab.className = `cat-tab ${cat.id === currentCategory ? 'active' : ''}`;
            tab.innerHTML = `
                <span class="cat-tab-icon">${cat.icon}</span>
                <span class="cat-tab-title">${cat.en_title}</span>
                <span class="cat-tab-count">${cat.count}</span>
            `;
            
            tab.addEventListener('mouseenter', () => playSound('hover'));
            tab.addEventListener('click', () => {
                playSound('click');
                currentCategory = cat.id;
                currentSubcategory = 'ALL';
                searchQuery = '';
                searchInput.value = '';
                clearSearch.classList.add('hidden');
                displayedCount = CHUNK_SIZE;
                renderCategories();
                renderSubcategories();
                renderVehicles();
            });

            categoriesNav.appendChild(tab);
        });
    }

    // Subcategories Chips Rendering
    function renderSubcategories() {
        subcategoriesBar.innerHTML = '';
        if (!window.HP1_CATEGORIES) return;

        const catData = window.HP1_CATEGORIES.find(c => c.id === currentCategory);
        if (!catData || !catData.subcategories || catData.subcategories.length === 0) {
            subcategoriesBar.classList.add('hidden');
            return;
        }

        subcategoriesBar.classList.remove('hidden');

        // "ALL" Chip
        const allChip = document.createElement('button');
        allChip.className = `subcat-chip ${currentSubcategory === 'ALL' ? 'active' : ''}`;
        allChip.textContent = `All (${catData.count})`;
        allChip.addEventListener('click', () => {
            playSound('click');
            currentSubcategory = 'ALL';
            displayedCount = CHUNK_SIZE;
            renderSubcategories();
            renderVehicles();
        });
        subcategoriesBar.appendChild(allChip);

        // Subcategory Chips
        catData.subcategories.forEach(sub => {
            const chip = document.createElement('button');
            chip.className = `subcat-chip ${currentSubcategory === sub.title ? 'active' : ''}`;
            chip.textContent = `${sub.title} (${sub.count})`;
            chip.addEventListener('click', () => {
                playSound('click');
                currentSubcategory = sub.title;
                displayedCount = CHUNK_SIZE;
                renderSubcategories();
                renderVehicles();
            });
            subcategoriesBar.appendChild(chip);
        });
    }

    // Get Filtered Vehicles
    function getFilteredVehicles() {
        if (!window.HP1_ALL_VEHICLES) return [];

        let list = [];
        const query = searchQuery.trim().toLowerCase();

        if (query.length > 0) {
            // Global Search across all 1,639 vehicles
            list = window.HP1_ALL_VEHICLES.filter(v => {
                return (
                    v.model.toLowerCase().includes(query) ||
                    v.label.toLowerCase().includes(query) ||
                    (v.subcat && v.subcat.toLowerCase().includes(query))
                );
            });
        } else {
            // Category & Subcategory Filter
            list = window.HP1_ALL_VEHICLES.filter(v => {
                if (v.cat_id !== currentCategory) return false;
                if (currentSubcategory !== 'ALL' && v.subcat !== currentSubcategory) return false;
                return true;
            });
        }

        return list;
    }

    // Vehicles Grid Rendering
    function renderVehicles() {
        vehiclesGrid.innerHTML = '';
        const filtered = getFilteredVehicles();

        vehiclesCountBadge.textContent = `${filtered.length.toLocaleString()} VEHICLES AVAILABLE`;

        if (filtered.length === 0) {
            vehiclesGrid.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🏎️</div>
                    <div class="no-results-text">No vehicles found matching your criteria</div>
                    <div class="no-results-sub">Try searching with a different model code or vehicle name</div>
                </div>
            `;
            return;
        }

        const chunk = filtered.slice(0, displayedCount);

        chunk.forEach(veh => {
            const card = document.createElement('div');
            card.className = 'vehicle-card';

            const cleanSubcat = veh.subcat ? veh.subcat.split('(')[0].replace(/[^\w\s-]/g, '').trim() : 'VIP';

            card.innerHTML = `
                <div class="card-image-box">
                    <span class="card-model-badge">${veh.model.toUpperCase()}</span>
                    <span class="card-cat-badge">${cleanSubcat || 'EXCLUSIVE'}</span>
                    <img src="${veh.image}" alt="${veh.label}" loading="lazy" 
                         onerror="this.onerror=null; this.src='https://docs.fivem.net/vehicles/${veh.model}.webp'; this.addEventListener('error', () => { this.style.display='none'; this.nextElementSibling.style.display='block'; });">
                    <svg class="fallback-car-svg" style="display:none;" viewBox="0 0 24 24">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                    </svg>
                </div>
                <div class="card-details">
                    <div class="card-title-box">
                        <div class="card-title">${veh.label}</div>
                        <div class="card-subtitle">MODEL CODE: ${veh.model.toLowerCase()}</div>
                    </div>
                    <div class="card-actions">
                        <button class="deploy-btn" data-model="${veh.model}" data-label="${veh.label}">
                            <span>🚀</span> DEPLOY VEHICLE
                        </button>
                    </div>
                </div>
            `;

            card.addEventListener('mouseenter', () => playSound('hover'));

            const deployBtn = card.querySelector('.deploy-btn');
            deployBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                playSound('spawn');
                const model = this.getAttribute('data-model');
                const label = this.getAttribute('data-label');
                
                postNUI('spawnVehicle', {
                    model: model,
                    label: label
                });

                showToast('🚀', `Deployed: ${label}`);
            });

            vehiclesGrid.appendChild(card);
        });

        // Infinite Scroll Listener
        vehiclesGrid.onscroll = function () {
            if (vehiclesGrid.scrollTop + vehiclesGrid.clientHeight >= vehiclesGrid.scrollHeight - 250) {
                if (displayedCount < filtered.length) {
                    displayedCount += CHUNK_SIZE;
                    renderVehicles();
                }
            }
        };
    }

    // Search Input Listener with Debounce
    let searchTimeout = null;
    searchInput.addEventListener('input', function () {
        searchQuery = this.value;
        if (searchQuery.length > 0) {
            clearSearch.classList.remove('hidden');
        } else {
            clearSearch.classList.add('hidden');
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            displayedCount = CHUNK_SIZE;
            renderVehicles();
        }, 120);
    });

    clearSearch.addEventListener('click', function () {
        searchInput.value = '';
        searchQuery = '';
        clearSearch.classList.add('hidden');
        displayedCount = CHUNK_SIZE;
        renderVehicles();
    });

    // Initial Test Preview (if opened in browser)
    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') {
        openShowroom();
    }
})();
