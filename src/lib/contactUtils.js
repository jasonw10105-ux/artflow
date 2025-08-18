// src/lib/contactUtils.js
import { supabase } from './supabase.js'

// Parse CSV file into array of contacts
export async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      const lines = text.split(/\r?\n/).filter(Boolean)
      const contacts = lines.map(line => {
        const [name, email] = line.split(',').map(s => s.trim())
        return { name, email }
      }).filter(c => c.email) // remove invalid entries
      resolve(contacts)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// Deduplicate new contacts against existing ones by email
export function deduplicateContacts(existingContacts, newContacts) {
  const emails = new Set(existingContacts.map(c => c.email.toLowerCase()))
  return newContacts.filter(c => !emails.has(c.email.toLowerCase()))
}

// Sync contacts with Supabase and link existing users
export async function syncContactsWithSupabase(artistId, contacts) {
  const insertedContacts = []

  for (let contact of contacts) {
    // Check if contact already exists in Supabase
    const { data: existing, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('artist_id', artistId)
      .eq('email', contact.email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // ignore not found
      console.error('Error checking contact:', fetchError)
      continue
    }

    if (existing) {
      insertedContacts.push(existing)
      continue
    }

    // Insert new contact
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ artist_id: artistId, ...contact }])
      .select()
      .single()

    if (error) {
      console.error('Error inserting contact:', error)
      continue
    }

    insertedContacts.push(data)
  }

  return insertedContacts
}
