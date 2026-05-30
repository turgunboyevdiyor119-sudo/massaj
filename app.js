/**
 * Baby Massage Center SPA Logic
 * Powered by Antigravity Design System & Express Backend API
 */

class BabyMassageApp {
  constructor() {
    this.currentView = 'home';
    this.currentPriceCategory = 'children';
    this.bookingCategory = 'children';
    this.bookingStep = 1;
    this.selectedTimeSlot = null;
    this.activeAdminSection = 'stats';
    
    // Loaded lists cache to avoid redundant API hits
    this.cachedServices = [];
    this.cachedWorkers = [];

    // Bind methods
    this.handleHashChange = this.handleHashChange.bind(this);
    
    // Initialize
    this.init();
  }

  init() {
    // Setup Event Listeners
    window.addEventListener('hashchange', this.handleHashChange);
    window.addEventListener('scroll', this.handleScroll);
    
    // Custom DOM elements setup
    this.generateVisualDecorations();
    
    // Sync initial router view
    this.handleHashChange();
    
    // Register event listeners for navigation and mobile tabs
    this.setupNavigationListeners();

    // Auto-update booking date min attribute to today (UTC+5 Tashkent timezone adjustment)
    this.setupBookingDatePicker();
  }

  // Generic REST API requests helper
  async apiRequest(url, method = 'GET', body = null) {
    const user = this.getCurrentUser();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Simulate stateless session authentication using request headers
    if (user) {
      headers['x-user-role'] = user.role;
      if (user.phone) headers['x-user-phone'] = user.phone;
      if (user.username) headers['x-user-username'] = user.username;
      if (user.name) headers['x-user-name'] = user.name;
    }
    
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`API Error: ${url}`, err);
      throw err;
    }
  }

  // Get current active session
  getCurrentUser() {
    const userStr = localStorage.getItem('bmc_active_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Helpers for Tashkent Time (UTC+5)
  getTashkentDateString(offsetDays = 0) {
    const date = new Date();
    const tashkentTime = date.getTime() + (date.getTimezoneOffset() * 60000) + (5 * 3600000);
    const shiftedDate = new Date(tashkentTime + (offsetDays * 24 * 3600000));
    
    const yyyy = shiftedDate.getFullYear();
    let mm = shiftedDate.getMonth() + 1;
    let dd = shiftedDate.getDate();
    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;
    return `${yyyy}-${mm}-${dd}`;
  }

  // CSS Ambient elements creator
  generateVisualDecorations() {
    const bubblesContainer = document.getElementById('bubbles-container');
    const leavesContainer = document.getElementById('leaves-container');

    if (bubblesContainer) {
      bubblesContainer.innerHTML = '';
      for (let i = 0; i < 12; i++) {
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        const size = Math.random() * 60 + 20;
        const left = Math.random() * 100;
        const delay = Math.random() * 10;
        const duration = Math.random() * 10 + 10;

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}%`;
        bubble.style.animationDelay = `${delay}s`;
        bubble.style.animationDuration = `${duration}s`;

        bubblesContainer.appendChild(bubble);
      }
    }

    if (leavesContainer) {
      leavesContainer.innerHTML = '';
      const leafIcons = ['fa-leaf', 'fa-seedling', 'fa-spa'];
      for (let i = 0; i < 8; i++) {
        const leaf = document.createElement('div');
        leaf.classList.add('leaf');
        
        const randomIcon = leafIcons[Math.floor(Math.random() * leafIcons.length)];
        leaf.innerHTML = `<i class="fa-solid ${randomIcon}"></i>`;
        
        const left = Math.random() * 100;
        const delay = Math.random() * 12;
        const duration = Math.random() * 12 + 12;
        const fontSize = Math.random() * 1 + 0.8;

        leaf.style.left = `${left}%`;
        leaf.style.animationDelay = `${delay}s`;
        leaf.style.animationDuration = `${duration}s`;
        leaf.style.fontSize = `${fontSize}rem`;

        leavesContainer.appendChild(leaf);
      }
    }
  }

  // Setup Date Pickers limiters
  setupBookingDatePicker() {
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
      // Find next non-Sunday date from today
      const today = this.getTashkentDateString(0);
      const firstValid = this.getNextWorkingDay(today);
      dateInput.min = firstValid;
      dateInput.value = firstValid;

      // Block Sunday selection
      dateInput.addEventListener('change', () => {
        const selected = new Date(dateInput.value + 'T00:00:00');
        if (selected.getDay() === 0) { // 0 = Sunday
          this.showAlert('Yakshanba — dam olish kuni! Boshqa kun tanlang.', 'warning');
          // Move to next Monday
          const monday = new Date(selected);
          monday.setDate(monday.getDate() + 1);
          dateInput.value = monday.toISOString().split('T')[0];
        }
        this.loadAvailableTimeSlots();
      });
    }
  }

  // Returns next available working day (skip Sundays)
  getNextWorkingDay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    while (d.getDay() === 0) { // 0 = Sunday
      d.setDate(d.getDate() + 1);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Setup header shrink on scroll
  handleScroll() {
    const header = document.getElementById('main-header');
    if (window.scrollY > 50) {
      header.classList.add('header-scrolled');
    } else {
      header.classList.remove('header-scrolled');
    }
  }

  // SPA router handler
  async handleHashChange() {
    const hash = window.location.hash || '#home';
    const viewName = hash.replace('#', '');
    
    // Page access guards
    const user = this.getCurrentUser();
    
    if (viewName === 'admin') {
      if (!user || user.role !== 'admin') {
        this.showAlert('Ushbu sahifaga kirish uchun avval admin profili bilan kiring.', 'warning');
        window.location.hash = '#login';
        return;
      }
    } else if (viewName === 'worker') {
      if (!user || user.role !== 'worker') {
        this.showAlert('Ushbu sahifaga kirish uchun avval xodim profili bilan kiring.', 'warning');
        window.location.hash = '#login';
        return;
      }
    } else if (viewName === 'client-dashboard') {
      if (!user || user.role !== 'client') {
        window.location.hash = '#login';
        return;
      }
    }

    // Deactivate all views and activate current view
    const views = document.querySelectorAll('.spa-view');
    views.forEach(view => {
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`${viewName}-view`);
    if (activeView) {
      activeView.classList.add('active');
      this.currentView = viewName;
    } else {
      const homeView = document.getElementById('home-view');
      if (homeView) homeView.classList.add('active');
      this.currentView = 'home';
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    // Update Navigation UI
    this.updateNavigationUI(viewName);

    try {
      // Load branch layout details dynamically from server
      await this.renderCenterLayoutDetails();

      // Trigger page-specific renders
      await this.onViewLoaded(viewName);
    } catch (err) {
      console.error("Router navigation error:", err);
    }
  }

  // Dynamic route load triggers
  async onViewLoaded(view) {
    if (view === 'prices') {
      await this.renderPricesGrid();
    } else if (view === 'booking') {
      await this.resetBookingForm();
    } else if (view === 'client-dashboard') {
      await this.renderClientDashboard();
    } else if (view === 'worker') {
      await this.renderWorkerDashboard();
    } else if (view === 'admin') {
      await this.switchAdminSection(this.activeAdminSection);
    }
  }

  // Render prices page category content
  async renderPricesGrid() {
    const grid = document.getElementById('prices-grid');
    if (!grid) return;
    
    try {
      const services = await this.apiRequest('/api/services');
      this.cachedServices = services;
      const filtered = services.filter(s => s.category === this.currentPriceCategory);

      grid.innerHTML = '';
      
      filtered.forEach(service => {
        const card = document.createElement('div');
        card.className = 'price-card glass-panel';
        
        const formattedPrice = new Intl.NumberFormat('uz-UZ').format(service.price);
        const icon = this.currentPriceCategory === 'children' ? 'fa-baby' : 'fa-person-dress';
        
        card.innerHTML = `
          <div class="price-card-header">
            <span class="price-category-tag"><i class="fa-solid ${icon}"></i> ${this.currentPriceCategory === 'children' ? 'Bolalar' : 'Ayollar'}</span>
            <h3>${service.name}</h3>
          </div>
          <div class="price-amount-box">
            <span class="price-val">${formattedPrice}</span>
            <span class="price-unit">so'm</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.quickAction('booking', '${this.currentPriceCategory}', '${service.id}')">
            <i class="fa-solid fa-calendar-check"></i> Bron qilish
          </button>
        `;
        grid.appendChild(card);
      });
    } catch (err) {
      this.showAlert("Xizmatlarni yuklashda xatolik yuz berdi.", "danger");
    }
  }

  togglePriceCategory(category) {
    this.currentPriceCategory = category;
    document.getElementById('tab-btn-children').classList.toggle('active', category === 'children');
    document.getElementById('tab-btn-women').classList.toggle('active', category === 'women');
    this.renderPricesGrid();
  }

  // Quick action from pricing or features
  quickAction(view, category, serviceId = '') {
    this.bookingCategory = category;
    window.location.hash = `#${view}`;
    
    setTimeout(async () => {
      await this.setBookingCategory(category);
      if (serviceId) {
        const selectElement = document.getElementById('booking-service');
        if (selectElement) {
          selectElement.value = serviceId;
          this.updateBookingSummary();
        }
      }
    }, 150);
  }

  // Render basic details like phone & address based on admin settings
  async renderCenterLayoutDetails() {
    try {
      const info = await this.apiRequest('/api/info');
      if (!info) return;

      // Header updates
      const headerTitle = document.getElementById('header-brand-name');
      if (headerTitle) headerTitle.textContent = info.name;
      
      const headerPhoneText = document.getElementById('header-phone-text');
      if (headerPhoneText) headerPhoneText.textContent = info.phone;
      
      const headerPhoneBadge = document.getElementById('header-phone-badge');
      if (headerPhoneBadge) headerPhoneBadge.href = `tel:${info.phone.replace(/\s+/g, '')}`;

      // Hero title
      const heroTitle = document.getElementById('hero-title-text');
      if (heroTitle && this.currentView === 'home') heroTitle.textContent = info.name;

      // Info banner updates
      const bannerAddress = document.getElementById('banner-address');
      if (bannerAddress) bannerAddress.textContent = info.address;
      
      const bannerPhone = document.getElementById('banner-phone');
      if (bannerPhone) bannerPhone.textContent = info.phone;
      
      const bannerHours = document.getElementById('banner-hours');
      if (bannerHours) bannerHours.textContent = info.hours;
      
      const bannerCallBtn = document.getElementById('banner-call-btn');
      if (bannerCallBtn) bannerCallBtn.href = `tel:${info.phone.replace(/\s+/g, '')}`;

      // Contact view updates
      const contactCenterName = document.getElementById('contact-center-name');
      if (contactCenterName) contactCenterName.textContent = info.name;
      
      const contactAddress = document.getElementById('contact-address');
      if (contactAddress) contactAddress.textContent = info.address;
      
      const contactPhone = document.getElementById('contact-phone');
      if (contactPhone) contactPhone.textContent = info.phone;
      
      const contactHours = document.getElementById('contact-hours');
      if (contactHours) contactHours.textContent = `${info.hours} (Dam olish kunlarisiz)`;
      
      const contactCallBtn = document.getElementById('contact-call-btn');
      if (contactCallBtn) contactCallBtn.href = `tel:${info.phone.replace(/\s+/g, '')}`;
    } catch (err) {
      console.error("Settings rendering failed:", err);
    }

    // Profiles header buttons
    const user = this.getCurrentUser();
    const profileBtn = document.getElementById('profile-btn');
    const profileBtnText = document.getElementById('profile-btn-text');

    if (profileBtn && profileBtnText) {
      if (user) {
        profileBtnText.textContent = user.name;
        profileBtn.classList.add('logged-in');
      } else {
        profileBtnText.textContent = "Kirish";
        profileBtn.classList.remove('logged-in');
      }
    }
  }

  // Setup general page transitions and bottom mobile tabs
  setupNavigationListeners() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    const mobileNavItems = document.querySelectorAll('.mobile-nav-bar a');
    mobileNavItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-view');
        if (view === 'profile') return;
        
        mobileNavItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        window.location.hash = `#${view}`;
      });
    });
  }

  updateNavigationUI(viewName) {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
      const dataView = link.getAttribute('data-view');
      link.classList.toggle('active', dataView === viewName);
    });

    const mobileItems = document.querySelectorAll('.mobile-nav-bar a');
    mobileItems.forEach(item => {
      const dataView = item.getAttribute('data-view');
      if (dataView === 'profile') {
        const user = this.getCurrentUser();
        const profileActive = viewName === 'client-dashboard' || viewName === 'worker' || viewName === 'admin';
        item.classList.toggle('active', profileActive);
      } else {
        item.classList.toggle('active', dataView === viewName);
      }
    });
  }

  navigateToAuthOrDashboard() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.hash = '#login';
    } else {
      if (user.role === 'admin') {
        window.location.hash = '#admin';
      } else if (user.role === 'worker') {
        window.location.hash = '#worker';
      } else {
        window.location.hash = '#client-dashboard';
      }
    }
  }

  // ---------------- AUTHENTICATION & SESSIONS ----------------

  switchAuthTab(tab) {
    document.getElementById('auth-tab-client').classList.toggle('active', tab === 'client');
    document.getElementById('auth-tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('auth-tab-worker').classList.toggle('active', tab === 'worker');

    document.getElementById('client-login-form-block').style.display = tab === 'client' ? 'block' : 'none';
    document.getElementById('client-register-form-block').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('staff-login-form-block').style.display = tab === 'worker' ? 'block' : 'none';
  }

  async handleClientLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('client-phone').value.trim();
    const password = document.getElementById('client-password').value;

    try {
      const res = await this.apiRequest('/api/auth/login', 'POST', { phone, password, isStaff: false });
      localStorage.setItem('bmc_active_user', JSON.stringify(res.user));
      this.showAlert(`Xush kelibsiz, ${res.user.name}!`, 'success');
      await this.renderCenterLayoutDetails();
      window.location.hash = '#client-dashboard';
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  async handleClientRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;

    if (password.length < 4) {
      this.showAlert('Parol kamida 4 ta belgidan iborat bo\'lishi shart!', 'warning');
      return;
    }

    try {
      const res = await this.apiRequest('/api/auth/register', 'POST', { name, phone, password });
      localStorage.setItem('bmc_active_user', JSON.stringify(res.user));
      this.showAlert('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!', 'success');
      await this.renderCenterLayoutDetails();
      window.location.hash = '#client-dashboard';
    } catch (err) {
      this.showAlert(err.message, 'warning');
    }
  }

  async handleStaffLogin(e) {
    e.preventDefault();
    const username = document.getElementById('staff-username').value.trim();
    const password = document.getElementById('staff-password').value;

    try {
      const res = await this.apiRequest('/api/auth/login', 'POST', { username, password, isStaff: true });
      localStorage.setItem('bmc_active_user', JSON.stringify(res.user));
      this.showAlert(`Xush kelibsiz, ${res.user.name}!`, 'success');
      await this.renderCenterLayoutDetails();
      
      if (res.user.role === 'admin') {
        this.activeAdminSection = 'stats';
        window.location.hash = '#admin';
      } else {
        window.location.hash = '#worker';
      }
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  handleLogout() {
    localStorage.removeItem('bmc_active_user');
    this.showAlert('Tizimdan muvaffaqiyatli chiqdingiz.', 'success');
    this.renderCenterLayoutDetails();
    window.location.hash = '#home';
  }

  // ---------------- CLIENT DASHBOARD WORKFLOWS ----------------

  async renderClientDashboard() {
    const user = this.getCurrentUser();
    if (!user) return;

    document.getElementById('client-welcome-name').textContent = `Xush kelibsiz, ${user.name}!`;
    document.getElementById('client-welcome-phone').textContent = user.phone;
    document.getElementById('client-avatar-letter').textContent = user.name.charAt(0).toUpperCase();

    const tbody = document.getElementById('client-bookings-tbody');
    if (!tbody) return;

    try {
      const myBookings = await this.apiRequest('/api/bookings');
      tbody.innerHTML = '';

      if (myBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Sizda hali bronlar mavjud emas.</td></tr>`;
        return;
      }

      myBookings.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));

      myBookings.forEach(b => {
        const tr = document.createElement('tr');
        const formattedPrice = new Intl.NumberFormat('uz-UZ').format(b.price) + ' so\'m';
        
        let statusLabel = '';
        let cancelBtn = '';

        if (b.status === 'pending') {
          statusLabel = `<span class="status-badge status-pending"><i class="fa-solid fa-hourglass-half"></i> Kutilmoqda</span>`;
          cancelBtn = `<button class="btn btn-outline-gold btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="app.cancelBooking('${b.id}')"><i class="fa-solid fa-xmark"></i> Bekor qilish</button>`;
        } else if (b.status === 'confirmed') {
          statusLabel = `<span class="status-badge status-confirmed"><i class="fa-solid fa-circle-check"></i> Tasdiqlangan</span>`;
          cancelBtn = `<button class="btn btn-outline-gold btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="app.cancelBooking('${b.id}')"><i class="fa-solid fa-xmark"></i> Bekor qilish</button>`;
        } else {
          statusLabel = `<span class="status-badge status-cancelled"><i class="fa-solid fa-ban"></i> Bekor qilingan</span>`;
          cancelBtn = `<span style="color: var(--text-muted); font-size: 0.8rem;">Yo'q</span>`;
        }

        tr.innerHTML = `
          <td style="font-weight: 600;">${b.serviceName}</td>
          <td>${b.date} &nbsp;|&nbsp; <strong>${b.time}</strong></td>
          <td>${b.workerName}</td>
          <td>${formattedPrice}</td>
          <td>${statusLabel}</td>
          <td>${cancelBtn}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      this.showAlert("Ma'lumotlarni olishda xatolik yuz berdi.", "danger");
    }
  }

  async cancelBooking(id) {
    if (confirm('Ushbu bronni bekor qilishga ishonchingiz komilmi?')) {
      try {
        await this.apiRequest(`/api/bookings/${id}/status`, 'PUT', { status: 'cancelled' });
        this.showAlert('Bron muvaffaqiyatli bekor qilindi.', 'success');
        await this.renderClientDashboard();
      } catch (err) {
        this.showAlert(err.message, 'danger');
      }
    }
  }

  // ---------------- BOOKING PROCESS ENGINE ----------------

  async resetBookingForm() {
    this.bookingStep = 1;
    this.selectedTimeSlot = null;
    await this.setBookingCategory(this.bookingCategory);
    this.nextBookingStep(1);
  }

  async setBookingCategory(category) {
    this.bookingCategory = category;
    
    const cardChildren = document.getElementById('select-type-children');
    const cardWomen = document.getElementById('select-type-women');
    
    if (cardChildren && cardWomen) {
      cardChildren.classList.toggle('active', category === 'children');
      cardWomen.classList.toggle('active', category === 'women');
    }

    try {
      const services = await this.apiRequest('/api/services');
      this.cachedServices = services;
      const filtered = services.filter(s => s.category === category);
      
      const serviceSelect = document.getElementById('booking-service');
      if (serviceSelect) {
        serviceSelect.innerHTML = '';
        filtered.forEach(s => {
          const option = document.createElement('option');
          option.value = s.id;
          option.textContent = `${s.name} (${new Intl.NumberFormat('uz-UZ').format(s.price)} so'm)`;
          serviceSelect.appendChild(option);
        });
      }

      const workers = await this.apiRequest('/api/workers');
      this.cachedWorkers = workers;
      const workerSelect = document.getElementById('booking-worker');
      if (workerSelect) {
        workerSelect.innerHTML = '';
        workers.forEach(w => {
          const option = document.createElement('option');
          option.value = w.name;
          option.textContent = w.name;
          workerSelect.appendChild(option);
        });
      }
    } catch (err) {
      console.error(err);
    }

    this.updateBookingSummary();
  }

  async nextBookingStep(step) {
    this.bookingStep = step;
    
    document.getElementById('booking-step-content-1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('booking-step-content-2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('booking-step-content-3').style.display = step === 3 ? 'block' : 'none';

    document.getElementById('prog-step-1').className = `progress-step ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`;
    document.getElementById('prog-step-2').className = `progress-step ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`;
    document.getElementById('prog-step-3').className = `progress-step ${step >= 3 ? 'active' : ''}`;

    if (step === 2) {
      await this.loadAvailableTimeSlots();
    }
    
    if (step === 3) {
      this.updateBookingSummary();
    }
  }

  async loadAvailableTimeSlots() {
    const slotsGrid = document.getElementById('booking-slots-grid');
    if (!slotsGrid) return;

    const dateVal = document.getElementById('booking-date').value;
    const workerVal = document.getElementById('booking-worker').value;

    slotsGrid.innerHTML = '';

    if (!dateVal || !workerVal) {
      slotsGrid.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Sana va xodimni tanlang.</p>';
      return;
    }

    // Block Sunday
    const selectedDay = new Date(dateVal + 'T00:00:00').getDay();
    if (selectedDay === 0) {
      slotsGrid.innerHTML = '<p style="color: var(--accent-gold); font-size: 0.9rem;"><i class="fa-solid fa-moon"></i> Yakshanba — dam olish kuni. Boshqa kun tanlang.</p>';
      return;
    }

    try {
      const busySlots = await this.apiRequest('/api/bookings/busy');

      // Generate 45-minute slots from 08:00 to 17:45
      const slots = [];
      let startMinutes = 8 * 60; // 08:00
      const endMinutes = 18 * 60; // 18:00 (exclusive)
      while (startMinutes + 45 <= endMinutes) {
        const h = Math.floor(startMinutes / 60);
        const m = startMinutes % 60;
        slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
        startMinutes += 45;
      }

      slots.forEach(slot => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'slot-btn';
        button.textContent = slot;

        // Check if this slot or any overlapping slot is occupied
        const slotStart = this.timeToMinutes(slot);
        const slotEnd = slotStart + 45;
        const isOccupied = busySlots.some(b => {
          if (b.date !== dateVal || b.workerName.toLowerCase() !== workerVal.toLowerCase()) return false;
          const busyStart = this.timeToMinutes(b.time);
          const busyEnd = busyStart + 45;
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (isOccupied) {
          button.disabled = true;
          button.title = 'Band';
        } else {
          button.onclick = () => {
            const allSlotBtns = slotsGrid.querySelectorAll('.slot-btn');
            allSlotBtns.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            this.selectedTimeSlot = slot;
            this.updateBookingSummary();
          };

          if (this.selectedTimeSlot === slot) {
            button.classList.add('active');
          }
        }

        slotsGrid.appendChild(button);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Helper: convert "HH:MM" to total minutes
  timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  updateBookingSummary() {
    const user = this.getCurrentUser();
    
    const serviceId = document.getElementById('booking-service') ? document.getElementById('booking-service').value : '';
    const service = this.cachedServices.find(s => s.id === serviceId);

    const workerName = document.getElementById('booking-worker') ? document.getElementById('booking-worker').value : '-';
    const dateVal = document.getElementById('booking-date') ? document.getElementById('booking-date').value : '-';
    
    const clientNameNode = document.getElementById('sum-client-name');
    const clientPhoneNode = document.getElementById('sum-client-phone');
    const serviceNameNode = document.getElementById('sum-service-name');
    const dateTimeNode = document.getElementById('sum-date-time');
    const workerNameNode = document.getElementById('sum-worker-name');
    const priceTotalNode = document.getElementById('sum-price-total');

    if (user) {
      if (clientNameNode) clientNameNode.textContent = user.name;
      if (clientPhoneNode) clientPhoneNode.textContent = user.phone;
    } else {
      if (clientNameNode) clientNameNode.innerHTML = `<span style="color: var(--accent-gold); font-size: 0.85rem;"><i class="fa-solid fa-triangle-exclamation"></i> Tizimga kirmagansiz</span>`;
      if (clientPhoneNode) clientPhoneNode.textContent = '-';
    }

    if (service) {
      if (serviceNameNode) serviceNameNode.textContent = service.name;
      if (priceTotalNode) priceTotalNode.textContent = `${new Intl.NumberFormat('uz-UZ').format(service.price)} so'm`;
    }

    if (dateTimeNode) {
      dateTimeNode.textContent = `${dateVal} | ${this.selectedTimeSlot ? this.selectedTimeSlot : 'Vaqt tanlanmagan'}`;
    }

    if (workerNameNode) workerNameNode.textContent = workerName;
  }

  async handleBookingSubmit(e) {
    e.preventDefault();
    const user = this.getCurrentUser();

    if (!user) {
      this.showAlert('Bron qilish uchun avval mijoz profilingizga kiring yoki ro\'yxatdan o\'ting.', 'warning');
      window.location.hash = '#login';
      return;
    }

    if (user.role !== 'client') {
      this.showAlert('Bron faqat mijoz profili orqali amalga oshiriladi!', 'warning');
      return;
    }

    if (!this.selectedTimeSlot) {
      this.showAlert('Iltimos, uchrashuv vaqtini (slot) tanlang!', 'warning');
      this.nextBookingStep(2);
      return;
    }

    const serviceId = document.getElementById('booking-service').value;
    const workerName = document.getElementById('booking-worker').value;
    const dateVal = document.getElementById('booking-date').value;
    const comment = document.getElementById('booking-comment').value.trim();

    try {
      await this.apiRequest('/api/bookings', 'POST', {
        serviceId,
        workerName,
        date: dateVal,
        time: this.selectedTimeSlot,
        comment
      });

      this.showAlert('Bron muvaffaqiyatli jo\'natildi! Tasdiqlash kutilmoqda.', 'success');
      window.location.hash = '#client-dashboard';
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  // ---------------- WORKER DASHBOARD WORKFLOWS ----------------

  async renderWorkerDashboard() {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'worker') return;

    document.getElementById('worker-welcome-name').textContent = `Xush kelibsiz, ${user.name}!`;
    document.getElementById('worker-avatar-letter').textContent = user.name.charAt(0).toUpperCase();

    try {
      const bookings = await this.apiRequest('/api/bookings');
      const todayStr = this.getTashkentDateString(0);
      const currentMonth = new Date(todayStr).getMonth();
      const currentYear = new Date(todayStr).getFullYear();

      // Compute stats
      const todayBookings = bookings.filter(b => b.date === todayStr && b.status !== 'cancelled');
      const weeklyBookings = bookings.filter(b => {
        const diff = Math.abs(new Date(b.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24);
        return diff <= 7 && b.status !== 'cancelled';
      });
      const monthlyConfirmed = bookings.filter(b => {
        const d = new Date(b.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && b.status === 'confirmed';
      });

      document.getElementById('worker-stats-today').textContent = todayBookings.length;
      document.getElementById('worker-stats-week').textContent = weeklyBookings.length;
      document.getElementById('worker-stats-month').textContent = monthlyConfirmed.length;

      // Monthly earnings (50% of confirmed this month)
      const monthlyTotal = monthlyConfirmed.reduce((sum, b) => sum + b.price, 0);
      const workerShare = Math.floor(monthlyTotal / 2);
      const fmt = v => new Intl.NumberFormat('uz-UZ').format(v) + ' UZS';
      document.getElementById('worker-earn-total').textContent = fmt(monthlyTotal);
      document.getElementById('worker-earn-month').textContent = fmt(workerShare);
      document.getElementById('worker-earn-count').textContent = monthlyConfirmed.length;

      // Render bookings table for today
      const tbody = document.getElementById('worker-bookings-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        const todayList = bookings.filter(b => b.date === todayStr);
        todayList.sort((a,b) => a.time.localeCompare(b.time));

        if (todayList.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Bugunga bronlar belgilanmagan.</td></tr>`;
        } else {
          todayList.forEach(b => {
            const tr = document.createElement('tr');
            let statusLabel = '';
            let actionButtons = '';

            if (b.status === 'pending') {
              statusLabel = `<span class="status-badge status-pending"><i class="fa-solid fa-hourglass"></i> Kutilmoqda</span>`;
              actionButtons = `
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-success btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="app.updateBookingStatusByWorker('${b.id}', 'confirmed')"><i class="fa-solid fa-check"></i> Tasdiqlash</button>
                  <button class="btn btn-danger btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="app.updateBookingStatusByWorker('${b.id}', 'cancelled')"><i class="fa-solid fa-xmark"></i> Bekor</button>
                </div>
              `;
            } else if (b.status === 'confirmed') {
              statusLabel = `<span class="status-badge status-confirmed"><i class="fa-solid fa-circle-check"></i> Tasdiqlangan</span>`;
              actionButtons = `<button class="btn btn-danger btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="app.updateBookingStatusByWorker('${b.id}', 'cancelled')"><i class="fa-solid fa-xmark"></i> Bekor qilish</button>`;
            } else {
              statusLabel = `<span class="status-badge status-cancelled"><i class="fa-solid fa-ban"></i> Bekor qilingan</span>`;
              actionButtons = `<span style="color: var(--text-muted); font-size: 0.8rem;">Amal bajarib bo'lmaydi</span>`;
            }

            tr.innerHTML = `
              <td><strong>${b.time}</strong></td>
              <td><strong>${b.clientName}</strong><br><span style="font-size: 0.8rem; color: var(--text-muted);">${b.clientPhone}</span></td>
              <td>${b.serviceName}</td>
              <td>${statusLabel}</td>
              <td>${actionButtons}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }

      // Render procedure notes table (confirmed bookings)
      const procTbody = document.getElementById('worker-procedure-tbody');
      if (procTbody) {
        procTbody.innerHTML = '';
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
        confirmedBookings.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

        if (confirmedBookings.length === 0) {
          procTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Tasdiqlangan bronlar mavjud emas.</td></tr>`;
        } else {
          confirmedBookings.forEach(b => {
            const tr = document.createElement('tr');
            const noteHtml = b.procedureNote
              ? `<span style="color: #34D399; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> ${b.procedureNote}</span>`
              : `<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Yozilmagan</span>`;

            tr.innerHTML = `
              <td><strong>${b.date}</strong> ${b.time}</td>
              <td>${b.clientName}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${b.clientPhone}</span></td>
              <td>${b.serviceName}</td>
              <td style="color: var(--accent-gold);">${new Intl.NumberFormat('uz-UZ').format(b.price)} so'm</td>
              <td>${noteHtml}</td>
              <td>
                <button class="btn btn-outline-gold btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="app.openProcedureNoteModal('${b.id}', '${(b.procedureNote || '').replace(/'/g, "&#39;")}')">
                  <i class="fa-solid fa-pen"></i> ${b.procedureNote ? 'Tahrirlash' : 'Yozish'}
                </button>
              </td>
            `;
            procTbody.appendChild(tr);
          });
        }
      }

      // Render schedule column (45-min slots)
      const scheduleList = document.getElementById('worker-schedule-hours');
      if (scheduleList) {
        scheduleList.innerHTML = '';
        const slots = [];
        let sm = 8 * 60;
        while (sm + 45 <= 18 * 60) {
          const h = Math.floor(sm / 60);
          const m = sm % 60;
          slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
          sm += 45;
        }
        const hours = slots;
        
        hours.forEach(hour => {
          const item = document.createElement('div');
          item.className = 'schedule-hour-item';
          
          const booked = todayBookings.find(b => b.time === hour);
          
          if (booked) {
            item.innerHTML = `
              <span class="hour-badge">${hour}</span>
              <div class="hour-booking-info">
                <span style="font-weight: 700; font-size: 0.9rem;">${booked.clientName}</span>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">${booked.serviceName}</p>
              </div>
              <span class="status-badge ${booked.status === 'confirmed' ? 'status-confirmed' : 'status-pending'} btn-sm" style="font-size: 0.7rem;">
                ${booked.status === 'confirmed' ? 'Tasdiqlangan' : 'Kutilmoqda'}
              </span>
            `;
          } else {
            item.innerHTML = `
              <span class="hour-badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border-glass);">${hour}</span>
              <div class="hour-booking-info free">Bo'sh vaqt</div>
              <button class="btn btn-outline-gold btn-sm" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;" onclick="app.quickAction('booking', '${this.bookingCategory}')">Band qilish</button>
            `;
          }
          scheduleList.appendChild(item);
        });
      }
    } catch (err) {
      this.showAlert("Jadvalni yuklashda xatolik yuz berdi.", "danger");
    }
  }

  async updateBookingStatusByWorker(id, newStatus) {
    try {
      await this.apiRequest(`/api/bookings/${id}/status`, 'PUT', { status: newStatus });
      this.showAlert(`Bron holati o'zgartirildi: ${newStatus === 'confirmed' ? 'Tasdiqlandi' : 'Bekor qilindi'}`, 'success');
      await this.renderWorkerDashboard();
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  // Open modal to write procedure note
  openProcedureNoteModal(bookingId, existingNote) {
    const decoded = existingNote.replace(/&#39;/g, "'");
    const modalBody = document.getElementById('modal-body-content');
    modalBody.innerHTML = `
      <h3 style="margin-bottom: 1rem; font-family: var(--font-title);"><i class="fa-solid fa-notes-medical"></i> Protsedura natijasini yozing</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Ushbu protsedura qanday o'tdi? Mijozning holati, qo'llangan usullar, keyingi tavsiyalar...</p>
      <form onsubmit="app.saveProcedureNote(event, '${bookingId}')">
        <div class="form-group">
          <label>Protsedura natijasi</label>
          <textarea id="procedure-note-text" class="form-control" rows="5" style="padding: 1rem;" placeholder="Masalan: Bola yaxshi kayfiyatda keldi, mushaklar bo'shashdi, parafin qo'llanildi..." required>${decoded}</textarea>
        </div>
        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 1rem;"><i class="fa-solid fa-floppy-disk"></i> Saqlash</button>
      </form>
    `;
    this.openModal();
  }

  async saveProcedureNote(e, bookingId) {
    e.preventDefault();
    const note = document.getElementById('procedure-note-text').value.trim();
    try {
      await this.apiRequest(`/api/bookings/${bookingId}/note`, 'PUT', { note });
      this.showAlert('Protsedura natijasi muvaffaqiyatli saqlandi!', 'success');
      this.closeModal();
      await this.renderWorkerDashboard();
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  // ---------------- ADMIN PANEL WORKFLOWS ----------------

  async switchAdminSection(section) {
    this.activeAdminSection = section;

    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
      const clickFunc = link.getAttribute('onclick');
      link.classList.toggle('active', clickFunc.includes(section));
    });

    const subViews = document.querySelectorAll('.admin-section-view');
    subViews.forEach(view => {
      view.classList.remove('active');
    });

    const activeSubView = document.getElementById(`admin-view-${section}`);
    if (activeSubView) {
      activeSubView.classList.add('active');
    }

    try {
      if (section === 'stats') {
        await this.renderAdminStats();
      } else if (section === 'bookings') {
        await this.renderAdminBookings();
      } else if (section === 'clients') {
        await this.renderAdminClients();
      } else if (section === 'workers') {
        await this.renderAdminWorkers();
      } else if (section === 'revenue') {
        await this.renderAdminRevenue();
      } else if (section === 'services') {
        await this.renderAdminServices();
      } else if (section === 'settings') {
        await this.loadSettingsForm();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async renderAdminStats() {
    try {
      const bookings = await this.apiRequest('/api/bookings');
      const clients = await this.apiRequest('/api/clients');
      const workers = await this.apiRequest('/api/workers');
      const todayStr = this.getTashkentDateString(0);

      const todayBookingsCount = bookings.filter(b => b.date === todayStr && b.status !== 'cancelled').length;
      
      let monthlyRevenue = 0;
      bookings.forEach(b => {
        if (b.status === 'confirmed') {
          const bookingMonth = new Date(b.date).getMonth();
          const currentMonth = new Date(todayStr).getMonth();
          if (bookingMonth === currentMonth) {
            monthlyRevenue += b.price;
          }
        }
      });

      document.getElementById('admin-kpi-bookings').textContent = todayBookingsCount;
      document.getElementById('admin-kpi-revenue').textContent = new Intl.NumberFormat('uz-UZ').format(monthlyRevenue) + ' UZS';
      document.getElementById('admin-kpi-clients').textContent = clients.length;
      document.getElementById('admin-kpi-workers').textContent = workers.length;

      const recentTbody = document.getElementById('admin-recent-bookings-tbody');
      if (recentTbody) {
        recentTbody.innerHTML = '';
        const sorted = [...bookings].sort((a,b) => b.id.localeCompare(a.id)).slice(0, 5);
        
        sorted.forEach(b => {
          const tr = document.createElement('tr');
          const formattedPrice = new Intl.NumberFormat('uz-UZ').format(b.price) + ' UZS';
          
          let badge = '';
          if (b.status === 'pending') badge = `<span class="status-badge status-pending">Kutilmoqda</span>`;
          else if (b.status === 'confirmed') badge = `<span class="status-badge status-confirmed">Tasdiqlangan</span>`;
          else badge = `<span class="status-badge status-cancelled">Bekor</span>`;

          tr.innerHTML = `
            <td>#${b.id.substring(b.id.length - 4)}</td>
            <td><strong>${b.clientName}</strong></td>
            <td>${b.serviceName}</td>
            <td>${b.date} / ${b.time}</td>
            <td>${b.workerName}</td>
            <td>${formattedPrice}</td>
            <td>${badge}</td>
          `;
          recentTbody.appendChild(tr);
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async renderAdminBookings() {
    const tbody = document.getElementById('admin-all-bookings-tbody');
    if (!tbody) return;

    try {
      const bookings = await this.apiRequest('/api/bookings');
      const filter = document.getElementById('admin-bookings-filter-status').value;

      tbody.innerHTML = '';

      const filtered = bookings.filter(b => {
        if (filter === 'all') return true;
        return b.status === filter;
      });

      filtered.sort((a,b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Siz filtrlangan jadvalda hech narsa topilmadi.</td></tr>`;
        return;
      }

      filtered.forEach(b => {
        const tr = document.createElement('tr');
        const formattedPrice = new Intl.NumberFormat('uz-UZ').format(b.price) + ' UZS';

        let statusBadge = '';
        let actions = '';

        if (b.status === 'pending') {
          statusBadge = `<span class="status-badge status-pending">Kutilmoqda</span>`;
          actions = `
            <button class="btn btn-success btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.adminUpdateBooking('${b.id}', 'confirmed')"><i class="fa-solid fa-check"></i> Tasdiqlash</button>
            <button class="btn btn-danger btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.adminUpdateBooking('${b.id}', 'cancelled')"><i class="fa-solid fa-xmark"></i> Bekor qilish</button>
          `;
        } else if (b.status === 'confirmed') {
          statusBadge = `<span class="status-badge status-confirmed">Tasdiqlangan</span>`;
          actions = `
            <button class="btn btn-danger btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.adminUpdateBooking('${b.id}', 'cancelled')"><i class="fa-solid fa-xmark"></i> Bekor qilish</button>
          `;
        } else {
          statusBadge = `<span class="status-badge status-cancelled">Bekor</span>`;
          actions = `<button class="btn btn-outline-gold btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.adminDeleteBooking('${b.id}')"><i class="fa-solid fa-trash"></i> O'chirish</button>`;
        }

        tr.innerHTML = `
          <td>#${b.id.substring(b.id.length - 4)}</td>
          <td><strong>${b.clientName}</strong></td>
          <td>${b.clientPhone}</td>
          <td>${b.serviceName}</td>
          <td>${b.date} / <strong>${b.time}</strong></td>
          <td>${b.workerName}</td>
          <td>${statusBadge}</td>
          <td><div style="display: flex; gap: 0.4rem;">${actions}</div></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async adminUpdateBooking(id, status) {
    try {
      await this.apiRequest(`/api/bookings/${id}/status`, 'PUT', { status });
      this.showAlert(`Bron holati administrator tomonidan o'zgartirildi.`, 'success');
      await this.renderAdminBookings();
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  async adminDeleteBooking(id) {
    if (confirm('Ushbu bron yozuvini tizimdan butunlay o\'chirishni xohlaysizmi?')) {
      try {
        await this.apiRequest(`/api/bookings/${id}`, 'DELETE');
        this.showAlert('Bron yozuvi butunlay o\'chirildi.', 'success');
        await this.renderAdminBookings();
      } catch (err) {
        this.showAlert(err.message, 'danger');
      }
    }
  }

  async renderAdminClients() {
    const tbody = document.getElementById('admin-clients-tbody');
    if (!tbody) return;

    try {
      const clients = await this.apiRequest('/api/clients');
      const bookings = await this.apiRequest('/api/bookings');
      const searchVal = document.getElementById('admin-client-search').value.toLowerCase();

      tbody.innerHTML = '';

      const filtered = clients.filter(c => c.name.toLowerCase().includes(searchVal) || c.phone.includes(searchVal));

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Mijozlar topilmadi.</td></tr>`;
        return;
      }

      filtered.forEach(c => {
        const clientBookings = bookings.filter(b => b.clientPhone.replace(/\s+/g,'') === c.phone.replace(/\s+/g,''));
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td><span class="status-badge status-confirmed">${clientBookings.length} ta yozilish</span></td>
          <td style="color: var(--text-muted);">Demo Tizim</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async renderAdminWorkers() {
    const tbody = document.getElementById('admin-workers-tbody');
    if (!tbody) return;

    try {
      const workers = await this.apiRequest('/api/workers');
      tbody.innerHTML = '';

      workers.forEach(w => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${w.name}</strong></td>
          <td><code>${w.username}</code></td>
          <td>Mutaxassis Xodim</td>
          <td>Massaj Xizmatlari</td>
          <td>
            <button class="btn btn-danger btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.adminDeleteWorker('${w.username}')"><i class="fa-solid fa-trash"></i> O'chirish</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  openAddWorkerModal() {
    const modalBody = document.getElementById('modal-body-content');
    modalBody.innerHTML = `
      <h3 style="margin-bottom: 1rem; font-family: var(--font-title);"><i class="fa-solid fa-user-plus"></i> Yangi xodim qo'shish</h3>
      <form onsubmit="app.handleCreateWorker(event)">
        <div class="form-group">
          <label>Xodim ismi</label>
          <input type="text" id="add-work-name" class="form-control" style="padding-left: 1rem;" required placeholder="Ismi">
        </div>
        <div class="form-group">
          <label>Foydalanuvchi nomi (Login)</label>
          <input type="text" id="add-work-login" class="form-control" style="padding-left: 1rem;" required placeholder="login">
        </div>
        <div class="form-group">
          <label>Parol</label>
          <input type="password" id="add-work-pass" class="form-control" style="padding-left: 1rem;" required placeholder="parol">
        </div>
        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 1rem;">Xodimni qo'shish</button>
      </form>
    `;
    this.openModal();
  }

  async handleCreateWorker(e) {
    e.preventDefault();
    const name = document.getElementById('add-work-name').value.trim();
    const username = document.getElementById('add-work-login').value.trim().toLowerCase();
    const password = document.getElementById('add-work-pass').value;

    try {
      await this.apiRequest('/api/workers', 'POST', { name, username, password });
      this.showAlert('Yangi xodim muvaffaqiyatli ro\'yxatga olindi.', 'success');
      this.closeModal();
      await this.renderAdminWorkers();
    } catch (err) {
      this.showAlert(err.message, 'warning');
    }
  }

  async adminDeleteWorker(username) {
    if (confirm('Ushbu xodimni butunlay tizimdan o\'chirib tashlashni xohlaysizmi?')) {
      try {
        await this.apiRequest(`/api/workers/${username}`, 'DELETE');
        this.showAlert('Xodim o\'chirildi.', 'success');
        await this.renderAdminWorkers();
      } catch (err) {
        this.showAlert(err.message, 'danger');
      }
    }
  }

  async renderAdminRevenue() {
    try {
      const bookings = await this.apiRequest('/api/bookings');
      const workers = await this.apiRequest('/api/workers');
      const todayStr = this.getTashkentDateString(0);
      const currentMonth = new Date(todayStr).getMonth();
      const currentYear = new Date(todayStr).getFullYear();

      let todayRev = 0;
      let weeklyRev = 0;
      let monthlyRev = 0;
      const revenueMap = {};
      const workerRevenueMap = {}; // per-worker monthly

      bookings.forEach(b => {
        if (b.status === 'confirmed') {
          const amt = b.price;
          const bDate = new Date(b.date);

          if (b.date === todayStr) todayRev += amt;

          const diffDays = (new Date(todayStr) - bDate) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays <= 7) weeklyRev += amt;

          if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
            monthlyRev += amt;

            // Per-worker accumulation
            if (!workerRevenueMap[b.workerName]) {
              workerRevenueMap[b.workerName] = { count: 0, total: 0 };
            }
            workerRevenueMap[b.workerName].count++;
            workerRevenueMap[b.workerName].total += amt;
          }

          if (!revenueMap[b.serviceName]) revenueMap[b.serviceName] = { count: 0, total: 0 };
          revenueMap[b.serviceName].count++;
          revenueMap[b.serviceName].total += amt;
        }
      });

      const fmt = v => new Intl.NumberFormat('uz-UZ').format(v) + ' UZS';

      document.getElementById('rev-today').textContent = fmt(todayRev);
      document.getElementById('rev-week').textContent = fmt(weeklyRev);
      document.getElementById('rev-month').textContent = fmt(monthlyRev);

      // 50/50 split totals
      const centerShare = Math.floor(monthlyRev / 2);
      const workersShare = monthlyRev - centerShare;
      document.getElementById('rev-center-share').textContent = fmt(centerShare);
      document.getElementById('rev-workers-share').textContent = fmt(workersShare);

      // Per-worker breakdown table
      const workerTbody = document.getElementById('admin-worker-revenue-tbody');
      if (workerTbody) {
        workerTbody.innerHTML = '';
        const workerNames = Object.keys(workerRevenueMap);

        // Also include workers who have no confirmed bookings this month
        workers.forEach(w => {
          if (!workerRevenueMap[w.name]) workerRevenueMap[w.name] = { count: 0, total: 0 };
        });

        Object.keys(workerRevenueMap).forEach(wName => {
          const data = workerRevenueMap[wName];
          const wShare = Math.floor(data.total / 2);
          const cShare = data.total - wShare;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${wName}</strong></td>
            <td><span class="status-badge status-confirmed">${data.count} ta</span></td>
            <td><strong>${fmt(data.total)}</strong></td>
            <td style="color: #3B82F6;">${fmt(cShare)}</td>
            <td style="color: var(--accent-gold); font-weight: 700;">${fmt(wShare)}</td>
          `;
          workerTbody.appendChild(tr);
        });

        if (Object.keys(workerRevenueMap).length === 0) {
          workerTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Bu oy tasdiqlangan bronlar yo'q.</td></tr>`;
        }
      }

      // Services breakdown
      const tbody = document.getElementById('admin-revenue-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        const keys = Object.keys(revenueMap);
        if (keys.length === 0) {
          tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Sotilgan xizmatlar hali mavjud emas.</td></tr>`;
        } else {
          keys.forEach(key => {
            const item = revenueMap[key];
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${key}</strong></td>
              <td><span class="status-badge status-confirmed">${item.count} ta sotilgan</span></td>
              <td><strong>${fmt(item.total)}</strong></td>
            `;
            tbody.appendChild(tr);
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async renderAdminServices() {
    const tbody = document.getElementById('admin-services-tbody');
    if (!tbody) return;

    try {
      const services = await this.apiRequest('/api/services');
      tbody.innerHTML = '';

      services.forEach(s => {
        const tr = document.createElement('tr');
        const formattedPrice = new Intl.NumberFormat('uz-UZ').format(s.price) + ' so\'m';
        const catLabel = s.category === 'children' ? '👶 Bolalar massaji' : '👩 Ayollar massaji';

        tr.innerHTML = `
          <td><strong>${s.name}</strong></td>
          <td>${catLabel}</td>
          <td><strong style="color: var(--accent-gold);">${formattedPrice}</strong></td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-outline-gold btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.openEditPriceModal('${s.id}')"><i class="fa-solid fa-edit"></i> O'zgartirish</button>
              <button class="btn btn-danger btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="app.adminDeleteService('${s.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  }

  async openEditPriceModal(id) {
    try {
      const services = await this.apiRequest('/api/services');
      const service = services.find(s => s.id === id);
      if (!service) return;

      const modalBody = document.getElementById('modal-body-content');
      modalBody.innerHTML = `
        <h3 style="margin-bottom: 1rem; font-family: var(--font-title);"><i class="fa-solid fa-tag"></i> Narxni o'zgartirish</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">${service.name}</p>
        <form onsubmit="app.handleUpdatePrice(event, '${id}')">
          <div class="form-group">
            <label>Yangi narx (so'mda)</label>
            <input type="number" id="edit-service-price" class="form-control" style="padding-left: 1rem;" required value="${service.price}">
          </div>
          <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 1rem;">Narxni saqlash</button>
        </form>
      `;
      this.openModal();
    } catch (err) {
      console.error(err);
    }
  }

  async handleUpdatePrice(e, id) {
    e.preventDefault();
    const newPrice = parseInt(document.getElementById('edit-service-price').value);

    try {
      await this.apiRequest(`/api/services/${id}`, 'PUT', { price: newPrice });
      this.showAlert('Xizmat narxi yangilandi.', 'success');
      this.closeModal();
      await this.renderAdminServices();
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  openAddServiceModal() {
    const modalBody = document.getElementById('modal-body-content');
    modalBody.innerHTML = `
      <h3 style="margin-bottom: 1rem; font-family: var(--font-title);"><i class="fa-solid fa-tags"></i> Yangi xizmat qo'shish</h3>
      <form onsubmit="app.handleCreateService(event)">
        <div class="form-group">
          <label>Xizmat nomi</label>
          <input type="text" id="add-ser-name" class="form-control" style="padding-left: 1rem;" required placeholder="Masalan: Bo'yin massaji">
        </div>
        <div class="form-group">
          <label>Xizmat toifasi</label>
          <select id="add-ser-cat" class="form-control" style="padding-left: 1rem;">
            <option value="children">👶 Bolalar massaji</option>
            <option value="women">👩 Ayollar massaji</option>
          </select>
        </div>
        <div class="form-group">
          <label>Narxi (so'mda)</label>
          <input type="number" id="add-ser-price" class="form-control" style="padding-left: 1rem;" required placeholder="Narxi">
        </div>
        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 1rem;">Xizmatni qo'shish</button>
      </form>
    `;
    this.openModal();
  }

  async handleCreateService(e) {
    e.preventDefault();
    const name = document.getElementById('add-ser-name').value.trim();
    const category = document.getElementById('add-ser-cat').value;
    const price = parseInt(document.getElementById('add-ser-price').value);

    try {
      await this.apiRequest('/api/services', 'POST', { name, category, price });
      this.showAlert('Yangi xizmat muvaffaqiyatli ro\'yxatga olindi.', 'success');
      this.closeModal();
      await this.renderAdminServices();
    } catch (err) {
      this.showAlert(err.message, 'warning');
    }
  }

  async adminDeleteService(id) {
    if (confirm('Ushbu xizmatni ro\'yxatdan butunlay o\'chirmoqchimisiz?')) {
      try {
        await this.apiRequest(`/api/services/${id}`, 'DELETE');
        this.showAlert('Xizmat o\'chirildi.', 'success');
        await this.renderAdminServices();
      } catch (err) {
        this.showAlert(err.message, 'danger');
      }
    }
  }

  async loadSettingsForm() {
    try {
      const info = await this.apiRequest('/api/info');
      if (!info) return;

      document.getElementById('set-center-name').value = info.name;
      document.getElementById('set-center-phone').value = info.phone;
      document.getElementById('set-center-address').value = info.address;
      document.getElementById('set-center-hours').value = info.hours;
    } catch (err) {
      console.error(err);
    }
  }

  async handleSettingsSave(e) {
    e.preventDefault();
    const name = document.getElementById('set-center-name').value.trim();
    const phone = document.getElementById('set-center-phone').value.trim();
    const address = document.getElementById('set-center-address').value.trim();
    const hours = document.getElementById('set-center-hours').value.trim();

    try {
      await this.apiRequest('/api/info', 'POST', { name, phone, address, hours });
      this.showAlert('Sozlamalar muvaffaqiyatli saqlandi va barcha sahifalarda yangilandi.', 'success');
      await this.renderCenterLayoutDetails();
    } catch (err) {
      this.showAlert(err.message, 'danger');
    }
  }

  // ---------------- UI UTILITIES (MODALS, ALERTS) ----------------

  openModal() {
    const modal = document.getElementById('app-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeModal() {
    const modal = document.getElementById('app-modal');
    if (modal) modal.style.display = 'none';
  }

  showAlert(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '85px';
    toast.style.right = '20px';
    toast.style.zIndex = '500';
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = '12px';
    toast.style.fontWeight = '700';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.8rem';
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.border = '1px solid rgba(255, 255, 255, 0.15)';

    let icon = '';
    if (type === 'success') {
      toast.style.background = 'rgba(22, 163, 74, 0.95)';
      toast.style.color = '#FFFFFF';
      icon = '<i class="fa-solid fa-circle-check" style="font-size: 1.25rem;"></i>';
    } else if (type === 'warning') {
      toast.style.background = 'rgba(245, 158, 11, 0.95)';
      toast.style.color = '#0A1628';
      icon = '<i class="fa-solid fa-triangle-exclamation" style="font-size: 1.25rem;"></i>';
    } else if (type === 'danger') {
      toast.style.background = 'rgba(220, 38, 38, 0.95)';
      toast.style.color = '#FFFFFF';
      icon = '<i class="fa-solid fa-circle-xmark" style="font-size: 1.25rem;"></i>';
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    }, 100);

    setTimeout(() => {
      toast.style.transform = 'translateY(-20px)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 3500);
  }
}

// Instantiate the application
const app = new BabyMassageApp();
window.app = app;
