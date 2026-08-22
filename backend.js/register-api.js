// backend.js/register-api.js
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import supabase from '../javascript.js/supabase.js'; // import default client

// We already have supabase client from supabase.js, but we need to ensure global fetch works.
// Simpler: create a new client inside function (avoid importing from other file? but okay to import).

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const { full_name, phone, password } = await request.json();

    if (!full_name || !phone || !password) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ full_name, phone, password: hashedPassword }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Phone number already registered' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ message: 'User registered successfully', user: { user_id: data.user_id, full_name: data.full_name, phone: data.phone } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
