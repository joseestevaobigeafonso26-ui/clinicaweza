-- ============================================================
--  SISTEMA VETERINÁRIO — SETUP COMPLETO SUPABASE
--  Execute este script no SQL Editor do Supabase
--  Passo 1: Apague tudo (caso exista algo antigo)
--  Passo 2: Cria tabelas limpas com RLS correcta
-- ============================================================


-- ============================================================
-- PASSO 1 — LIMPAR TUDO (apagar tabelas antigas se existirem)
-- ============================================================

DROP TABLE IF EXISTS public.pagamentos    CASCADE;
DROP TABLE IF EXISTS public.vacinas       CASCADE;
DROP TABLE IF EXISTS public.consultas     CASCADE;
DROP TABLE IF EXISTS public.agendamentos  CASCADE;
DROP TABLE IF EXISTS public.pets          CASCADE;
DROP TABLE IF EXISTS public.clientes      CASCADE;
DROP TABLE IF EXISTS public.usuarios      CASCADE;

-- Apagar tipos antigos se existirem
DROP TYPE IF EXISTS public.user_role          CASCADE;
DROP TYPE IF EXISTS public.agendamento_status CASCADE;
DROP TYPE IF EXISTS public.pagamento_status   CASCADE;
DROP TYPE IF EXISTS public.pagamento_metodo   CASCADE;
DROP TYPE IF EXISTS public.pet_sexo           CASCADE;


-- ============================================================
-- PASSO 2 — CRIAR TIPOS ENUM
-- ============================================================

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'veterinario',
  'rececionista'
);

CREATE TYPE public.agendamento_status AS ENUM (
  'agendado',
  'confirmado',
  'concluido',
  'cancelado'
);

CREATE TYPE public.pagamento_status AS ENUM (
  'pendente',
  'pago',
  'cancelado'
);

CREATE TYPE public.pagamento_metodo AS ENUM (
  'dinheiro',
  'transferencia',
  'cartao'
);

CREATE TYPE public.pet_sexo AS ENUM (
  'macho',
  'femea'
);


-- ============================================================
-- PASSO 3 — TABELA: usuarios
-- Liga ao auth.users do Supabase via id
-- ============================================================

