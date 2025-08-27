#!/usr/bin/env node

/**
 * Development script to create test users in Supabase
 * Run with: node scripts/setup-test-users.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// Create service role client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'password123',
    role: 'admin'
  },
  {
    email: process.env.TEST_MANAGER_EMAIL || 'manager@test.com', 
    password: process.env.TEST_MANAGER_PASSWORD || 'password123',
    role: 'manager'
  },
  {
    email: process.env.TEST_GUARD_EMAIL || 'guard@test.com',
    password: process.env.TEST_GUARD_PASSWORD || 'password123',
    role: 'guard'
  }
]

async function setupTestUsers() {
  console.log('🚀 Setting up test users in Supabase...\n')

  try {
    // Get role IDs first
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .in('name', ['admin', 'manager', 'guard'])

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message)
      return
    }

    const roleMap = {}
    roles.forEach(role => {
      roleMap[role.name] = role.id
    })

    console.log('📋 Available roles:')
    roles.forEach(role => {
      console.log(`   ${role.name}: ${role.id}`)
    })
    console.log('')

    // Create users and assign roles
    for (const user of testUsers) {
      console.log(`👤 Creating user: ${user.email} (${user.role})...`)
      
      try {
        // Create user via Admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true // Auto-confirm email for development
        })

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`   ⚠️  User ${user.email} already exists, assigning role...`)
            
            // Get existing user
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = existingUsers.users.find(u => u.email === user.email)
            
            if (existingUser) {
              await assignRole(existingUser.id, roleMap[user.role], user.role)
            }
          } else {
            console.error(`   ❌ Error creating user ${user.email}:`, authError.message)
            continue
          }
        } else {
          console.log(`   ✅ User created: ${authData.user.id}`)
          await assignRole(authData.user.id, roleMap[user.role], user.role)
        }

      } catch (error) {
        console.error(`   ❌ Error with user ${user.email}:`, error.message)
      }
    }

    console.log('\n🎉 Test user setup complete!')
    console.log('\n📝 You can now log in with these credentials:')
    testUsers.forEach(user => {
      console.log(`   ${user.role.toUpperCase()}: ${user.email} / ${user.password}`)
    })

    console.log('\n🔗 Dashboard URLs:')
    console.log(`   Admin: http://localhost:3000/dashboard/admin/overview`)
    console.log(`   Manager: http://localhost:3000/dashboard/manager/overview`)  
    console.log(`   Manager Leads: http://localhost:3000/dashboard/(manager)/leads`)
    console.log(`   Guard: http://localhost:3000/dashboard/guard/overview`)

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

async function assignRole(userId, roleId, roleName) {
  try {
    // Check if role assignment already exists
    const { data: existing } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .eq('status', 'active')
      .single()

    if (existing) {
      console.log(`   ✅ Role ${roleName} already assigned`)
      return
    }

    // Create role assignment
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert([{
        user_id: userId,
        role_id: roleId,
        assigned_by: userId, // Self-assigned for test users
        assigned_at: new Date().toISOString(),
        status: 'active',
        reason: 'Development test user setup'
      }])

    if (roleError) {
      console.error(`   ❌ Error assigning ${roleName} role:`, roleError.message)
    } else {
      console.log(`   ✅ Role ${roleName} assigned successfully`)
    }

  } catch (error) {
    console.error(`   ❌ Error in role assignment:`, error.message)
  }
}

// Run the setup
setupTestUsers().catch(console.error)