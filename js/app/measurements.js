// Модуль замеров тела

const Measurements = {
    weightChart: null,
    measurementsChart: null,

    // ===== ДОБАВИТЬ ЗАМЕР =====
    async addMeasurement() {
        const datetime = document.getElementById('measurement-datetime').value;
        const weight = document.getElementById('measurement-weight').value || null;
        const chest = document.getElementById('measurement-chest').value || null;
        const waist = document.getElementById('measurement-waist').value || null;
        const hips = document.getElementById('measurement-hips').value || null;
        const notes = document.getElementById('measurement-notes').value || null;

        if (!datetime) {
            alert('Укажите дату и время');
            return;
        }

        const [date, time] = datetime.split('T');

        const { error } = await supabase
            .from('measurements')
            .insert({
                user_id: App.currentUser.id,
                measurement_date: date,
                measurement_time: time,
                weight: weight,
                chest: chest,
                waist: waist,
                hips: hips,
                notes: notes
            });

        if (error) {
            alert('Ошибка сохранения: ' + error.message);
            return;
        }

        App.closeModal('measurement-modal');
        document.getElementById('measurement-form').reset();
        this.loadMeasurements();
    },

    // ===== ЗАГРУЗИТЬ ЗАМЕРЫ =====
    async loadMeasurements() {
        const listEl = document.getElementById('measurements-list');
        
        const { data, error } = await supabase
            .from('measurements')
            .select('*')
            .eq('user_id', App.currentUser.id)
            .order('measurement_date', { ascending: false })
            .limit(50);

        if (error) {
            listEl.innerHTML = '<p class="empty-state">Ошибка загрузки</p>';
            return;
        }

        // Строим графики
        this.renderCharts(data);

        // Рендерим список
        if (!data || data.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Нет замеров. Нажмите + чтобы добавить.</p>';
            return;
        }

        listEl.innerHTML = data.map(m => this.renderMeasurementCard(m)).join('');
    },

    // ===== РЕНДЕР КАРТОЧКИ ЗАМЕРА =====
    renderMeasurementCard(m) {
        let details = [];
        if (m.weight) details.push(`Вес: ${m.weight} кг`);
        if (m.chest) details.push(`Грудь: ${m.chest} см`);
        if (m.waist) details.push(`Талия: ${m.waist} см`);
        if (m.hips) details.push(`Бёдра: ${m.hips} см`);

        let notesHtml = m.notes ? `<p class="report-comment">📝 ${m.notes}</p>` : '';

        return `
            <div class="report-card">
                <div class="report-header">
                    <span class="report-meal-type">📏 Замер</span>
                    <span class="report-time">${App.formatDate(m.measurement_date)} ${App.formatTime(m.measurement_time)}</span>
                </div>
                <p class="report-description">${details.join(' | ')}</p>
                ${notesHtml}
            </div>
        `;
    },

    // ===== РЕНДЕР ГРАФИКОВ =====
    renderCharts(data) {
        if (!data || data.length === 0) return;

        // Сортируем по дате (возрастание)
        const sorted = [...data].sort((a, b) => new Date(a.measurement_date) - new Date(b.measurement_date));

        // График веса
        const weightData = sorted.filter(m => m.weight);
        if (weightData.length > 0 && this.weightChart) {
            this.weightChart.destroy();
        }

        if (weightData.length > 0) {
            const ctx = document.getElementById('weight-chart');
            if (ctx) {
                this.weightChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: weightData.map(m => App.formatDate(m.measurement_date)),
                        datasets: [{
                            label: 'Вес (кг)',
                            data: weightData.map(m => parseFloat(m.weight)),
                            borderColor: '#4CAF50',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                title: { display: true, text: 'кг' }
                            }
                        }
                    }
                });
            }
        }

        // График объёмов
        const volumesData = sorted.filter(m => m.chest || m.waist || m.hips);
        if (volumesData.length > 0 && this.measurementsChart) {
            this.measurementsChart.destroy();
        }

        if (volumesData.length > 0) {
            const ctx = document.getElementById('measurements-chart');
            if (ctx) {
                const datasets = [];
                
                if (volumesData.some(m => m.chest)) {
                    datasets.push({
                        label: 'Грудь',
                        data: volumesData.map(m => m.chest ? parseFloat(m.chest) : null),
                        borderColor: '#2196F3',
                        tension: 0.3
                    });
                }
                if (volumesData.some(m => m.waist)) {
                    datasets.push({
                        label: 'Талия',
                        data: volumesData.map(m => m.waist ? parseFloat(m.waist) : null),
                        borderColor: '#FF9800',
                        tension: 0.3
                    });
                }
                if (volumesData.some(m => m.hips)) {
                    datasets.push({
                        label: 'Бёдра',
                        data: volumesData.map(m => m.hips ? parseFloat(m.hips) : null),
                        borderColor: '#9C27B0',
                        tension: 0.3
                    });
                }

                this.measurementsChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: volumesData.map(m => App.formatDate(m.measurement_date)),
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: false,
                                title: { display: true, text: 'см' }
                            }
                        }
                    }
                });
            }
        }
    },

    // ===== УДАЛИТЬ ЗАМЕР =====
    async deleteMeasurement(id) {
        if (!confirm('Удалить этот замер?')) return;

        const { error } = await supabase
            .from('measurements')
            .delete()
            .eq('id', id)
            .eq('user_id', App.currentUser.id);

        if (error) {
            alert('Ошибка удаления: ' + error.message);
            return;
        }

        this.loadMeasurements();
    }
};
