-- ========================================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO SUPABASE
-- PROJETO: Mestre da Ceia & Churrasco
-- ========================================================

-- 1. Criação da tabela de controle de acesso dos compradores
CREATE TABLE IF NOT EXISTS public.usuarios_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    nome TEXT,
    stripe_customer_id TEXT,
    stripe_session_id TEXT,
    has_access BOOLEAN DEFAULT TRUE,
    plano TEXT DEFAULT 'vitalicio',
    order_bump_drinks BOOLEAN DEFAULT FALSE,
    order_bump_anticaos BOOLEAN DEFAULT FALSE,
    valor_pago NUMERIC(10, 2) DEFAULT 19.90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitação de Segurança por Linha (Row Level Security - RLS)
ALTER TABLE public.usuarios_acesso ENABLE ROW LEVEL SECURITY;

-- 3. Política: Usuário autenticado pode consultar o seu próprio registro
DROP POLICY IF EXISTS "Usuário consulta seu próprio acesso" ON public.usuarios_acesso;
CREATE POLICY "Usuário consulta seu próprio acesso"
ON public.usuarios_acesso
FOR SELECT
TO authenticated
USING (
    lower(auth.jwt() ->> 'email') = lower(email) 
    OR auth.uid() = user_id
);

-- 4. Política: Service Role (nosso Webhook do Stripe) tem permissão irrestrita
DROP POLICY IF EXISTS "Service role controle irrestrito" ON public.usuarios_acesso;
CREATE POLICY "Service role controle irrestrito"
ON public.usuarios_acesso
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Função para atualizar timestamp 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_usuarios_acesso_timestamp ON public.usuarios_acesso;
CREATE TRIGGER trigger_update_usuarios_acesso_timestamp
BEFORE UPDATE ON public.usuarios_acesso
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
