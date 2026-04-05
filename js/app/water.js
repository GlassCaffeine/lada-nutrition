// Модуль трекера воды

const Water = {
    dailyGoal: 2000, // мл
    chart: null,

    // ===== ДОБАВИТЬ ВОДУ =====
    async addWater(amount) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().slice(0, 8);

        const { error } = await supabase
            .from('water_intake')
            .insert({
                user_id: App.currentUser.id,
                intake_date: date,
                intake_time: time,
                amount_ml: amount
            });

        if (error) {
            alert('Ошибка сохранения: ' + error.message);
            return;
        }

        this.loadWater();
        App.loadDashboardSummary();
    },

    // ===== ЗАГРУЗИТЬ ДАННЫЕ ВОДЫ =====
    async loadWater() {
        const today = new Date().toISOString().split('T')[0];
        
        // Вода за сегодня
        const { data: todayData, error } = await supabase
            .from('water_intake')
            .select('amount_ml')
            .eq('user_id', App.currentUser.id)
            .eq('intake_date', today);

        if (error) {
            console.error('Ошибка загрузки воды:', error);
            return;
        }

        const totalToday = todayData?.reduce((sum, w) => sum + w.amount_ml, 0) || 0;
        
        // Обновляем отображение
        document.getElementById('water-amount').textContent = totalToday;

        // Строим график за последние 7 дней
        await this.renderChart();
    },

    // ===== ГРАФИК ВОДЫ =====
    async renderChart() {
        // Получаем данные за последние 7 дней
        const dates = [];
        const values = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dates.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));

            const { data } = await supabase
                .from('water_intake')
                .select('amount_ml')
                .eq('user_id', App.currentUser.id)
                .eq('intake_date', dateStr);

            const total = data?.reduce((sum, w) => sum + w.amount_ml, 0) || 0;
            values.push(total);
        }

        // Уничтожаем старый график
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = document.getElementById('water-chart');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Потреблено (мл)',
                        data: values,
                        backgroundColor: 'rgba(33, 150, 243, 0.6)',
                        borderColor: '#2196F3',
                        borderWidth: 1,
                        borderRadius: 5
                    },
                    {
                        label: 'Цель (мл)',
                        data: Array(7).fill(this.dailyGoal),
                        type: 'line',
                        borderColor: '#4CAF50',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'мл' }
                    }
                }
            }
        });
    }
};
