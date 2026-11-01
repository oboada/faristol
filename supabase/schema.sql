-- Faristol · esquema de Supabase. Enganxa'l a SQL Editor d'un projecte NOU i prem "Run".
-- Una sola taula: cada fila és un document de l'app (compositor, obra, esquema, configuració…).
create table if not exists public.faristol_docs (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.faristol_docs enable row level security;

-- Cada usuari només veu i toca les seves files.
create policy "faristol: llegir les meves"   on public.faristol_docs for select to authenticated using      (user_id = (select auth.uid()));
create policy "faristol: crear les meves"    on public.faristol_docs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "faristol: editar les meves"   on public.faristol_docs for update to authenticated using      (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "faristol: esborrar les meves" on public.faristol_docs for delete to authenticated using      (user_id = (select auth.uid()));

create index if not exists faristol_docs_user_updated on public.faristol_docs (user_id, updated_at desc);

-- Clau privada de l'app: l'index.html públic només conté l'app XIFRADA (app.enc); aquesta taula guarda la clau
-- i només s'entrega a qui ha iniciat sessió. La fila s'afegeix amb el fitxer "NO-PUJAR-clau-privada.sql".
create table if not exists public.faristol_secret (
  id text primary key,
  k  text not null
);
alter table public.faristol_secret enable row level security;
create policy "faristol: clau nomes amb sessio" on public.faristol_secret for select to authenticated using (true);
-- (sense polítiques d'insert/update/delete: ningú des de l'app pot canviar-la)
