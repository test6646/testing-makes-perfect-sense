import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Expense } from '@/types/studio';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

interface ExpenseReportProps {
  expenses: Expense[];
  filterType: string;
  filterValue: string;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const ExpenseReportDocument: React.FC<ExpenseReportProps> = ({ expenses, filterType, filterValue, firmData }) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const currentDate = formatDate(new Date());
  
  const expenseStats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    avgAmount: expenses.length > 0 ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length : 0,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'global') return 'All Expenses';
    if (filterType === 'category') return `Category: ${filterValue}`;
    if (filterType === 'staff') return `Staff: ${filterValue}`;
    return filterValue;
  };

  const tableData = expenses.map(expense => [
    formatDate(new Date(expense.expense_date)),
    expense.description,
    expense.category,
    formatCurrency(expense.amount),
    (expense as any).payment_method || 'Cash',
    (expense as any).event?.title || 'General'
  ]);

  // Split expenses into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const expenseChunks = [];
  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    expenseChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasExpenses = expenses.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Expense Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Expenses:</Text>
              <Text style={sharedStyles.detailValue}>{expenseStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
        </View>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(expenseStats.totalAmount)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Average Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(expenseStats.avgAmount)}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Expense Tables - 15 rows per page */}
      {expenseChunks.map((chunk, chunkIndex) => (
        <Page key={`expense-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Expense Details {expenseChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${expenseChunks.length})` : ''}
          </Text>

          <SimpleTable
            headers={['Date', 'Description', 'Category', 'Amount', 'Payment', 'Event']}
            rows={chunk}
          />

          {/* Add footer to the last content page */}
          {chunkIndex === expenseChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}

      {/* If no expenses, add footer to first page */}
      {!hasExpenses && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateExpenseReportPDF = async (expenses: Expense[], filterType: string, filterValue: string, firmData?: any) => {
  // Always fetch ALL expenses with complete relations for comprehensive PDF reporting
  let allExpenses = expenses;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const userFirmKey = `selectedFirmId_${user.id}`;
      let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
      
      if (!firmId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_firm_id, firm_id')
          .eq('user_id', user.id)
          .single();
        firmId = profile?.current_firm_id || profile?.firm_id;
      }
      
      if (firmId) {
        // Fetch ALL expenses for this firm with relations (no limit)
        const { data, error } = await supabase
          .from('expenses')
          .select(`
            *,
            event:events(id, title, event_date)
          `)
          .eq('firm_id', firmId)
          .order('expense_date', { ascending: false });
        
        if (!error && data) {
          allExpenses = data as any[];
          console.log(`PDF Export: Fetched ${allExpenses.length} total expenses for comprehensive report`);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching all expenses for PDF:', error);
    // Use provided data as fallback
  }

  // Use provided firmData or fetch it if not provided
  if (!firmData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
          
        if (firmId) {
          const { data: firm, error } = await supabase
            .from('firms')
            .select('name, description, logo_url, header_left_content, footer_content')
            .eq('id', firmId)
            .single();
          
          if (!error) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      
    }
  }

  const blob = await pdf(<ExpenseReportDocument expenses={allExpenses} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Expense Report (${allExpenses.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateExpenseReportPDF;