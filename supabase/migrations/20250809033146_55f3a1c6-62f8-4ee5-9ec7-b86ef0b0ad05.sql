
-- 1) Backfill: vincular school_id ao id onde estiver nulo
update public.school_customizations
set school_id = id
where school_id is null;

-- 2) Função para garantir school_id em inserts/updates
create or replace function public.set_school_customizations_school_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.school_id is null then
    new.school_id := new.id;
  end if;
  return new;
end;
$$;

-- 3) Trigger em INSERT/UPDATE
drop trigger if exists trg_school_customizations_set_school_id on public.school_customizations;

create trigger trg_school_customizations_set_school_id
before insert or update on public.school_customizations
for each row execute procedure public.set_school_customizations_school_id();

-- 4) (Opcional recomendado) Garantir unicidade de school_id
create unique index if not exists uq_school_customizations_school_id
on public.school_customizations (school_id);
