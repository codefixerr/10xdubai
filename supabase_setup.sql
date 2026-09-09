-- ============================================================================
-- Supabase Database Setup Script for Dubai10X Gaming App
-- Copy and run this entire script in your Supabase SQL Editor!
-- ============================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT '' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    balance NUMERIC(12,2) DEFAULT 100.00 NOT NULL,
    vip TEXT DEFAULT 'VIP 1' NOT NULL,
    status TEXT DEFAULT 'Active' NOT NULL,
    invited_by TEXT DEFAULT ''
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invited_by TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS spins_remaining INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_session_token TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users(phone);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- 2. Create Payment Settings & Dynamic Category Names Table
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id INT PRIMARY KEY DEFAULT 1,
    upi_id TEXT DEFAULT 'amiriwin.pay@upi' NOT NULL,
    qr_code_url TEXT DEFAULT '' NOT NULL,
    bonus_percentage INT DEFAULT 0 NOT NULL,
    first_deposit_bonus INT DEFAULT 100 NOT NULL,
    referral_bonus NUMERIC(12,2) DEFAULT 50.00 NOT NULL,
    min_deposit NUMERIC(12,2) DEFAULT 200.00 NOT NULL,
    max_deposit NUMERIC(12,2) DEFAULT 20000.00 NOT NULL,
    banner_title TEXT DEFAULT '🌴 Wild Animals',
    referrer_title TEXT DEFAULT '🏠 Pet Animals',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS first_deposit_bonus INT DEFAULT 100;
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS welcome_bonus NUMERIC(12,2) DEFAULT 100.00;
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS referral_bonus NUMERIC(12,2) DEFAULT 50.00;
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS banner_title TEXT DEFAULT '🌴 Wild Animals';
ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS referrer_title TEXT DEFAULT '🏠 Pet Animals';

INSERT INTO public.payment_settings (id, upi_id, qr_code_url, bonus_percentage, first_deposit_bonus, referral_bonus, banner_title, referrer_title)
VALUES (1, 'amiriwin.pay@upi', '', 0, 100, 50.00, '🌴 Wild Animals', '🏠 Pet Animals')
ON CONFLICT (id) DO UPDATE SET
    first_deposit_bonus = EXCLUDED.first_deposit_bonus,
    referral_bonus = EXCLUDED.referral_bonus,
    banner_title = COALESCE(public.payment_settings.banner_title, EXCLUDED.banner_title),
    referrer_title = COALESCE(public.payment_settings.referrer_title, EXCLUDED.referrer_title);

ALTER TABLE public.payment_settings DISABLE ROW LEVEL SECURITY;

-- 3. Create Dynamic Payment Methods Table (Managed via Admin Panel with ON/OFF Toggle)
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    qr_code_url TEXT DEFAULT '',
    status TEXT DEFAULT 'ON' NOT NULL,
    max_limit NUMERIC(12,2) DEFAULT 60000.00 NOT NULL,
    current_total NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS max_limit NUMERIC(12,2) DEFAULT 60000.00;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS current_total NUMERIC(12,2) DEFAULT 0.00;

UPDATE public.payment_methods SET max_limit = 60000.00 WHERE max_limit IS NULL;
UPDATE public.payment_methods SET current_total = 0.00 WHERE current_total IS NULL;

