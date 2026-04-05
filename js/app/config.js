// Конфигурация Supabase
// ЗАМЕНИ эти значения на свои из настроек Supabase!

const SUPABASE_URL = 'https://rrejiqxtlgrjfftomlr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KDP-JnzehDj-juiGf3FZHg_7MzqvYxQ';

// Инициализация клиента Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспорт для использования в других модулях
window.supabaseClient = supabase;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