CREATE TABLE public.usuarios (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT          NOT NULL,
  email       TEXT          NOT NULL UNIQUE,
  role        public.user_role NOT NULL DEFAULT 'rececionista',
  ativo       BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_role  ON public.usuarios(role);
CREATE INDEX idx_usuarios_email ON public.usuarios(email);

-- Auto-atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PASSO 4 — TABELA: clientes
-- Clientes dos animais (donos)
-- ============================================================

CREATE TABLE public.clientes (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT          NOT NULL,
  email       TEXT,
  telefone    TEXT          NOT NULL,
  endereco    TEXT,
  nif         TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_nome  ON public.clientes(nome);
CREATE INDEX idx_clientes_email ON public.clientes(email);

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PASSO 5 — TABELA: pets
-- Animais pertencentes a clientes
-- ============================================================

CREATE TABLE public.pets (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       UUID          NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome             TEXT          NOT NULL,
  especie          TEXT          NOT NULL,  -- ex: Cão, Gato, Ave, etc.
  raca             TEXT,
  sexo             public.pet_sexo,
  data_nascimento  DATE,
  peso             NUMERIC(5,2), -- em kg
  cor              TEXT,
  observacoes      TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pets_cliente_id ON public.pets(cliente_id);
CREATE INDEX idx_pets_nome       ON public.pets(nome);

CREATE TRIGGER trg_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PASSO 6 — TABELA: agendamentos
-- Marcações de serviços (consulta, vacina, etc.)
-- ============================================================

CREATE TABLE public.agendamentos (
  id              UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID                     NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  veterinario_id  UUID                     REFERENCES public.usuarios(id) ON DELETE SET NULL,
  data            DATE                     NOT NULL,
  hora            TIME                     NOT NULL,
  tipo_servico    TEXT                     NOT NULL,  -- ex: Consulta, Vacina, Banho, etc.
  status          public.agendamento_status NOT NULL DEFAULT 'agendado',
  observacoes     TEXT,
  created_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agendamentos_pet_id         ON public.agendamentos(pet_id);
CREATE INDEX idx_agendamentos_veterinario_id ON public.agendamentos(veterinario_id);
CREATE INDEX idx_agendamentos_data           ON public.agendamentos(data);
CREATE INDEX idx_agendamentos_status         ON public.agendamentos(status);

CREATE TRIGGER trg_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PASSO 7 — TABELA: consultas
-- Fichas clínicas / histórico médico dos pets
-- ============================================================

CREATE TABLE public.consultas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           UUID        NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  veterinario_id   UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  agendamento_id   UUID        REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  data_consulta    DATE        NOT NULL,
  sintomas         TEXT        NOT NULL,
  diagnostico      TEXT        NOT NULL,
  tratamento       TEXT        NOT NULL,
  medicamentos     TEXT,
  observacoes      TEXT,
  proxima_consulta DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultas_pet_id         ON public.consultas(pet_id);
CREATE INDEX idx_consultas_veterinario_id ON public.consultas(veterinario_id);
CREATE INDEX idx_consultas_data           ON public.consultas(data_consulta);

CREATE TRIGGER trg_consultas_updated_at
  BEFORE UPDATE ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PASSO 8 — TABELA: vacinas
-- Registo de vacinações dos pets
-- ============================================================

CREATE TABLE public.vacinas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID        NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  veterinario_id  UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo_vacina     TEXT        NOT NULL,
  data_aplicacao  DATE        NOT NULL,
  proxima_dose    DATE,
  lote            TEXT,
  fabricante      TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vacinas_pet_id        ON public.vacinas(pet_id);
CREATE INDEX idx_vacinas_proxima_dose  ON public.vacinas(proxima_dose);

CREATE TRIGGER trg_vacinas_updated_at
  BEFORE UPDATE ON public.vacinas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PASSO 9 — TABELA: pagamentos
-- Controlo financeiro dos serviços
-- ============================================================

CREATE TABLE public.pagamentos (
  id               UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       UUID                    NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  agendamento_id   UUID                    REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  descricao        TEXT                    NOT NULL,
  valor            NUMERIC(10,2)           NOT NULL CHECK (valor >= 0),
  data_pagamento   DATE                    NOT NULL DEFAULT CURRENT_DATE,
  metodo_pagamento public.pagamento_metodo,
  status           public.pagamento_status NOT NULL DEFAULT 'pendente',
  observacoes      TEXT,
  created_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagamentos_cliente_id ON public.pagamentos(cliente_id);
CREATE INDEX idx_pagamentos_status     ON public.pagamentos(status);
CREATE INDEX idx_pagamentos_data       ON public.pagamentos(data_pagamento);

CREATE TRIGGER trg_pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- PASSO 10 — ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activar RLS em todas as tabelas
ALTER TABLE public.usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacinas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos   ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Função auxiliar: obtém o role do utilizador autenticado
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT
  FROM public.usuarios
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- POLÍTICAS: usuarios
-- Apenas admin pode gerir; qualquer utilizador pode ler o seu próprio registo
-- ------------------------------------------------------------

-- Qualquer utilizador autenticado pode ler a sua própria linha
CREATE POLICY "usuarios_select_self"
  ON public.usuarios FOR SELECT
  USING (id = auth.uid() OR public.get_user_role() = 'admin');

-- Apenas admin pode inserir (criado via API com service_role, esta policy é para consistência)
CREATE POLICY "usuarios_insert_admin"
  ON public.usuarios FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

-- Apenas admin pode actualizar
CREATE POLICY "usuarios_update_admin"
  ON public.usuarios FOR UPDATE
  USING (public.get_user_role() = 'admin');

-- Apenas admin pode apagar
CREATE POLICY "usuarios_delete_admin"
  ON public.usuarios FOR DELETE
  USING (public.get_user_role() = 'admin');

-- ------------------------------------------------------------
-- POLÍTICAS: clientes
-- Admin e Rececionista gerem; Veterinário só visualiza
-- ------------------------------------------------------------

CREATE POLICY "clientes_select"
  ON public.clientes FOR SELECT
  USING (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "clientes_insert"
  ON public.clientes FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'rececionista'));

CREATE POLICY "clientes_update"
  ON public.clientes FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'rececionista'));

CREATE POLICY "clientes_delete"
  ON public.clientes FOR DELETE
  USING (public.get_user_role() IN ('admin', 'rececionista'));

-- ------------------------------------------------------------
-- POLÍTICAS: pets
-- Admin e Rececionista criam/editam; Veterinário pode gerir (clínico)
-- ------------------------------------------------------------

CREATE POLICY "pets_select"
  ON public.pets FOR SELECT
  USING (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "pets_insert"
  ON public.pets FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "pets_update"
  ON public.pets FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "pets_delete"
  ON public.pets FOR DELETE
  USING (public.get_user_role() IN ('admin', 'rececionista'));

-- ------------------------------------------------------------
-- POLÍTICAS: agendamentos
-- Admin, Rececionista e Veterinário acedem
-- ------------------------------------------------------------

CREATE POLICY "agendamentos_select"
  ON public.agendamentos FOR SELECT
  USING (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "agendamentos_insert"
  ON public.agendamentos FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "agendamentos_update"
  ON public.agendamentos FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "agendamentos_delete"
  ON public.agendamentos FOR DELETE
  USING (public.get_user_role() IN ('admin', 'rececionista'));

-- ------------------------------------------------------------
-- POLÍTICAS: consultas
-- Apenas Veterinário e Admin (Rececionista só lê)
-- ------------------------------------------------------------

CREATE POLICY "consultas_select"
  ON public.consultas FOR SELECT
  USING (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "consultas_insert"
  ON public.consultas FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'veterinario'));

CREATE POLICY "consultas_update"
  ON public.consultas FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'veterinario'));

CREATE POLICY "consultas_delete"
  ON public.consultas FOR DELETE
  USING (public.get_user_role() = 'admin');

-- ------------------------------------------------------------
-- POLÍTICAS: vacinas
-- Apenas Veterinário e Admin
-- ------------------------------------------------------------

CREATE POLICY "vacinas_select"
  ON public.vacinas FOR SELECT
  USING (public.get_user_role() IN ('admin', 'veterinario', 'rececionista'));

CREATE POLICY "vacinas_insert"
  ON public.vacinas FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'veterinario'));