INSERT INTO public.payment_methods (id, name, upi_id, qr_code_url, status, max_limit, current_total)
VALUES
    ('PM_UPI', 'UPI', 'dubai10x.pay@okhdfcbank', '', 'ON', 60000.00, 0.00),
    ('PM_PHONEPE', 'PhonePe', 'dubai10x.pay@ybl', '', 'ON', 60000.00, 0.00),
    ('PM_PAYTM', 'Paytm', 'dubai10x.pay@paytm', '', 'ON', 60000.00, 0.00),
    ('PM_ICASH', 'iCash.one', 'icash.pay@upi', '', 'ON', 60000.00, 0.00),
    ('PM_UTR', 'UPI_utr', 'dubai10x.pay@okhdfcbank', '', 'OFF', 60000.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- 4. Create Deposits Table (User UTR Submissions)
CREATE TABLE IF NOT EXISTS public.deposits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    utr_number TEXT NOT NULL,
    method TEXT DEFAULT 'UPI' NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL,
    proof_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS proof_url TEXT DEFAULT '';

-- 5. Create 10 Card 10X Game Rounds Table
CREATE TABLE IF NOT EXISTS public.game_rounds_10x (
    id TEXT PRIMARY KEY,
    round_number BIGINT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    winning_cards INT[] DEFAULT '{}',
    total_bets_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
    total_payout_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
    admin_profit NUMERIC(12,2) DEFAULT 0 NOT NULL,
    preset_winning_card INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create 10 Card 10X User Bets Table (Supports 10X Exact & 2X Category Bets)
CREATE TABLE IF NOT EXISTS public.user_bets_10x (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    card_number INT NOT NULL,
    bet_amount NUMERIC(12,2) NOT NULL,
    bet_type TEXT DEFAULT 'exact_10x' NOT NULL, -- 'exact_10x' OR 'category_2x'
    category TEXT DEFAULT '' NOT NULL, -- 'wild' OR 'pet'
    payout_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_bets_10x ADD COLUMN IF NOT EXISTS bet_type TEXT DEFAULT 'exact_10x';
ALTER TABLE public.user_bets_10x ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS user_bets_10x_round_id_idx ON public.user_bets_10x(round_id);
CREATE INDEX IF NOT EXISTS user_bets_10x_user_id_idx ON public.user_bets_10x(user_id);

-- 7. Create Dynamic Animal Cards Config Table (Managed via Admin Panel)
CREATE TABLE IF NOT EXISTS public.animals_config (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'wild' (5 Cards) OR 'pet' (5 Cards)
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.animals_config (id, name, category, image_url)
VALUES
    (1, 'Lion 🦁', 'wild', 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300'),
    (2, 'Tiger 🐯', 'wild', 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=300'),
    (3, 'Elephant 🐘', 'wild', 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300'),
    (4, 'Bear 🐻', 'wild', 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=300'),
    (5, 'Wolf 🐺', 'wild', 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef9?w=300'),
    (6, 'Dog 🐶', 'pet', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300'),
    (7, 'Cat 🐱', 'pet', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300'),
    (8, 'Cow 🐮', 'pet', 'https://images.unsplash.com/photo-1570042707222-675037d048d0?w=300'),
    (9, 'Rabbit 🐰', 'pet', 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300'),
    (10, 'Horse 🐴', 'pet', 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=300')
ON CONFLICT (id) DO NOTHING;

-- 8. USER PAYOUT ACCOUNTS TABLE (SAVED BANK ACCOUNTS & UPI IDs)
CREATE TABLE IF NOT EXISTS public.user_payout_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    type TEXT NOT NULL, -- 'BANK' or 'UPI'
    name TEXT NOT NULL,
    acc TEXT DEFAULT '',
    ifsc TEXT DEFAULT '',
    bank TEXT DEFAULT '',
    vpa TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Enable Row Level Security (RLS) & Define Full Public Access Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds_10x ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bets_10x ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public users" ON public.users;
DROP POLICY IF EXISTS "Allow public payment_settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Allow public payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Allow public deposits" ON public.deposits;
DROP POLICY IF EXISTS "Allow public game_rounds_10x" ON public.game_rounds_10x;
DROP POLICY IF EXISTS "Allow public user_bets_10x" ON public.user_bets_10x;
DROP POLICY IF EXISTS "Allow public animals_config" ON public.animals_config;
DROP POLICY IF EXISTS "Allow public user_payout_accounts" ON public.user_payout_accounts;

CREATE POLICY "Allow public users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public payment_settings" ON public.payment_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public payment_methods" ON public.payment_methods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public deposits" ON public.deposits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public game_rounds_10x" ON public.game_rounds_10x FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public user_bets_10x" ON public.user_bets_10x FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public animals_config" ON public.animals_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public user_payout_accounts" ON public.user_payout_accounts FOR ALL USING (true) WITH CHECK (true);

-- 10. WITHDRAWALS TABLE (BANK TRANSFER & UPI DIRECT WITHDRAWALS)
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    phone VARCHAR(20) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    method VARCHAR(20) NOT NULL, -- 'BANK' or 'UPI'
    bank_details JSONB,
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    admin_notes TEXT,
    utr_number TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS utr_number TEXT DEFAULT '';

-- RLS POLICIES FOR WITHDRAWALS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public withdrawals" ON public.withdrawals;
CREATE POLICY "Allow public withdrawals" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_phone ON public.withdrawals(phone);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- 11. GAME SETTINGS TABLE FOR DYNAMIC TIMERS
CREATE TABLE IF NOT EXISTS public.game_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public game_settings" ON public.game_settings;
CREATE POLICY "Allow public game_settings" ON public.game_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 12. ATOMIC ROUND SETTLEMENT FUNCTION (100% ACID TRANSACTION & IDEMPOTENT)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.settle_round_10x_atomic(
    p_round_id TEXT,
    p_winning_card INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bet RECORD;
    v_win_category TEXT;
    v_is_won BOOLEAN;
    v_payout NUMERIC(12,2);
    v_total_payout NUMERIC(12,2) := 0;
    v_total_bets NUMERIC(12,2) := 0;
    v_admin_profit NUMERIC(12,2) := 0;
    v_user_clean TEXT;
    v_phone_clean TEXT;
    v_bcat TEXT;
    v_settled_count INT := 0;
BEGIN
    IF p_winning_card <= 5 THEN
        v_win_category := 'wild';
    ELSE
        v_win_category := 'pet';
    END IF;

    FOR v_bet IN 
        SELECT * FROM public.user_bets_10x 
        WHERE (round_id = p_round_id OR round_id = REPLACE(p_round_id, 'ROUND_', ''))
          AND status = 'PENDING'
        FOR UPDATE
    LOOP
        v_settled_count := v_settled_count + 1;
        v_total_bets := v_total_bets + v_bet.bet_amount;
        v_is_won := FALSE;
        v_payout := 0;

        IF LOWER(COALESCE(v_bet.bet_type, '')) LIKE '%2x%' OR (v_bet.card_number IS NULL OR v_bet.card_number = 0) THEN
            v_bcat := LOWER(COALESCE(v_bet.category, ''));
            IF (p_winning_card <= 5 AND (v_bcat IN ('wild', 'cat1', 'category 1', 'bowler', '1') OR v_bet.card_number <= 5)) OR
               (p_winning_card > 5 AND (v_bcat IN ('pet', 'cat2', 'category 2', 'batsman', '2') OR v_bet.card_number > 5)) THEN
                v_is_won := TRUE;
                v_payout := v_bet.bet_amount * 2;
            END IF;
        ELSE
            IF v_bet.card_number = p_winning_card THEN
                v_is_won := TRUE;
                v_payout := v_bet.bet_amount * 10;
            END IF;
        END IF;

        IF v_is_won THEN
            v_total_payout := v_total_payout + v_payout;

            UPDATE public.user_bets_10x
            SET status = 'WON',
                payout_amount = v_payout,
                winning_card = p_winning_card
            WHERE id = v_bet.id;

            v_user_clean := REPLACE(COALESCE(v_bet.user_id, ''), 'USR_', '');
            v_phone_clean := RIGHT(COALESCE(v_bet.phone, ''), 10);

            IF v_user_clean <> '' OR v_phone_clean <> '' THEN
                UPDATE public.users
                SET balance = balance + v_payout
                WHERE (v_user_clean <> '' AND (id = v_bet.user_id OR user_id = v_bet.user_id OR REPLACE(id, 'USR_', '') = v_user_clean))
                   OR (v_phone_clean <> '' AND RIGHT(phone, 10) = v_phone_clean);
            END IF;
        ELSE
            UPDATE public.user_bets_10x
            SET status = 'LOST',
                payout_amount = 0,
                winning_card = p_winning_card
            WHERE id = v_bet.id;
        END IF;
    END LOOP;

    v_admin_profit := v_total_bets - v_total_payout;

    INSERT INTO public.game_rounds_10x (id, round_number, status, winning_cards, total_bets_amount, total_payout_amount, admin_profit, created_at)
    VALUES (
        p_round_id, 
        COALESCE(CAST(REGEXP_REPLACE(p_round_id, '[^0-9]', '', 'g') AS BIGINT), 1), 
        'SETTLED', 
        ARRAY[p_winning_card], 
        v_total_bets, 
        v_total_payout, 
        v_admin_profit, 
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        status = 'SETTLED',
        winning_cards = ARRAY[p_winning_card],
        total_bets_amount = public.game_rounds_10x.total_bets_amount + EXCLUDED.total_bets_amount,
        total_payout_amount = public.game_rounds_10x.total_payout_amount + EXCLUDED.total_payout_amount,
        admin_profit = public.game_rounds_10x.admin_profit + EXCLUDED.admin_profit;

    RETURN jsonb_build_object(
        'success', true,
        'settled_count', v_settled_count,
        'total_payout', v_total_payout,
        'admin_profit', v_admin_profit
    );
END;
$$;

-- 11. Create User Bets CoinFlip Table
CREATE TABLE IF NOT EXISTS public.user_bets_coinflip (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    bet_amount NUMERIC(12,2) NOT NULL,
    selected_side TEXT NOT NULL,
    winning_side TEXT NOT NULL,
    status TEXT NOT NULL,
    payout_amount NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS user_bets_coinflip_user_id_idx ON public.user_bets_coinflip(user_id);
CREATE INDEX IF NOT EXISTS user_bets_coinflip_phone_idx ON public.user_bets_coinflip(phone);
ALTER TABLE public.user_bets_coinflip DISABLE ROW LEVEL SECURITY;

-- 12. Create Dragon vs Tiger Tables
CREATE TABLE IF NOT EXISTS public.user_bets_dragontiger (
    id TEXT PRIMARY KEY,
    round_id TEXT,
    user_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    bet_amount NUMERIC(12,2) NOT NULL,
    selected_side TEXT NOT NULL,
    winning_side TEXT DEFAULT '',
    status TEXT DEFAULT 'PENDING' NOT NULL,
    payout_amount NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS user_bets_dt_user_id_idx ON public.user_bets_dragontiger(user_id);
CREATE INDEX IF NOT EXISTS user_bets_dt_phone_idx ON public.user_bets_dragontiger(phone);
ALTER TABLE public.user_bets_dragontiger DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.dragontiger_rounds (
    id TEXT PRIMARY KEY,
    dragon_cards JSONB DEFAULT '[]'::jsonb,
    tiger_cards JSONB DEFAULT '[]'::jsonb,
    winner TEXT DEFAULT '',
    total_bets NUMERIC(12,2) DEFAULT 0.00,
    total_payout NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.dragontiger_rounds DISABLE ROW LEVEL SECURITY;

-- 13. CREATE ADMIN CREDENTIALS TABLE FOR DYNAMIC DATABASE AUTHENTICATION
CREATE TABLE IF NOT EXISTS public.admin_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_credentials DISABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_credentials (username, password, role)
VALUES 
    ('admin', 'admin123', 'admin'),
    ('superadmin', 'super123', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 14. CREATE ADMIN ACTIVITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    admin_phone TEXT,
    action_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_activity_logs(admin_id);

ALTER TABLE public.admin_activity_logs DISABLE ROW LEVEL SECURITY;


