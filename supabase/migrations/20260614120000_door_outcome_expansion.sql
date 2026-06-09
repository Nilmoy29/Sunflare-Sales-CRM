-- Extend door_outcome enum with additional rep knock outcomes.

alter type public.door_outcome add value if not exists 'decision_maker_missing';
alter type public.door_outcome add value if not exists 'selling_the_house';
alter type public.door_outcome add value if not exists 'rental';
