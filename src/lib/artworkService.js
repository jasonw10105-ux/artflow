// lib/artworkService.js
import { supabase } from './supabase.js' 

export async function fetchArtworksByArtist(artistId) {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function insertArtwork(artworkData) {
  const { error } = await supabase.from('artworks').insert([artworkData])
  if (error) throw error
}

export async function deleteArtwork(id) {
  const { error } = await supabase.from('artworks').delete().eq('id', id)
  if (error) throw error
}
