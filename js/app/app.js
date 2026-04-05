// Основной модуль PWA-приложения

var App = {
    currentUser: null,
    currentTab: 'home',

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    init: function() {
        console.log('Инициализация приложения...');
        
        // Регистрируем Service Worker
        this.registerServiceWorker();
        
        // Настраиваем слушатели
        this.setupEventListeners();
        
        // Проверяем сессию
        this.checkSession();

        // Слушаем изменения авторизации
        if (supabase) {
            supabase.auth.onAuthStateChange(function(event, session) {
                if (session) {
                    App.currentUser = session.user;
                    App.showApp();
                } else {
                    App.currentUser = null;
                    App.showAuth();
                }
            });
        }
    },

    // ===== SERVICE WORKER =====
    registerServiceWorker: function() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/lada-nutrition/pwa/sw.js')
                .then(function(reg) { console.log('SW зарегистрирован'); })
                .catch(function(err) { console.log('SW ошибка:', err); });
        }
    },

    // ===== ПРОВЕРКА СЕССИИ =====
    checkSession: function() {
        if (!supabase) {
            console.error('Supabase не загружен');
            return;
        }
        supabase.auth.getSession().then(function(result) {
            if (result.data && result.data.session) {
                App.currentUser = result.data.session.user;
                App.showApp();
            } else {
                App.showAuth();
            }
        });
    },

    // ===== ПОКАЗАТЬ ЭКРАН АВТОРИЗАЦИИ =====
    showAuth: function() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    },

    // ===== ПОКАЗАТЬ ПРИЛОЖЕНИЕ =====
    showApp: function() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        
        // Загружаем профиль
        this.loadProfile();
    },

    // ===== ЗАГРУЗКА ПРОФИЛЯ =====
    loadProfile: function() {
        if (!Auth || !supabase) return;
        
        Auth.getProfile().then(function(result) {
            if (result.success) {
                var profile = result.profile;
                document.getElementById('user-greeting').textContent = profile.full_name.split(' ')[0];
                document.getElementById('profile-name').textContent = profile.full_name;
                document.getElementById('profile-email').textContent = profile.email || '';
                document.getElementById('profile-phone').textContent = profile.phone || 'Не указан';
                
                // Статус подписки
                var subBadge = document.getElementById('subscription-status');
                if (profile.subscription_status === 'paid') {
                    subBadge.textContent = 'Подписка активна';
                    subBadge.classList.add('paid');
                } else if (profile.subscription_status === 'trial') {
                    subBadge.textContent = 'Пробный период';
                } else {
                    subBadge.textContent = 'Бесплатный тариф';
                }
            }
        });

        // Загружаем сводку
        this.loadDashboardSummary();
    },

    // ===== СЛУШАТЕЛИ СОБЫТИЙ =====
    setupEventListeners: function() {
        // Форма входа
        var loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                App.handleLogin();
            });
        }

        // Форма регистрации
        var registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                App.handleRegister();
            });
        }

        // Форма восстановления пароля
        var resetForm = document.getElementById('reset-form');
        if (resetForm) {
            resetForm.addEventListener('submit', function(e) {
                e.preventDefault();
                App.handleResetPassword();
            });
        }

        // Форма отчёта
        var reportForm = document.getElementById('report-form');
        if (reportForm) {
            reportForm.addEventListener('submit', function(e) {
                e.preventDefault();
                Reports.addReport();
            });
        }

        // Форма замера
        var measurementForm = document.getElementById('measurement-form');
        if (measurementForm) {
            measurementForm.addEventListener('submit', function(e) {
                e.preventDefault();
                Measurements.addMeasurement();
            });
        }

        // Кастомная вода
        var waterForm = document.getElementById('water-custom-form');
        if (waterForm) {
            waterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                var amount = parseInt(document.getElementById('water-custom-amount').value);
                if (amount > 0) {
                    Water.addWater(amount);
                    closeModal('water-custom-modal');
                    document.getElementById('water-custom-amount').value = '';
                }
            });
        }

        // Enter в чате
        var chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && Chat) Chat.sendMessage();
            });
        }
    },

    // ===== ВХОД =====
    handleLogin: function() {
        var email = document.getElementById('login-email').value;
        var password = document.getElementById('login-password').value;
        
        hideMessages();
        
        Auth.login(email, password).then(function(result) {
            if (result.success) {
                App.currentUser = result.user;
                App.showApp();
            } else {
                showAuthError(result.error === 'Invalid login credentials' 
                    ? 'Неверный email или пароль' 
                    : result.error);
            }
        });
    },

    // ===== РЕГИСТРАЦИЯ =====
    handleRegister: function() {
        var name = document.getElementById('reg-name').value;
        var email = document.getElementById('reg-email').value;
        var phone = document.getElementById('reg-phone').value;
        var password = document.getElementById('reg-password').value;
        var consentPersonal = document.getElementById('consent-pd').checked;
        var consentProcessing = document.getElementById('consent-terms').checked;
        
        hideMessages();

        // Валидация
        if (password.length < 8) {
            showAuthError('Пароль должен быть минимум 8 символов');
            return;
        }
        if (!consentPersonal || !consentProcessing) {
            showAuthError('Необходимо дать согласие на обработку данных');
            return;
        }

        Auth.register(email, password, name, phone, consentPersonal, consentProcessing).then(function(result) {
            if (result.success) {
                showAuthSuccess('Регистрация успешна! Проверьте email для подтверждения.');
                setTimeout(function() {
                    switchAuthTab('login');
                }, 2000);
            } else {
                showAuthError(result.error);
            }
        });
    },

    // ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====
    handleResetPassword: function() {
        var email = document.getElementById('reset-email').value;
        
        hideMessages();
        
        Auth.resetPassword(email).then(function(result) {
            if (result.success) {
                showAuthSuccess('Ссылка отправлена на email!');
            } else {
                showAuthError(result.error);
            }
        });
    },

    // ===== ВЫХОД =====
    handleLogout: function() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            Auth.logout().then(function() {
                App.currentUser = null;
                App.showAuth();
            });
        }
    },

    // ===== ЗАГРУЗКА СВОДКИ =====
    loadDashboardSummary: function() {
        if (!supabase || !App.currentUser) return;
        
        var today = new Date().toISOString().split('T')[0];
        var userId = App.currentUser.id;

        // Вода за сегодня
        supabase
            .from('water_intake')
            .select('amount_ml')
            .eq('user_id', userId)
            .eq('intake_date', today)
            .then(function(result) {
                var total = 0;
                if (result.data) {
                    result.data.forEach(function(w) { total += w.amount_ml; });
                }
                document.getElementById('today-water').textContent = total;
            });

        // Отчёты за сегодня
        supabase
            .from('reports')
            .select('id')
            .eq('user_id', userId)
            .eq('report_date', today)
            .then(function(result) {
                document.getElementById('today-reports').textContent = result.data ? result.data.length : 0;
            });
    }
};

// Запуск приложения
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
