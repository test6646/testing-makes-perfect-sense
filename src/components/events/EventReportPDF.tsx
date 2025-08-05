
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { Event } from '@/types/studio';
import { sharedStyles, SharedPDFHeader, SharedPDFFooter } from '@/components/pdf/SharedPDFLayout';
import { formatDate } from '@/lib/date-utils';

interface EventReportPDFProps {
  events: Event[];
  filterType?: string;
  filterValue?: string;
}

const EventReportPDF = ({ events, filterType, filterValue }: EventReportPDFProps) => {
  const getFilterDescription = () => {
    if (filterType === 'status' && filterValue) {
      const statusLabels: Record<string, string> = {
        'confirmed': 'Confirmed Events',
        'completed': 'Completed Events', 
        'pending': 'Work Pending Events',
        'crew_incomplete': 'Staff Incomplete Events',
        'paid': 'Paid Events',
        'payment_pending': 'Payment Due Events'
      };
      return statusLabels[filterValue] || 'All Events';
    }
    return 'All Events';
  };

  const calculateEventBalance = (event: Event) => {
    const totalPaid = (event as any).payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    return Math.max(0, (event.total_amount || 0) - totalPaid);
  };

  const totalEvents = events.length;
  const totalAmount = events.reduce((sum, event) => sum + (event.total_amount || 0), 0);
  const totalBalance = events.reduce((sum, event) => sum + calculateEventBalance(event), 0);
  const totalPaid = totalAmount - totalBalance;
  const currentDate = formatDate(new Date());

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader />
        <Text style={sharedStyles.title}>Event Report</Text>

        {/* Report Info */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDescription()}</Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Events:</Text>
              <Text style={sharedStyles.detailValue}>{totalEvents}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>₹{totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Event Summary */}
        <View style={{ marginBottom: 10 }}>
          <Text style={sharedStyles.sectionTitle}>Event Summary</Text>
          <View style={sharedStyles.detailsContainer}>
            <View style={sharedStyles.column}>
              <View style={sharedStyles.detailRow}>
                <Text style={sharedStyles.detailLabel}>Total Events:</Text>
                <Text style={sharedStyles.detailValue}>{totalEvents}</Text>
              </View>
            </View>
            <View style={sharedStyles.column}>
              <View style={sharedStyles.detailRow}>
                <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
                <Text style={sharedStyles.detailValue}>₹{totalAmount.toLocaleString()}</Text>
              </View>
            </View>
            <View style={sharedStyles.column}>
              <View style={sharedStyles.detailRow}>
                <Text style={sharedStyles.detailLabel}>Amount Paid:</Text>
                <Text style={sharedStyles.detailValue}>₹{totalPaid.toLocaleString()}</Text>
              </View>
            </View>
            <View style={sharedStyles.column}>
              <View style={sharedStyles.detailRow}>
                <Text style={sharedStyles.detailLabel}>Pending Balance:</Text>
                <Text style={sharedStyles.detailValue}>₹{totalBalance.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Event Details Table */}
        <View style={{ marginBottom: 20 }}>
          <Text style={sharedStyles.sectionTitle}>Event Details</Text>
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeader}>
              <Text style={[sharedStyles.tableCellHeader, { width: '25%' }]}>Event</Text>
              <Text style={[sharedStyles.tableCellHeader, { width: '12%' }]}>Date</Text>
              <Text style={[sharedStyles.tableCellHeader, { width: '18%' }]}>Client</Text>
              <Text style={[sharedStyles.tableCellHeader, { width: '15%' }]}>Amount</Text>
              <Text style={[sharedStyles.tableCellHeader, { width: '15%' }]}>Paid</Text>
              <Text style={[sharedStyles.tableCellHeader, { width: '15%' }]}>Balance</Text>
            </View>
            
            {events.slice(0, 30).map((event, index) => {
              const balance = calculateEventBalance(event);
              const paid = (event.total_amount || 0) - balance;
              
              return (
                <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
                  <Text style={[sharedStyles.tableCell, { width: '25%' }]}>{event.title}</Text>
                  <Text style={[sharedStyles.tableCell, { width: '12%' }]}>{formatDate(new Date(event.event_date))}</Text>
                  <Text style={[sharedStyles.tableCell, { width: '18%' }]}>{event.client?.name || 'N/A'}</Text>
                  <Text style={[sharedStyles.tableCellAmount, { width: '15%' }]}>₹{(event.total_amount || 0).toLocaleString()}</Text>
                  <Text style={[sharedStyles.tableCellAmount, { width: '15%' }]}>₹{paid.toLocaleString()}</Text>
                  <Text style={[sharedStyles.tableCellAmount, { width: '15%' }]}>₹{balance.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <SharedPDFFooter />
      </Page>

      {/* Summary Page if there are many events */}
      {events.length > 30 && (
        <Page size="A4" style={sharedStyles.page}>
          <SharedPDFHeader />
          <Text style={sharedStyles.title}>EVENT SUMMARY</Text>

          <View style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: '#f8f6f1',
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#c4b28d',
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#c4b28d',
              marginBottom: 12,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>Financial Summary</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>Total Events:</Text>
              <Text style={{ fontSize: 9, color: '#111827', fontWeight: 600 }}>{totalEvents}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>Total Business Volume:</Text>
              <Text style={{ fontSize: 9, color: '#111827', fontWeight: 600 }}>₹{totalAmount.toLocaleString()}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>Amount Received:</Text>
              <Text style={{ fontSize: 9, color: '#c4b28d', fontWeight: 600 }}>₹{totalPaid.toLocaleString()}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: '#6B7280', fontWeight: 500 }}>Outstanding Balance:</Text>
              <Text style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>₹{totalBalance.toLocaleString()}</Text>
            </View>
          </View>

          <SharedPDFFooter />
        </Page>
      )}
    </Document>
  );
};

export const generateEventReportPDF = async (
  events: Event[],
  filterType?: string,
  filterValue?: string
) => {
  try {
    const { saveAs } = await import('file-saver');
    const blob = await pdf(<EventReportPDF events={events} filterType={filterType} filterValue={filterValue} />).toBlob();
    
    const filterDesc = filterType === 'status' && filterValue ? 
      filterValue.replace(/_/g, '-') : 'all';
    const fileName = `event-report-${filterDesc}-${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
    
    saveAs(blob, fileName);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating event report PDF:', error);
    return { success: false, error };
  }
};
