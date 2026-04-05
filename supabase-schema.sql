-- ============================================
-- Supabase Schema для проекта lada-nutrition
-- Нутрициолог Атакова Лада
-- Дата: 05.04.2026
-- ============================================

-- Включаем расширение UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'curator', 'admin')),
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'paid', 'expired')),
    subscription_plan TEXT,
    subscription_start TIMESTAMPTZ,
    subscription_end TIMESTAMPTZ,
    consent_personal_data BOOLEAN DEFAULT FALSE,
    consent_processing BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для поиска
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_subscription ON profiles(subscription_status);

-- ============================================
-- 2. ОТЧЁТЫ О ПИТАНИИ
-- ============================================
CREATE TABLE reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    report_date DATE NOT NULL,
    report_time TIME NOT NULL DEFAULT CURRENT_TIME,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner', 'unplanned')),
    description TEXT NOT NULL,
    photo_url TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user_date ON reports(user_id, report_date);
CREATE INDEX idx_reports_meal_type ON reports(meal_type);

-- ============================================
-- 3. ЗАМЕРЫ ТЕЛА
-- ============================================
CREATE TABLE measurements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    measurement_date DATE NOT NULL,
    measurement_time TIME NOT NULL DEFAULT CURRENT_TIME,
    weight DECIMAL(5,2),           -- вес в кг
    chest DECIMAL(5,2),            -- объем груди в см
    waist DECIMAL(5,2),            -- объем талии в см
    hips DECIMAL(5,2),             -- объем бедер в см
    left_arm DECIMAL(5,2),         -- объем левой руки
    right_arm DECIMAL(5,2),        -- объем правой руки
    left_thigh DECIMAL(5,2),       -- объем левого бедра
    right_thigh DECIMAL(5,2),      -- объем правого бедра
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_measurements_user_date ON measurements(user_id, measurement_date);

-- ============================================
-- 4. ТРЕКЕР ВОДЫ
-- ============================================
CREATE TABLE water_intake (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    intake_date DATE NOT NULL,
    intake_time TIME NOT NULL DEFAULT CURRENT_TIME,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_water_user_date ON water_intake(user_id, intake_date);

-- ============================================
-- 5. ЧАТ С КУРАТОРОМ
-- ============================================
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    curator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'curator')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_curator ON messages(curator_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- 6. РЕКОМЕНДАЦИИ КУРАТОРА
-- ============================================
CREATE TABLE recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    curator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id, created_at DESC);

-- ============================================
-- 7. ПОДПИСКИ И ОПЛАТЫ
-- ============================================
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('consultation', 'monthly', 'premium')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    payment_id TEXT,
    payment_provider TEXT DEFAULT 'prodamus',
    amount DECIMAL(10,2),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- 8. ЗАЯВКИ НА КОНСУЛЬТАЦИЮ (с лендинга)
-- ============================================
CREATE TABLE consultation_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consultation_status ON consultation_requests(status);

-- ============================================
-- RLS ПОЛИТИКИ (Row Level Security)
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;

-- ===== Политики для profiles =====
-- Пользователь видит только свой профиль
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Пользователь может обновлять свой профиль
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Пользователь может вставить свой профиль при регистрации
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Куратор и админ видят все профили
CREATE POLICY "Curators can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

-- ===== Политики для reports =====
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON reports
    FOR DELETE USING (auth.uid() = user_id);

-- Куратор видит все отчёты
CREATE POLICY "Curators can view all reports" ON reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

-- ===== Политики для measurements =====
CREATE POLICY "Users can view own measurements" ON measurements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements" ON measurements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements" ON measurements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements" ON measurements
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Curators can view all measurements" ON measurements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

-- ===== Политики для water_intake =====
CREATE POLICY "Users can view own water intake" ON water_intake
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water intake" ON water_intake
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own water intake" ON water_intake
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Curators can view all water intake" ON water_intake
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

-- ===== Политики для messages =====
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = curator_id);

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = curator_id);

CREATE POLICY "Users can update own messages read status" ON messages
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = curator_id);

-- ===== Политики для recommendations =====
CREATE POLICY "Users can view own recommendations" ON recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Curators can insert recommendations" ON recommendations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

CREATE POLICY "Curators can update recommendations" ON recommendations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

-- ===== Политики для subscriptions =====
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Curators can view all subscriptions" ON subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

-- ===== Политики для consultation_requests =====
-- Все могут создавать заявки
CREATE POLICY "Anyone can create consultation request" ON consultation_requests
    FOR INSERT WITH CHECK (true);

-- Только куратор и админ видят заявки
CREATE POLICY "Curators can view consultation requests" ON consultation_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

CREATE POLICY "Curators can update consultation requests" ON consultation_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('curator', 'admin')
        )
    );

-- ============================================
-- ФУНКЦИЯ: Автоматическое создание профиля при регистрации
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, consent_personal_data, consent_processing, consent_date)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Пользователь'),
        NEW.email,
        'client',
        COALESCE((NEW.raw_user_meta_data->>'consent_personal_data')::boolean, FALSE),
        COALESCE((NEW.raw_user_meta_data->>'consent_processing')::boolean, FALSE),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер на создание профиля при регистрации
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ФУНКЦИЯ: Обновление updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultation_requests_updated_at BEFORE UPDATE ON consultation_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- НАСТРОЙКА STORAGE (для фото)
-- ============================================
-- Бакет для фото отчётов создаётся через интерфейс Supabase:
-- 1. Перейди в Storage (левое меню)
-- 2. Нажми "New bucket"
-- 3. Название: report-photos
-- 4. Public: YES
-- 5. Создай

-- ============================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: Создание куратора
-- ============================================
-- Куратор создаётся через интерфейс Supabase Auth:
-- 1. Перейди в Authentication → Users
-- 2. Нажми "Add user"
-- 3. Введи email и пароль куратора
-- 4. После создания обнови роль в таблице profiles:
--    UPDATE profiles SET role = 'curator' WHERE email = 'email-куратора';

-- ============================================
-- ГОТОВО! ✅
-- ============================================
