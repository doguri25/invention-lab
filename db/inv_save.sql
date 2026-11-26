-- 기록 저장 함수(수파베이스 maeumbit). 2026-11-26 적용: inv_save_merge_fields
-- 기록을 통째로 덮어쓰지 않고 칸(field) 단위로 합친다.
-- 태블릿 두 대에서 같은 차시를 열어도 한쪽에서만 적은 칸이 사라지지 않는다.
create or replace function public.inv_save(p_name text, p_pin text, p_key text, p_data jsonb)
 returns json
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare a record; t timestamptz := now(); cur jsonb; nxt jsonb;
begin
  if p_key is null or length(p_key) > 40 or p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 200000 then return json_build_object('error', 'TOO_BIG'); end if;
  select * into a from inv__auth_student(p_name, p_pin);
  if a.err is not null then return json_build_object('error', a.err); end if;
  select data into cur from inv_records where student_id = a.sid and key = p_key for update;
  nxt := case when cur is not null and jsonb_typeof(cur) = 'object' then cur || p_data else p_data end;
  if octet_length(nxt::text) > 200000 then return json_build_object('error', 'TOO_BIG'); end if;
  insert into inv_records(student_id, key, data, updated_at) values (a.sid, p_key, nxt, t)
  on conflict (student_id, key) do update set data = excluded.data, updated_at = t;
  return json_build_object('at', t);
end $function$;
