import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const ContactsManagement = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("artist_contacts")
      .select("id, contact:contacts(id, email, name)")
      .order("created_at", { ascending: false });

    if (!error) {
      setContacts(data);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Contacts</h1>

      {loading ? (
        <p>Loading contacts...</p>
      ) : (
        <ul>
          {contacts.map((c) => (
            <li key={c.id} className="py-2 border-b">
              {c.contact.name || "Unnamed"} — {c.contact.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContactsManagement;
