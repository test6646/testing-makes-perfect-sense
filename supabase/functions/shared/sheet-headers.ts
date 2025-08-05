// ============================================
// CENTRALIZED SHEET HEADER CONFIGURATIONS
// This file defines the EXACT header order for ALL sheets
// ============================================

export const SHEET_HEADERS = {
  // Master Events sheet headers (WITH EVENT ID AS PRIMARY)
  MASTER_EVENTS: [
    'Event ID',            // 0 - PRIMARY IDENTIFIER FOR MATCHING
    'Client',              // 1 - Client name
    'Type',                // 2 - Event type  
    'Date',                // 3 - Event date
    'Venue',               // 4 - Venue/Location
    'Storage Disk',        // 5
    'Storage Size',        // 6
    'Photographers',       // 7 - Comma separated
    'Cinematographers',    // 8 - Comma separated
    'Drone Pilot',         // 9 - Comma separated
    'Same Day Editor',     // 10 - Comma separated
    'Booking Date',        // 11 - When event was booked
    'Advance',             // 12 - Advance amount
    'Balance',             // 13 - Balance amount
    'Total',               // 14 - Total amount
    'Status',              // 15 - Payment status
    'Photos Edited',       // 16 - Yes/No
    'Videos Edited',       // 17 - Yes/No
    'Remarks'              // 18 - Notes/remarks
  ],

  // Clients sheet headers (WITH CLIENT ID)
  CLIENTS: [
    'Client ID',           // 0 - FOR MATCHING/COMPARING  
    'Client',              // 1 - REFINED
    'Phone',               // 2 - REFINED
    'Email',               // 3 - REFINED
    'Address',             // 4 - REFINED
    'Remarks'              // 5 - REFINED
  ],

  // Tasks sheet headers (WITH TASK ID)
  TASKS: [
    'Task ID',             // 0 - FOR MATCHING/COMPARING
    'Title',               // 1 - REFINED
    'Assigned To',         // 2 - NECESSARY TWO-WORD
    'Client',              // 3 - REFINED
    'Event',               // 4 - REFINED
    'Date',                // 5 - REFINED
    'Type',                // 6 - REFINED
    'Description',         // 7 - REFINED
    'Due Date',            // 8 - NECESSARY TWO-WORD
    'Status',              // 9 - REFINED
    'Priority',            // 10 - REFINED
    'Updated',             // 11 - REFINED
    'Remarks'              // 12 - REFINED
  ],

  // Staff sheet headers (WITH STAFF ID)
  STAFF: [
    'Staff ID',            // 0 - FOR MATCHING/COMPARING
    'Name',                // 1 - REFINED
    'Role',                // 2 - REFINED
    'Mobile',              // 3 - REFINED
    'Joined',              // 4 - REFINED
    'Remarks'              // 5 - REFINED
  ],

  // Expenses sheet headers (WITH EXPENSE ID)
  EXPENSES: [
    'Expense ID',          // 0 - FOR MATCHING/COMPARING
    'Date',                // 1 - REFINED
    'Category',            // 2 - REFINED
    'Vendor',              // 3 - REFINED
    'Description',         // 4 - REFINED
    'Amount',              // 5 - REFINED
    'Payment',             // 6 - REFINED
    'Event',               // 7 - REFINED
    'Receipt',             // 8 - REFINED
    'Remarks'              // 9 - REFINED
  ],

  // Freelancers sheet headers (WITH FREELANCER ID)
  FREELANCERS: [
    'Freelancer ID',       // 0 - FOR MATCHING/COMPARING
    'Name',                // 1 - REFINED
    'Role',                // 2 - REFINED
    'Phone',               // 3 - REFINED
    'Email',               // 4 - REFINED
    'Rate',                // 5 - REFINED
    'Contact',             // 6 - REFINED
    'Notes'                // 7 - REFINED
  ]
};

// Event type specific sheets (same as master events) - using exact EventType values
export const EVENT_TYPE_SHEETS = [
  'Ring-Ceremony',
  'Pre-Wedding', 
  'Wedding',
  'Maternity Photography',
  'Others'
];

// No mapping needed - sheet names now match EventType values exactly

// All sheets that should be created
export const ALL_SHEETS = [
  {
    name: 'Master Events',
    headers: SHEET_HEADERS.MASTER_EVENTS
  },
  {
    name: 'Clients', 
    headers: SHEET_HEADERS.CLIENTS
  },
  {
    name: 'Tasks',
    headers: SHEET_HEADERS.TASKS
  },
  {
    name: 'Staff',
    headers: SHEET_HEADERS.STAFF
  },
  {
    name: 'Expenses',
    headers: SHEET_HEADERS.EXPENSES
  },
  {
    name: 'Freelancers',
    headers: SHEET_HEADERS.FREELANCERS
  },
  // Event type specific sheets
  ...EVENT_TYPE_SHEETS.map(sheetName => ({
    name: sheetName,
    headers: SHEET_HEADERS.MASTER_EVENTS // Same headers as master events
  }))
];