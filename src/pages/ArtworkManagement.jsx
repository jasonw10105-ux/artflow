// src/pages/ArtworkManagement.jsx
import React, { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"

const ArtworkManagement = () => {
  const [artworks, setArtworks] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Load artworks from Supabase
  useEffect(() => {
    const fetchArtworks = async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: true })

      if (error) {
        console.error(error)
        toast.error("Failed to load artworks")
      } else {
        setArtworks(data || [])
      }
    }
    fetchArtworks()
  }, [])

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    const beforeUnloadHandler = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", beforeUnloadHandler)
    return () => window.removeEventListener("beforeunload", beforeUnloadHandler)
  }, [isDirty])

  const handleChange = (field, value) => {
    const updated = [...artworks]
    updated[activeIndex][field] = value
    setArtworks(updated)
    setIsDirty(true)
  }

  const validateArtwork = (artwork) => {
    return artwork.title && artwork.description && artwork.price
  }

  const handleSave = async () => {
    setLoading(true)
    const artwork = artworks[activeIndex]

    const { error } = await supabase
      .from("works")
      .update({
        title: artwork.title,
        description: artwork.description,
        price: artwork.price,
      })
      .eq("id", artwork.id)

    setLoading(false)

    if (error) {
      console.error(error)
      toast.error("Failed to save artwork")
    } else {
      toast.success("Artwork saved")
      setIsDirty(false)
    }
  }

  const handleFinish = async () => {
    // Only allow finishing if all artworks are validated
    const allValid = artworks.every(validateArtwork)
    if (!allValid) {
      toast.error("Please complete all artworks before finishing")
      return
    }

    setLoading(true)
    try {
      for (const artwork of artworks) {
        await supabase
          .from("works")
          .update({
            title: artwork.title,
            description: artwork.description,
            price: artwork.price,
          })
          .eq("id", artwork.id)
      }
      toast.success("All artworks saved successfully")
      setIsDirty(false)
      // Navigate back to artwork grid
      window.location.href = "/artworks"
    } catch (err) {
      console.error(err)
      toast.error("Failed to finish saving artworks")
    } finally {
      setLoading(false)
    }
  }

  const activeArtwork = artworks[activeIndex] || {}

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 p-4">
        <h2 className="mb-4 font-semibold">Your Artworks</h2>
        <ul className="space-y-2">
          {artworks.map((artwork, idx) => (
            <li
              key={artwork.id}
              className={`cursor-pointer rounded px-2 py-1 ${
                idx === activeIndex ? "bg-gray-200" : "hover:bg-gray-100"
              }`}
              onClick={() => setActiveIndex(idx)}
            >
              {artwork.title || `Untitled ${idx + 1}`}{" "}
              {validateArtwork(artwork) ? (
                <span className="text-green-600">✅</span>
              ) : (
                <span className="text-red-500">⚠️</span>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor */}
      <main className="flex-1 p-6">
        {artworks.length === 0 ? (
          <p>No artworks uploaded yet.</p>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={activeArtwork.title || ""}
              onChange={(e) => handleChange("title", e.target.value)}
            />
            <Textarea
              placeholder="Description"
              value={activeArtwork.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
            />
            <Input
              type="number"
              placeholder="Price"
              value={activeArtwork.price || ""}
              onChange={(e) => handleChange("price", e.target.value)}
            />

            <div className="flex space-x-2">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>

              {activeIndex === artworks.length - 1 &&
                artworks.every(validateArtwork) && (
                  <Button
                    variant="secondary"
                    onClick={handleFinish}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save and Finish"
                    )}
                  </Button>
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ArtworkManagement
