// Модуль авторизации Supabase

var Auth = {
    
    // ===== РЕГИСТРАЦИЯ =====
    register: function(email, password, fullName, phone, consentPersonal, consentProcessing) {
        return supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    consent_personal_data: consentPersonal,
                    consent_processing: consentProcessing
                }
            }
        }).then(function(result) {
            if (result.error) throw result.error;
            console.log('Регистрация успешна:', result.data);
            return { success: true, user: result.data.user };
        }).catch(function(error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: error.message };
        });
    },

    // ===== ВХОД =====
    login: function(email, password) {
        return supabase.auth.signInWithPassword({
            email: email,
            password: password
        }).then(function(result) {
            if (result.error) throw result.error;
            console.log('Вход успешен:', result.data);
            return { success: true, user: result.data.user, session: result.data.session };
        }).catch(function(error) {
            console.error('Ошибка входа:', error);
            return { success: false, error: error.message };
        });
    },

    // ===== ВЫХОД =====
    logout: function() {
        return supabase.auth.signOut().then(function(result) {
            if (result.error) throw result.error;
            return { success: true };
        }).catch(function(error) {
            console.error('Ошибка выхода:', error);
            return { success: false, error: error.message };
        });
    },

    // ===== ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ =====
    getCurrentUser: function() {
        return supabase.auth.getUser().then(function(result) {
            return result.data ? result.data.user : null;
        });
    },

    // ===== СЕССИЯ =====
    getSession: function() {
        return supabase.auth.getSession().then(function(result) {
            return result.data ? result.data.session : null;
        });
    },

    // ===== СЛУШАТЕЛЬ ИЗМЕНЕНИЙ АВТОРИЗАЦИИ =====
    onAuthStateChange: function(callback) {
        return supabase.auth.onAuthStateChange(function(event, session) {
            callback(event, session);
        });
    },

    // ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====
    resetPassword: function(email) {
        return supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/lada-nutrition/reset-password.html'
        }).then(function(result) {
            if (result.error) throw result.error;
            return { success: true };
        }).catch(function(error) {
            console.error('Ошибка восстановления пароля:', error);
            return { success: false, error: error.message };
        });
    },

    // ===== ОБНОВЛЕНИЕ ПАРОЛЯ =====
    updatePassword: function(newPassword) {
        return supabase.auth.updateUser({
            password: newPassword
        }).then(function(result) {
            if (result.error) throw result.error;
            return { success: true };
        }).catch(function(error) {
            console.error('Ошибка обновления пароля:', error);
            return { success: false, error: error.message };
        });
    },

    // ===== ПОЛУЧИТЬ ПРОФИЛЬ =====
    getProfile: function(userId) {
        var self = this;
        return this.getCurrentUser().then(function(user) {
            var id = userId || (user ? user.id : null);
            if (!id) {
                return { success: false, error: 'Пользователь не авторизован' };
            }
            return supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()
                .then(function(result) {
                    if (result.error) throw result.error;
                    return { success: true, profile: result.data };
                })
                .catch(function(error) {
                    console.error('Ошибка получения профиля:', error);
                    return { success: false, error: error.message };
                });
        });
    },

    // ===== ОБНОВИТЬ ПРОФИЛЬ =====
    updateProfile: function(updates) {
        var self = this;
        return this.getCurrentUser().then(function(user) {
            if (!user) {
                return { success: false, error: 'Пользователь не авторизован' };
            }
            return supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single()
                .then(function(result) {
                    if (result.error) throw result.error;
                    return { success: true, profile: result.data };
                })
                .catch(function(error) {
                    console.error('Ошибка обновления профиля:', error);
                    return { success: false, error: error.message };
                });
        });
    },

    // ===== ПРОВЕРИТЬ РОЛЬ =====
    isCurator: function() {
        return this.getProfile().then(function(result) {
            if (!result.success) return false;
            return result.profile.role === 'curator' || result.profile.role === 'admin';
        });
    },

    // ===== ПРОВЕРИТЬ ПОДПИСКУ =====
    hasActiveSubscription: function() {
        return this.getProfile().then(function(result) {
            if (!result.success) return false;
            
            var profile = result.profile;
            if (profile.subscription_status === 'free') return false;
            
            if (profile.subscription_end) {
                var endDate = new Date(profile.subscription_end);
                if (endDate < new Date()) return false;
            }
            
            return true;
        });
    }
};
