// Модуль чата с куратором

const Chat = {
    subscription: null,

    // ===== ЗАГРУЗИТЬ СООБЩЕНИЯ =====
    async loadMessages() {
        const container = document.getElementById('chat-messages');
        
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('user_id', App.currentUser.id)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) {
            container.innerHTML = '<p class="empty-state">Ошибка загрузки</p>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="empty-state">Начните диалог с куратором</p>';
        } else {
            container.innerHTML = data.map(msg => this.renderMessage(msg)).join('');
            container.scrollTop = container.scrollHeight;
        }

        // Подписываемся на новые сообщения
        this.subscribeToMessages();
    },

    // ===== РЕНДЕР СООБЩЕНИЯ =====
    renderMessage(msg) {
        const isSent = msg.sender_role === 'client';
        const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="chat-message ${isSent ? 'sent' : 'received'}">
                <div class="chat-bubble">${msg.content}</div>
                <span class="chat-time">${time}</span>
            </div>
        `;
    },

    // ===== ОТПРАВИТЬ СООБЩЕНИЕ =====
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        
        if (!content) return;

        const { error } = await supabase
            .from('messages')
            .insert({
                user_id: App.currentUser.id,
                content: content,
                sender_role: 'client'
            });

        if (error) {
            alert('Ошибка отправки: ' + error.message);
            return;
        }

        input.value = '';
        this.loadMessages();
    },

    // ===== ПОДПИСКА НА РЕАЛЬНОЕ ВРЕМЯ =====
    subscribeToMessages() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        this.subscription = supabase
            .channel('messages-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `user_id=eq.${App.currentUser.id}`
                },
                (payload) => {
                    // Добавляем новое сообщение
                    const container = document.getElementById('chat-messages');
                    const msgHtml = this.renderMessage(payload.new);
                    container.insertAdjacentHTML('beforeend', msgHtml);
                    container.scrollTop = container.scrollHeight;
                }
            )
            .subscribe();
    }
};

// ===== МОДУЛЬ РЕКОМЕНДАЦИЙ =====

const Recommendations = {
    subscription: null,

    async loadRecommendations() {
        const listEl = document.getElementById('recommendations-list');
        
        const { data, error } = await supabase
            .from('recommendations')
            .select('*')
            .eq('user_id', App.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            listEl.innerHTML = '<p class="empty-state">Ошибка загрузки</p>';
            return;
        }

        if (!data || data.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Пока нет рекомендаций</p>';
            return;
        }

        listEl.innerHTML = data.map(rec => this.renderRecommendation(rec)).join('');

        // Подписываемся на новые рекомендации
        this.subscribeToRecommendations();
    },

    renderRecommendation(rec) {
        const unreadClass = rec.is_read ? '' : 'unread';
        const title = rec.title ? `<div class="recommendation-title">${rec.title}</div>` : '';
        const date = new Date(rec.created_at).toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        return `
            <div class="recommendation-card ${unreadClass}">
                ${title}
                <div class="recommendation-content">${rec.content}</div>
                <div class="recommendation-date">📅 ${date}</div>
            </div>
        `;
    },

    subscribeToRecommendations() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        this.subscription = supabase
            .channel('recommendations-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'recommendations',
                    filter: `user_id=eq.${App.currentUser.id}`
                },
                () => {
                    this.loadRecommendations();
                }
            )
            .subscribe();
    }
};
