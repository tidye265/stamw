// server.js
const express = require('express');
const bcrypt = require('bcrypt');
const supabase = require('./supabase'); // import supabase client

const app = express();
app.use(express.json());

// POST /register – kulembetsa user
app.post('/register', async (req, res) => {
  try {
    const { full_name, phone, password } = req.body;

    // Validate input
    if (!full_name || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert into users table
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          full_name,
          phone,
          password: hashedPassword,
        },
      ])
      .select()
      .single();

    if (error) {
      // handle unique constraint violation (phone already exists)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
      throw error;
    }

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: data.user_id,
        full_name: data.full_name,
        phone: data.phone,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
