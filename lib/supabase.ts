import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bjtkhjnrrdfgdgdnjszu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdGtoam5ycmRmZ2RnZG5qc3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDIxODcsImV4cCI6MjA5NzgxODE4N30.mNpIAXXFzrW_BskDhH9b1Q3z2N6LJvzwgxobZ8ljcE8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
