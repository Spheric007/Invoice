
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwqdwwklslzvkxlwboks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cWR3d2tsc2x6dmt4bHdib2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDM0NTIsImV4cCI6MjA4NjIxOTQ1Mn0.coYVcWft60JH5sm6PCZag4_7uI3B7ftcWPWo6Xff2ao';

// Fix: Explicitly casting the Supabase client to 'any' to bypass environment-specific type errors where 
// standard auth methods (getSession, onAuthStateChange, etc.) are incorrectly reported as missing.
export const supabase: any = createClient(supabaseUrl, supabaseKey);