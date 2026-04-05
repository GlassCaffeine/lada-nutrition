// Модуль отчётов о питании

const Reports = {
    
    // ===== ДОБАВИТЬ ОТЧЁТ =====
    async addReport() {
        const datetime = document.getElementById('report-datetime').value;
        const mealType = document.getElementById('report-meal-type').value;
        const description = document.getElementById('report-description').value;
        const comment = document.getElementById('report-comment').value;
        const photoInput = document.getElementById('report-photo');

        if (!datetime || !description) {
            alert('Заполните обязательные поля');
            return;
        }

        const [date, time] = datetime.split('T');

        let photoUrl = null;
        if (photoInput.files[0]) {
            photoUrl = await this.uploadPhoto(photoInput.files[0]);
        }

        const { error } = await supabase
            .from('reports')
            .insert({
                user_id: App.currentUser.id,
                report_date: date,
                report_time: time,
                meal_type: mealType,
                description: description,
                photo_url: photoUrl,
                comment: comment
            });

        if (error) {
            alert('Ошибка сохранения: ' + error.message);
            return;
        }

        // Закрываем модалку и обновляем список
        App.closeModal('report-modal');
        document.getElementById('report-form').reset();
        this.loadReports();
        App.loadDashboardSummary();
    },

    // ===== ЗАГРУЗИТЬ ОТЧЁТЫ =====
    async loadReports() {
        const listEl = document.getElementById('reports-list');
        
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('user_id', App.currentUser.id)
            .order('report_date', { ascending: false })
            .order('report_time', { ascending: false })
            .limit(50);

        if (error) {
            listEl.innerHTML = '<p class="empty-state">Ошибка загрузки</p>';
            return;
        }

        if (!data || data.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Нет отчётов. Нажмите + чтобы добавить.</p>';
            return;
        }

        listEl.innerHTML = data.map(report => this.renderReportCard(report)).join('');
    },

    // ===== РЕНДЕР КАРТОЧКИ ОТЧЁТА =====
    renderReportCard(report) {
        const mealName = App.getMealTypeName(report.meal_type);
        const time = App.formatTime(report.report_time);
        
        let photoHtml = '';
        if (report.photo_url) {
            photoHtml = `<img src="${report.photo_url}" alt="Фото еды" class="report-photo" loading="lazy">`;
        }

        let commentHtml = '';
        if (report.comment) {
            commentHtml = `<p class="report-comment">💬 ${report.comment}</p>`;
        }

        return `
            <div class="report-card">
                <div class="report-header">
                    <span class="report-meal-type">${mealName}</span>
                    <span class="report-time">${App.formatDate(report.report_date)} ${time}</span>
                </div>
                ${photoHtml}
                <p class="report-description">${report.description}</p>
                ${commentHtml}
            </div>
        `;
    },

    // ===== ЗАГРУЗИТЬ ФОТО =====
    async uploadPhoto(file) {
        const fileName = `${App.currentUser.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
            .from('report-photos')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Ошибка загрузки фото:', uploadError);
            return null;
        }

        // Получаем публичную ссылку
        const { data } = supabase.storage
            .from('report-photos')
            .getPublicUrl(fileName);

        return data.publicUrl;
    },

    // ===== УДАЛИТЬ ОТЧЁТ =====
    async deleteReport(reportId) {
        if (!confirm('Удалить этот отчёт?')) return;

        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', reportId)
            .eq('user_id', App.currentUser.id);

        if (error) {
            alert('Ошибка удаления: ' + error.message);
            return;
        }

        this.loadReports();
        App.loadDashboardSummary();
    }
};
