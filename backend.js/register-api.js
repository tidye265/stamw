    // backend.js/register-api.js
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  'https://jnqwvmxuieeelvukhcsq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpucXd2bXh1aWVlZWx2dWtoY3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODEzNjYsImV4cCI6MjEwMjk1NzM2Nn0.hK8sxh1RscVJroevXmZ8x75eU5EPdGIphUrqgwfz0bw',
  { global: { fetch: (...args) => fetch(...args) } }
);

export async function onRequestGet() {
  return new Response(JSON.stringify({ message: 'Register API is working!' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

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

    return new Response(JSON.stringify({
      message: 'User registered successfully',
      user: {
        user_id: data.user_id,
        full_name: data.full_name,
        phone: data.phone,
        created_at: data.created_at
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
