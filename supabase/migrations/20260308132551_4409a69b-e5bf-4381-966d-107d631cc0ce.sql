
ALTER TABLE public.partner_leave_requests 
  ADD COLUMN settlement_amount numeric DEFAULT 0,
  ADD COLUMN settlement_currency text DEFAULT 'BDT',
  ADD COLUMN settlement_notes text;