CREATE POLICY "vacinas_update"
  ON public.vacinas FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'veterinario'));

CREATE POLICY "vacinas_delete"
  ON public.vacinas FOR DELETE
  USING (public.get_user_role() = 'admin');

-- ------------------------------------------------------------
-- POLÍTICAS: pagamentos
-- Admin e Rececionista
-- ------------------------------------------------------------

CREATE POLICY "pagamentos_select"
  ON public.pagamentos FOR SELECT
  USING (public.get_user_role() IN ('admin', 'rececionista'));

CREATE POLICY "pagamentos_insert"
  ON public.pagamentos FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'rececionista'));

CREATE POLICY "pagamentos_update"
  ON public.pagamentos FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'rececionista'));

CREATE POLICY "pagamentos_delete"
  ON public.pagamentos FOR DELETE
  USING (public.get_user_role() IN ('admin', 'rececionista'));


-- ============================================================
-- PASSO 11 — TRIGGER: Criar registo em usuarios automaticamente
-- quando um novo utilizador é criado no Supabase Auth
-- (usado para o primeiro admin via Supabase Dashboard)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Só insere se ainda não existir (evitar duplicados)
  INSERT INTO public.usuarios (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'rececionista')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================
-- PASSO 12 — PERMISSÕES PARA service_role (API Admin)
-- O service_role ignora RLS por defeito no Supabase,
-- mas garantimos acesso explícito às tabelas
-- ============================================================

GRANT ALL ON public.usuarios     TO service_role;
GRANT ALL ON public.clientes     TO service_role;
GRANT ALL ON public.pets         TO service_role;
GRANT ALL ON public.agendamentos TO service_role;
GRANT ALL ON public.consultas    TO service_role;
GRANT ALL ON public.vacinas      TO service_role;
GRANT ALL ON public.pagamentos   TO service_role;

-- Permissões de leitura para anon (necessário para auth funcionar)
GRANT SELECT ON public.usuarios TO anon;


-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- Próximo passo:
--   1. Vá ao Supabase Dashboard > Authentication > Users
--   2. Crie manualmente o primeiro utilizador Admin
--   3. Depois vá a Table Editor > usuarios e confirme
--      que o registo foi criado com role = 'rececionista'
--   4. Altere o role para 'admin' manualmente nessa linha
--   5. A partir daí, o Admin cria os outros utilizadores
--      pelo sistema (que usa a service_role key)
-- ============================================================
