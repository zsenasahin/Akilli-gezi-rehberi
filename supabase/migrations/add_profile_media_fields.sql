alter table public.profiles
add column if not exists bio text,
add column if not exists avatar_url text,
add column if not exists cover_url text;

insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do update set public = true;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Users can view profile media'
    ) then
        create policy "Users can view profile media"
        on storage.objects
        for select
        using (bucket_id = 'profile-media');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Users can upload own profile media'
    ) then
        create policy "Users can upload own profile media"
        on storage.objects
        for insert
        with check (
            bucket_id = 'profile-media'
            and auth.uid()::text = (storage.foldername(name))[1]
        );
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Users can update own profile media'
    ) then
        create policy "Users can update own profile media"
        on storage.objects
        for update
        using (
            bucket_id = 'profile-media'
            and auth.uid()::text = (storage.foldername(name))[1]
        )
        with check (
            bucket_id = 'profile-media'
            and auth.uid()::text = (storage.foldername(name))[1]
        );
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Users can delete own profile media'
    ) then
        create policy "Users can delete own profile media"
        on storage.objects
        for delete
        using (
            bucket_id = 'profile-media'
            and auth.uid()::text = (storage.foldername(name))[1]
        );
    end if;
end $$;
