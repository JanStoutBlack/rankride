/**
 * useNotifications — role-aware realtime alerts (in-app toasts, not OS push).
 *
 * Drivers  : toast when a new trip is inserted for their vehicle.
 * Customers: toast when one of their trips changes status.
 * Owners   : toast when a maintenance issue is reported.
 *
 * Realtime contract: the channel is created inside the effect, every `.on()`
 * handler is attached before `.subscribe()`, and the channel is removed on
 * cleanup. Calling `.on()` after `subscribe()` throws at runtime.
 */
import { useEffect } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { Bell, Car, CheckCircle, XCircle, Play, MapPin } from 'lucide-react';

export function useNotifications() {
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user || !role) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupNotifications = async () => {
      if (role === 'driver') {
        // Get driver's vehicle
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('driver_id', user.id)
          .single();

        if (vehicle) {
          // Subscribe to new trip assignments for this vehicle
          channel = supabase
            .channel('driver-notifications')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'trips',
                filter: `vehicle_id=eq.${vehicle.id}`,
              },
              async (payload) => {
                console.log('New trip assigned:', payload);
                
                // Get customer details
                const { data: trip } = await supabase
                  .from('trips')
                  .select('destination, fare, profiles:customer_id(full_name)')
                  .eq('id', payload.new.id)
                  .single();

                toast({
                  title: '🚗 New Trip Assigned!',
                  description: `${(trip?.profiles as any)?.full_name || 'Customer'} → ${trip?.destination || 'Unknown'} • R${trip?.fare?.toFixed(2) || '0.00'}`,
                  duration: 8000,
                });

                // Play notification sound
                playNotificationSound();
              }
            )
            .subscribe();
        }
      } else if (role === 'rider' || role === 'customer') {
        // Subscribe to trip status updates for this customer
        channel = supabase
          .channel('customer-notifications')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'trips',
              filter: `customer_id=eq.${user.id}`,
            },
            async (payload) => {
              console.log('Trip status updated:', payload);
              const status = payload.new.status;
              const oldStatus = payload.old?.status;

              // Only notify on actual status changes
              if (status === oldStatus) return;

              const statusMessages: Record<string, { title: string; icon: string }> = {
                assigned: { title: '🚕 Driver Assigned!', icon: '🚕' },
                in_progress: { title: '🚗 Trip Started!', icon: '🚗' },
                completed: { title: '✅ Trip Completed!', icon: '✅' },
                cancelled: { title: '❌ Trip Cancelled', icon: '❌' },
              };

              const message = statusMessages[status];
              if (message) {
                toast({
                  title: message.title,
                  description: `Your trip to ${payload.new.destination || 'destination'} is now ${status.replace('_', ' ')}`,
                  duration: 6000,
                });

                playNotificationSound();
              }
            }
          )
          .subscribe();
      } else if (role === 'admin' || role === 'superadmin' || role === 'owner') {
        // Subscribe to new maintenance issues
        channel = supabase
          .channel('owner-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'maintenance_logs',
            },
            async (payload) => {
              console.log('New maintenance issue:', payload);

              const { data: log } = await supabase
                .from('maintenance_logs')
                .select('description, vehicles:vehicle_id(plate)')
                .eq('id', payload.new.id)
                .single();

              toast({
                title: '🔧 Maintenance Issue Reported',
                description: `${(log?.vehicles as any)?.plate || 'Vehicle'}: ${log?.description || 'New issue'}`,
                duration: 8000,
              });

              playNotificationSound();
            }
          )
          .subscribe();
      }
    };

    setupNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, role]);
}

function playNotificationSound() {
  try {
    // Create a simple notification beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Audio notification not supported');
  }
}
