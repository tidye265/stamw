// supabase.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jnqwvmxuieeelvukhcsq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpucXd2bXh1aWVlZWx2dWtoY3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODEzNjYsImV4cCI6MjEwMjk1NzM2Nn0.hK8sxh1RscVJroevXmZ8x75eU5EPdGIphUrqgwfz0bw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = supabase;
