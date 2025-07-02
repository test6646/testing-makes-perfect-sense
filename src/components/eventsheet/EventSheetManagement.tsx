import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, Search, Download, Filter, ExternalLink, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Event } from '@/types/studio';

const EventSheetManagement = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('event_date');
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const columns = [
    'Sr.',
    'Client Name',
    'Event Title',
    'Event Type',
    'Event Date',
    'Venue',
    'Total Amount',
    'Advance',
    'Balance',
    'Status',
    'Photographer',
    'Videographer',
    'Created Date'
  ];

  useEffect(() => {
    if (profile) {
      loadEvents();
    }
  }, [profile]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name),
          photographer:profiles!events_photographer_id_fkey(full_name),
          videographer:profiles!events_videographer_id_fkey(full_name)
        `)
        .eq('firm_id', profile?.firm_id)
        .order(sortBy, { ascending: sortBy === 'client_name' });

      if (error) throw error;
      setEvents(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncToGoogleSheets = async () => {
    if (!profile?.firm?.spreadsheet_id) {
      toast({
        title: "No Google Spreadsheet",
        description: "This firm doesn't have a Google Spreadsheet configured",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncing(true);
      
      // Prepare data for Google Sheets
      const sheetData = events.map((event, index) => [
        index + 1, // Sr.
        event.client?.name || '',
        event.title,
        event.event_type,
        new Date(event.event_date).toLocaleDateString(),
        event.venue || '',
        event.total_amount || 0,
        event.advance_amount || 0,
        event.balance_amount || 0,
        event.status,
        event.photographer?.full_name || '',
        event.videographer?.full_name || '',
        new Date(event.created_at).toLocaleDateString()
      ]);

      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: {
          action: 'sync',
          data: {
            spreadsheetId: profile.firm.spreadsheet_id,
            sheetName: 'Events',
            values: sheetData
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Sync successful!",
        description: "Events have been synced to Google Sheets",
      });
    } catch (error: any) {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const openGoogleSheet = () => {
    if (profile?.firm?.spreadsheet_id) {
      window.open(`https://docs.google.com/spreadsheets/d/${profile.firm.spreadsheet_id}`, '_blank');
    } else {
      toast({
        title: "No Google Spreadsheet",
        description: "This firm doesn't have a Google Spreadsheet configured",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      columns.join(','),
      ...events.map((event, index) => [
        index + 1,
        `"${event.client?.name || ''}"`,
        `"${event.title}"`,
        event.event_type,
        new Date(event.event_date).toLocaleDateString(),
        `"${event.venue || ''}"`,
        event.total_amount || 0,
        event.advance_amount || 0,
        event.balance_amount || 0,
        event.status,
        `"${event.photographer?.full_name || ''}"`,
        `"${event.videographer?.full_name || ''}"`,
        new Date(event.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful!",
      description: "Events data has been exported to CSV",
    });
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.venue?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Sheet</h1>
          <p className="text-muted-foreground">Manage your events in spreadsheet format</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={openGoogleSheet}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Sheets
          </Button>
          <Button 
            variant="outline" 
            onClick={syncToGoogleSheets} 
            disabled={syncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync to Sheets'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events by title, client, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Status */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Quotation">Quotation</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Shooting">Shooting</SelectItem>
                  <SelectItem value="Editing">Editing</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event_date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="total_amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <CardTitle>Events Overview</CardTitle>
            <Badge variant="secondary">{filteredEvents.length} Records</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {events.length === 0 ? 'No events to display' : 'No matching events found'}
              </h3>
              <p className="text-muted-foreground">
                {events.length === 0 
                  ? 'Create your first event to see it in the sheet view'
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column} className="whitespace-nowrap text-xs">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event, index) => (
                    <TableRow key={event.id} className="text-xs">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {event.client?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {event.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(event.event_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {event.venue || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(event.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(event.advance_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(event.balance_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={event.status === 'Delivered' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.photographer?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {event.videographer?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(event.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Information */}
      {profile?.firm?.spreadsheet_id && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Google Sheets Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Your events are automatically synced with Google Sheets</p>
              <p>• Use the "Sync to Sheets" button to manually update the spreadsheet</p>
              <p>• Export to CSV for offline analysis or backup</p>
              <p>• Access your live spreadsheet anytime with "Open in Sheets"</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventSheetManagement;