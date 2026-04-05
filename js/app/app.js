// Основной модуль PWA-приложения

const App = {
    currentUser: null,
    currentTab: 'home',

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    async init() {
        console.log('Инициализация приложения...');
        
        // Регистрируем Service Worker
        this.registerServiceWorker();
        
        // Проверяем сессию
        const session = await Auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.showApp();
        } else {
            this.showAuth();
        }

        // Настраиваем слушатели
        this.setupEventListeners();
        
        // Слушаем изменения авторизации
        Auth.onAuthStateChange((event, session) => {
            if (session) {
                this.currentUser = session.user;
                this.showApp();
            } else {
                this.currentUser = null;
                this.showAuth();
            }
        });
    },

    // ===== SERVICE WORKER =====
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/pwa/sw.js')
                .then(reg => console.log('SW зарегистрирован'))
                .catch(err => console.log('SW ошибка:', err));
        }
    },

    // ===== ПОКАЗАТЬ ЭКРАН АВТОРИЗАЦИИ =====
    showAuth() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    },

    // ===== ПОКАЗАТЬ ПРИЛОЖЕНИЕ =====
    async showApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        
        // Загружаем профиль
        const result = await Auth.getProfile();
        if (result.success) {
            const profile = result.profile;
            document.getElementById('user-name').textContent = profile.full_name.split(' ')[0];
            document.getElementById('profile-name').textContent = profile.full_name;
            document.getElementById('profile-email').textContent = profile.email || '';
            document.getElementById('profile-phone').textContent = profile.phone || 'Не указан';
            
            // Статус подписки
            const subBadge = document.getElementById('subscription-status');
            if (profile.subscription_status === 'paid') {
                subBadge.textContent = 'Подписка активна';
                subBadge.classList.add('paid');
            } else if (profile.subscription_status === 'trial') {
                subBadge.textContent = 'Пробный период';
            } else {
                subBadge.textContent = 'Бесплатный тариф';
            }
        }

        // Загружаем сводку
        this.loadDashboardSummary();
    },

    // ===== СЛУШАТЕЛИ СОБЫТИЙ =====
    setupEventListeners() {
        // Табы авторизации
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAuthTab(tabName);
            });
        });

        // Форма входа
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Форма регистрации
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // Форма восстановления пароля
        document.getElementById('reset-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleResetPassword();
        });

        // Ссылка "Забыли пароль"
        document.getElementById('forgot-password-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthTab('reset');
        });

        // Ссылка "Вернуться к входу"
        document.getElementById('back-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthTab('login');
        });

        // Навигация приложения
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Карточки на главной
        document.querySelectorAll('.dash-card').forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                this.switchTab(action);
            });
        });

        // Кнопки "Назад"
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.back);
            });
        });

        // Кнопки выхода
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        document.getElementById('logout-btn-profile').addEventListener('click', () => this.handleLogout());

        // Модальные окна - открытие
        document.getElementById('add-report-btn')?.addEventListener('click', () => {
            this.openModal('report-modal');
            this.setNowDateTime('report-datetime');
        });

        document.getElementById('add-measurement-btn')?.addEventListener('click', () => {
            this.openModal('measurement-modal');
            this.setNowDateTime('measurement-datetime');
        });

        // Модальные окна - закрытие
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').style.display = 'none';
            });
        });

        // Закрытие по клику на фон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Форма отчёта
        document.getElementById('report-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await Reports.addReport();
        });

        // Форма замера
        document.getElementById('measurement-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await Measurements.addMeasurement();
        });

        // Кнопки воды
        document.querySelectorAll('.btn-water').forEach(btn => {
            btn.addEventListener('click', async () => {
                const amount = btn.dataset.amount;
                if (amount === 'custom') {
                    this.openModal('water-custom-modal');
                } else {
                    await Water.addWater(parseInt(amount));
                }
            });
        });

        // Кастомное количество воды
        document.getElementById('water-custom-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseInt(document.getElementById('water-custom-amount').value);
            if (amount > 0) {
                await Water.addWater(amount);
                this.closeModal('water-custom-modal');
                document.getElementById('water-custom-amount').value = '';
            }
        });

        // Чат
        document.getElementById('chat-send-btn').addEventListener('click', () => Chat.sendMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') Chat.sendMessage();
        });
    },

    // ===== ПЕРЕКЛЮЧЕНИЕ ТАБОВ АВТОРИЗАЦИИ =====
    switchAuthTab(tabName) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        document.querySelector(`.auth-tab[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`${tabName}-form`)?.classList.add('active');
    },

    // ===== ПЕРЕКЛЮЧЕНИЕ ТАБОВ ПРИЛОЖЕНИЯ =====
    switchTab(tabName) {
        document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        document.getElementById(`tab-${tabName}`)?.classList.add('active');
        document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.classList.add('active');
        
        this.currentTab = tabName;

        // Загружаем данные для таба
        switch(tabName) {
            case 'reports':
                Reports.loadReports();
                break;
            case 'measurements':
                Measurements.loadMeasurements();
                break;
            case 'water':
                Water.loadWater();
                break;
            case 'chat':
                Chat.loadMessages();
                break;
            case 'recommendations':
                Recommendations.loadRecommendations();
                break;
        }
    },

    // ===== ВХОД =====
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        
        errorEl.textContent = '';
        const result = await Auth.login(email, password);
        
        if (result.success) {
            this.currentUser = result.user;
            this.showApp();
        } else {
            errorEl.textContent = result.error === 'Invalid login credentials' 
                ? 'Неверный email или пароль' 
                : result.error;
        }
    },

    // ===== РЕГИСТРАЦИЯ =====
    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const consentPersonal = document.getElementById('consent-personal').checked;
        const consentProcessing = document.getElementById('consent-processing').checked;
        const errorEl = document.getElementById('register-error');
        
        errorEl.textContent = '';

        // Валидация
        if (password !== passwordConfirm) {
            errorEl.textContent = 'Пароли не совпадают';
            return;
        }
        if (!consentPersonal || !consentProcessing) {
            errorEl.textContent = 'Необходимо дать согласие на обработку данных';
            return;
        }

        const result = await Auth.register(email, password, name, phone, consentPersonal, consentProcessing);
        
        if (result.success) {
            alert('Регистрация успешна! Проверьте email для подтверждения.');
            this.switchAuthTab('login');
        } else {
            errorEl.textContent = result.error;
        }
    },

    // ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====
    async handleResetPassword() {
        const email = document.getElementById('reset-email').value;
        const errorEl = document.getElementById('reset-error');
        const messageEl = document.getElementById('reset-message');
        
        errorEl.textContent = '';
        messageEl.textContent = '';
        
        const result = await Auth.resetPassword(email);
        
        if (result.success) {
            messageEl.textContent = 'Ссылка отправлена на email!';
        } else {
            errorEl.textContent = result.error;
        }
    },

    // ===== ВЫХОД =====
    async handleLogout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            await Auth.logout();
        }
    },

    // ===== ЗАГРУЗКА СВОДКИ =====
    async loadDashboardSummary() {
        // Вода за сегодня
        const today = new Date().toISOString().split('T')[0];
        const { data: waterData } = await supabase
            .from('water_intake')
            .select('amount_ml')
            .eq('user_id', this.currentUser.id)
            .eq('intake_date', today);
        
        const totalWater = waterData?.reduce((sum, w) => sum + w.amount_ml, 0) || 0;
        document.getElementById('today-water').textContent = totalWater;

        // Отчёты за сегодня
        const { data: reportsData } = await supabase
            .from('reports')
            .select('id')
            .eq('user_id', this.currentUser.id)
            .eq('report_date', today);
        
        document.getElementById('today-reports').textContent = reportsData?.length || 0;
    },

    // ===== УТИЛИТЫ =====
    setNowDateTime(inputId) {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const local = new Date(now.getTime() - offset * 60000);
        document.getElementById(inputId).value = local.toISOString().slice(0, 16);
    },

    openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    },

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    },

    formatTime(timeStr) {
        return timeStr ? timeStr.slice(0, 5) : '';
    },

    getMealTypeName(type) {
        const names = {
            'breakfast': 'Завтрак',
            'lunch': 'Обед',
            'snack': 'Полдник',
            'dinner': 'Ужин',
            'unplanned': 'Внеплановое'
        };
        return names[type] || type;
    }
};

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => App.init());
