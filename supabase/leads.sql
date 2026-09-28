-- Ludus Ops — tabla de leads (pegar en Supabase > SQL Editor > Run)

create table if not exists public.leads (
  id           uuid primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  stage        text not null default 'inicial' check (stage in ('inicial', 'completo')),
  source       text check (length(source) <= 40),
  email        text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  problema     text not null check (length(problema) between 3 and 4000),
  nombre       text check (length(nombre) <= 200),
  empresa      text check (length(empresa) <= 200),
  cargo        text check (length(cargo) <= 200),
  telefono     text check (length(telefono) <= 40),
  sector       text check (length(sector) <= 80),
  empleados    text check (length(empleados) <= 40),
  page         text check (length(page) <= 300),
  referrer     text check (length(referrer) <= 500),
  utm_source   text check (length(utm_source) <= 120),
  utm_medium   text check (length(utm_medium) <= 120),
  utm_campaign text check (length(utm_campaign) <= 120),
  lang         text check (length(lang) <= 5),
  estado       text not null default 'nuevo'
               check (estado in ('nuevo', 'contactado', 'reunion', 'propuesta', 'ganado', 'perdido')),
  notas        text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_estado_idx on public.leads (estado);

alter table public.leads enable row level security;

grant insert on public.leads to anon;

drop policy if exists "web puede crear leads" on public.leads;
create policy "web puede crear leads"
  on public.leads for insert to anon
  with check (estado = 'nuevo' and notas is null and updated_at is null);

create or replace function public.complete_lead(p_id uuid, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.leads set
    nombre     = left(nullif(p_details->>'nombre', ''), 200),
    empresa    = left(nullif(p_details->>'empresa', ''), 200),
    cargo      = left(nullif(p_details->>'cargo', ''), 200),
    telefono   = left(nullif(p_details->>'telefono', ''), 40),
    sector     = left(nullif(p_details->>'sector', ''), 80),
    empleados  = left(nullif(p_details->>'empleados', ''), 40),
    stage      = 'completo',
    updated_at = now()
  where id = p_id
    and stage = 'inicial'
    and created_at > now() - interval '2 hours';
end;
$$;

revoke all on function public.complete_lead(uuid, jsonb) from public;
grant execute on function public.complete_lead(uuid, jsonb) to anon;
