import { useQuery, useMutation } from '@apollo/client/react';
import { GET_EVENTS, CREATE_CHECKOUT_SESSION, DELETE_EVENT, UPDATE_EVENT } from '../graphql/queries';
import toast from 'react-hot-toast';

export const useEvents = () => {
  const { data, loading, error, refetch } = useQuery(GET_EVENTS, { 
    variables: { limit: 50, offset: 0 },
    fetchPolicy: 'cache-and-network' 
  });
  
  const [createSession] = useMutation(CREATE_CHECKOUT_SESSION);
  const [deleteEvent] = useMutation(DELETE_EVENT, { 
     refetchQueries: [{ query: GET_EVENTS, variables: { limit: 50, offset: 0 } }] 
  });

  const handleBook = async (eventId, ticketType, quantity) => {
    try {
      toast.loading('Redirecting to Secure Checkout...', { id: 'checkout' });
      
      const sessionRes = await createSession({ 
        variables: { eventId, ticketType, quantity: parseInt(quantity) }
      });
      const checkoutUrl = sessionRes.data.createCheckoutSession;
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (e) {
      toast.error(e.message || 'Failed to initialize checkout', { id: 'checkout' });
    }
  };

  const handleDelete = async (eventId) => {
    try {
      await deleteEvent({ variables: { id: eventId } });
      toast.success('Event deleted successfully!');
    } catch (e) {
      toast.error(e.message || 'Failed to delete event');
    }
  };

  const [updateEvent] = useMutation(UPDATE_EVENT, {
     refetchQueries: [{ query: GET_EVENTS, variables: { limit: 50, offset: 0 } }] 
  });

  const handleUpdate = async (eventId, input) => {
    try {
      await updateEvent({ variables: { id: eventId, input } });
      toast.success('Event updated successfully!');
    } catch (e) {
      toast.error(e.message || 'Failed to update event');
    }
  };

  return { events: data?.events || [], loading, error, refetch, handleBook, handleDelete, handleUpdate };
};
