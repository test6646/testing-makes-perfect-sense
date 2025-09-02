import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface PricingConfig {
  id: string;
  firm_id: string;
  event_type: string;
  service_type: string;
  camera_count: number | null;
  price: number;
  unit: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const usePricingConfig = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['pricing-config', profile?.firm_id],
    queryFn: async () => {
      if (!profile?.firm_id) {
        throw new Error('No firm ID available');
      }

      try {
        const { data, error } = await supabase
          .from('pricing_config' as any)
          .select('*')
          .eq('firm_id', profile.firm_id)
          .order('event_type')
          .order('service_type');

        if (error) {
          console.error('Error fetching pricing config:', error);
          throw error;
        }

        return (data || []) as any[] as PricingConfig[];
      } catch (error) {
        console.error('Pricing config query failed:', error);
        return [] as PricingConfig[];
      }
    },
    enabled: !!profile?.firm_id,
  });
};

export const usePricingForProject = (eventType: string, cameraCount: number) => {
  const { data: pricingConfig = [] } = usePricingConfig();
  
  // Filter pricing based on event type - only show services for the selected event type
  const getFilteredPricing = () => {
    return pricingConfig.filter(config => config.event_type === eventType);
  };
  
  // Get automatic pricing based on event type and camera count
  const getAutomaticPricing = () => {
    const applicablePricing = getFilteredPricing();
    const items = [];

    // Camera hourly rates ONLY for Wedding events
    if (eventType === 'Wedding') {
      if (cameraCount === 1) {
        const config = applicablePricing.find(p => p.service_type === 'Camera 1 Hour');
        if (config) {
          items.push({
            description: config.description || '1 Cam / Hour',
            pricing_type: 'hourly' as const,
            hours: 4, // Default 4 hours
            rate: config.price,
            amount: config.price * 4
          });
        }
      } else if (cameraCount === 2) {
        const config = applicablePricing.find(p => p.service_type === 'Camera 2 Hour');
        if (config) {
          items.push({
            description: config.description || '2 Cam / Hour',
            pricing_type: 'hourly' as const,
            hours: 4, // Default 4 hours
            rate: config.price,
            amount: config.price * 4
          });
        }
      } else if (cameraCount > 2) {
        // 2 cam base + additional cams
        const baseCamConfig = applicablePricing.find(p => p.service_type === 'Camera 2 Hour');
        const additionalCamConfig = applicablePricing.find(p => p.service_type === 'Camera Additional Hour');
        
        if (baseCamConfig) {
          items.push({
            description: '2 Cam / Hour (Base)',
            pricing_type: 'hourly' as const,
            hours: 4,
            rate: baseCamConfig.price,
            amount: baseCamConfig.price * 4
          });
        }
        
        if (additionalCamConfig) {
          const additionalCams = cameraCount - 2;
          items.push({
            description: `Additional ${additionalCams} Cam(s) / Hour`,
            pricing_type: 'hourly' as const,
            hours: 4,
            rate: additionalCamConfig.price * additionalCams,
            amount: additionalCamConfig.price * additionalCams * 4
          });
        }
      }

      // Add camera-specific highlight for weddings
      const highlightConfig = cameraCount === 1 
        ? applicablePricing.find(p => p.service_type === 'Highlight 1 Cam')
        : cameraCount === 2 
        ? applicablePricing.find(p => p.service_type === 'Highlight 2 Cam')
        : applicablePricing.find(p => p.service_type === 'Highlight 2+ Cam');
      
      if (highlightConfig) {
        items.push({
          description: highlightConfig.description || 'Highlight',
          pricing_type: 'fixed' as const,
          hours: 1,
          rate: highlightConfig.price,
          amount: highlightConfig.price
        });
      }

      // Add other wedding services
      const otherServices = ['Reel', 'Full Film', 'Song', 'Same Day Highlight'];
      otherServices.forEach(service => {
        const config = applicablePricing.find(p => p.service_type === service);
        if (config) {
          items.push({
            description: config.description || service,
            pricing_type: 'fixed' as const,
            hours: 1,
            rate: config.price,
            amount: config.price
          });
        }
      });
    }

    return items;
  };

  return {
    pricingConfig: getFilteredPricing(),
    getAutomaticPricing
  };
};