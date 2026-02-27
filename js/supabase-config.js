// ============================================
// Supabase Configuration
// Replace with your Supabase project values
// ============================================

var SUPABASE_URL = 'https://kffeqhnbpedixdvbdcug.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_8JFRzGtYwecNmI59Jlm84g_v6bHR0CU';

// ============================================
// LINE LIFF Configuration
// Replace with your actual LIFF ID from LINE Developers Console
// ============================================

var LIFF_ID = '2009225805-gmfSXvqU';

// ============================================
// Admin Password (SHA-256 hash)
// To change the password, run in browser console:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSWORD'))
//     .then(h => console.log(Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))
// Then paste the hash below.
// Default password: "unlock2025"
// ============================================

var ADMIN_PASSWORD_HASH = '50f65bd567a4dc30fd5072c3438749b862050b4217eef6d9a6a88e63072f966b';
