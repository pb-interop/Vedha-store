-- Run after creating director@neantixtech.com in Authentication > Users.
insert into public.admin_users(user_id, display_name)
select id, 'Vedha Administrator'
from auth.users
where lower(email) = 'director@neantixtech.com'
on conflict(user_id) do update set display_name=excluded.display_name, active=true;

do $$
begin
  if not exists (
    select 1 from public.admin_users a
    join auth.users u on u.id=a.user_id
    where lower(u.email)='director@neantixtech.com' and a.active=true
  ) then
    raise exception 'Create director@neantixtech.com in Authentication > Users before running this script.';
  end if;
end $$;
