/**
 * Centralized business configuration
 * This file contains default business information that can be overridden by firm settings
 */

export const BUSINESS_DEFAULTS = {
  FIRM_NAME: 'PRIT PHOTO',
  CONTACT_PHONE: '+91 72850 72603',
  CONTACT_EMAIL: 'pritphoto1985@gmail.com',
  TAGLINE: '#aJourneyOfLoveByPritPhoto',
  SIGNATURE: 'Your memories, our passion'
} as const;

// Helper functions for templates
export const getContactInfo = (phone?: string, email?: string) => 
  `Contact: ${phone || BUSINESS_DEFAULTS.CONTACT_PHONE}\nEmail: ${email || BUSINESS_DEFAULTS.CONTACT_EMAIL}`;
  
export const getFooterContent = (firmName?: string, phone?: string, email?: string, tagline?: string, signature?: string) =>
  `${firmName || BUSINESS_DEFAULTS.FIRM_NAME} | Contact: ${phone || BUSINESS_DEFAULTS.CONTACT_PHONE} | Email: ${email || BUSINESS_DEFAULTS.CONTACT_EMAIL}\n${tagline || BUSINESS_DEFAULTS.TAGLINE} | ${signature || BUSINESS_DEFAULTS.SIGNATURE}`;