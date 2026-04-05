// Модуль авторизации Supabase

const Auth = {
    
    // ===== РЕГИСТРАЦИЯ =====
    async register(email, password, fullName, phone, consentPersonal, consentProcessing) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        consent_personal_data: consentPersonal,
                        consent_processing: consentProcessing
                    }
                }
            });

            if (error) throw error;

            // Профиль создастся автоматически через триггер
            console.log('Регистрация успешна:', data);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ВХОД =====
    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            console.log('Вход успешен:', data);
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('Ошибка входа:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ВЫХОД =====
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Ошибка выхода:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ =====
    async getCurrentUser() {
        const { data } = await supabase.auth.getUser();
        return data.user;
    },

    // ===== СЕССИЯ =====
    async getSession() {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    // ===== СЛУШАТЕЛЬ ИЗМЕНЕНИЙ АВТОРИЗАЦИИ =====
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Ошибка восстановления пароля:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ОБНОВЛЕНИЕ ПАРОЛЯ =====
    async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Ошибка обновления пароля:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ПОЛУЧИТЬ ПРОФИЛЬ =====
    async getProfile(userId = null) {
        try {
            const id = userId || (await this.getCurrentUser())?.id;
            if (!id) throw new Error('Пользователь не авторизован');

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { success: true, profile: data };
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ОБНОВИТЬ ПРОФИЛЬ =====
    async updateProfile(updates) {
        try {
            const user = await this.getCurrentUser();
            if (!user) throw new Error('Пользователь не авторизован');

            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, profile: data };
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ПРОВЕРИТЬ РОЛЬ =====
    async isCurator() {
        const result = await this.getProfile();
        if (!result.success) return false;
        return result.profile.role === 'curator' || result.profile.role === 'admin';
    },

    // ===== ПРОВЕРИТЬ ПОДПИСКУ =====
    async hasActiveSubscription() {
        const result = await this.getProfile();
        if (!result.success) return false;
        
        const profile = result.profile;
        if (profile.subscription_status === 'free') return false;
        
        // Проверяем дату окончания подписки
        if (profile.subscription_end) {
            const endDate = new Date(profile.subscription_end);
            if (endDate < new Date()) return false;
        }
        
        return true;
    }
};
