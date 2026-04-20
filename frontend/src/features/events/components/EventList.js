import React from 'react';
import { useEvents } from '../hooks/useEvents';
import EventCard from './EventCard';

export const EventList = () => {
  const { events, loading, error, handleBook, handleDelete, handleUpdate } = useEvents();

  if (loading) return <div className="loader" style={{textAlign: 'center', marginTop: '50px'}}>Loading events...</div>;
  if (error) return <div className="error" style={{color: 'red', textAlign:'center', marginTop: '50px'}}>Error loading events. Is the backend running?</div>;
  if (!events.length) return <p className="empty-state" style={{textAlign: 'center', marginTop: '50px', color: '#666'}}>No upcoming events found. Be the first to create one!</p>;

  return (
    <div className="event-grid">
      {events.map((e) => (
        <EventCard key={e.id} event={e} onBook={(ticketType, quantity) => handleBook(e.id, ticketType, quantity)} onDelete={() => handleDelete(e.id)} onUpdate={(input) => handleUpdate(e.id, input)} />
      ))}
    </div>
  );
};
