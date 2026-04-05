ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS reconciled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cash_difference numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pix_difference numeric DEFAULT 0;